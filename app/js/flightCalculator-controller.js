'use strict';

angular.module('myApp.controllers')
  .controller('FlightCalculatorCtrl', ['$scope', '$http', '$timeout', 'smoothScroll',
  function($scope, $http, $timeout, smoothScroll) {

    // the naming convention of each form-group is the same as the key for INPUT and OUTPUT ID
    // in BASIC_DOM module

    var FLASH_DELAY = 800;
    var convert = BASIC_DOM.convert;
    var output = {
        footprint: {width: 0, height: 0},
        gsd: 0,
        agl: 0,
        distance: {betweenCapture: 0, betweenTrack: 0},
        numOf: {tracks: 0, capturesPerTrack:0, totalCaptures: 0},
        time: {betweenCapture: 0, turnTime: 0, totalFlight: 0},
        areaPerSecond: 0,
        storageSize: 0
      };

      var TOTAL_IMAGER_COUNT = 0;
      var TOTAL_PIXEL_SIZE = 0;

      // Initialize BASIC_DOM module vars
      $http.get("/camera_info").success(function(data) {
        var imager_nums = Object.keys(data);
        var total_pixel_size = 0;
        var imager_type_data = new Object();
        imager_nums.forEach(function(key, index){
          if(!Object.keys(imager_type_data).includes(data[key].type)){
            imager_type_data[data[key].type] = {'count': 1,
                                                'resolution': [data[key].image_width, data[key].image_height],
                                                'focal_length_px': data[key].focal_length_px};
          } else {
            imager_type_data[data[key].type].count += 1;
          }
          total_pixel_size += (data[key].image_width * data[key].image_height) + 10*1024; // little extra to account for metadata
        });

        // remove imager options that the camera doesn't have
        var imagerSelect = document.getElementById("selectImager");
        var imagerSelectOptions = imagerSelect.children;
        var keys = Object.keys(imager_type_data);

        for(var i = imagerSelectOptions.length-1; i >= 0; i--){
          if(!keys.includes(imagerSelectOptions[i].value)){
            imagerSelect.remove(i);
          }
        }
        TOTAL_IMAGER_COUNT = imager_nums.length;
        TOTAL_PIXEL_SIZE = total_pixel_size;
        BASIC_DOM.setImagerTypeData(imager_type_data);
      });


    $scope.expandCalculator = false; // for expanding pre flight estimator panel

    $scope.unit = {
      // input
      agl: 'meter', area: 'acre', flightSpeed: 'meterSec', gsd: 'cm',
      // output
      footprintWidth: 'meter', footprintHeight: 'meter', distanceForward: 'meter',
      distanceParallel: 'meter', areaPerHour: 'acre'
    };

    $scope.value = {
      // input
      forwardOverlap: 75, crossOverlap: 75, orientation: 'landscape', imgQuality: 'TIFF', imagerType: 'bandpass', imagerName: 'multispectral',
      // output
      footprintWidth: 0, footprintHeight: 0, distanceForward: 0, distanceParallel: 0,
      timeCapture: 0, timeTotal: "0 hour 0 minute", numCaptures: 0, numImages: 0, areaPerHour: 0,
      storageSize: 0
    };

    BASIC_DOM.setImagerType($scope.value.imagerType); // initialize

    $scope.error = { timeCapture: false, storageSize: false };

    $scope.flash = { agl: false, gsd: false, output: false };

    // check if localStorage is supported and initialize the form and the inputmode
    if(typeof(Storage) !== "undefined") {
      $scope.inputMode = localStorage.inputMode;
      initForm(localStorage.value, localStorage.unit);
    }

    // Initialize value
    $http.get('/status/').success(function(data) {
            $scope.status = data;
        }).error(function() {
            console.log("ERROR reading status");;
        });

    // inputform onsubmit
    $scope.calculateMission = function() {
      if ($scope.inputform.$invalid) {
        // don't calculate
        return;
      }
      var input = BASIC_DOM.convertInput($scope.inputMode, {'value': $scope.value, 'unit': $scope.unit});
      output = FLIGHT_CALCULATOR.getFlightData(input, {}, $scope, $http, TOTAL_PIXEL_SIZE);
      console.log(output);

      // update all output
      var key;
      for (key in displayFn) {
        displayFn[key](output);
      }

      // smooth scroll to show output
      var scrollPos
      smoothScroll(BASIC_DOM.getDOM("submitForm"), {duration: 700});

      flashForm('output');

      checkError(output);

      // save the data into localstorage
      if(typeof(Storage) !== "undefined") {
        localStorage.value = JSON.stringify($scope.value);
        localStorage.unit = JSON.stringify($scope.unit);
        localStorage.inputMode = $scope.inputMode;
      }
    };

    // update the input mode and the value of implicit output
    $scope.updateImplicitOutput = function(newInputMode, implicitOutput) {
      $scope.inputMode = newInputMode;

      var input = BASIC_DOM.convertInput($scope.inputMode, {'value': $scope.value, 'unit': $scope.unit});
      // This function is meant to only update the implicit output display
      // if the result of the 'getFlightData' is assigned to global var 'output', then the global
      //    var output will be polluted with the wrong data.
      //      i.e. empty input form will give 'output.areaPerSecond' = NaN.
      //    changing the output's unit, then, will update the display with the polluted data
      //      i.e. the display for 'areaPerHour' will show NaN. this is not desired
      //    therefore, we save the result to a new variable.
      // but we update 'output.gsd' or 'output.agl' (depending on which one is implicit output)
      //    this way, updating the implicit output's unit will update the display with the new value
      var out = FLIGHT_CALCULATOR.getFlightData(input, {}, $scope, $http);
      output[implicitOutput] = out[implicitOutput];

      displayFn[implicitOutput](output);
      flashForm(implicitOutput);
    };

    // update the value of 'fieldname' when the unit is changed, for output only
    $scope.unitChange = function(fieldName, implicitOutput) {
      if (fieldName === $scope.inputMode) {
        // then this is not output, update the implicit output instead
        $scope.updateImplicitOutput(fieldName, implicitOutput);
      } else {
        displayFn[fieldName](output);
      }
    };

    $scope.imagerChange = function(fieldName, implicitOutput) {
      BASIC_DOM.setImagerType($scope.value.imagerType);
      $scope.updateImplicitOutput(fieldName, implicitOutput);
    };

    $scope.validImager = function(imager_type) {
      return Object.keys(BASIC_DOM.IMAGER_TYPE_DATA).includes(imager_type);
    }

    /////////////////////////////////////////////////////////////////////////////////////
    // use displayFn that update the model instead of DOM
    var displayFn = {
      // gsd and agl is part of input
      gsd: function(output) {
        $scope.value.gsd = BASIC_DOM.ROUND2(output.gsd * convert.meter.to[$scope.unit.gsd]);
      },
      agl : function(output) {
        $scope.value.agl = BASIC_DOM.ROUND2(output.agl * convert.meter.to[$scope.unit.agl]);
      },
      imagerType : function(output) {
        $scope.value.imagerType = output.imagerType;
        if(output.imagerType == "bandpass"){
          $scope.value.imagerName = "multispectral";
        } else {
          $scope.value.imagerName = output.imagerType;
        }
      },
      // The rest are output(readonly)
      footprintWidth: function(output) {
        $scope.value.footprintWidth = output.footprint.width * convert.meter.to[$scope.unit.footprintWidth];
      },
      footprintHeight: function(output) {
        $scope.value.footprintHeight = output.footprint.height * convert.meter.to[$scope.unit.footprintHeight];
      },
      distanceParallel: function(output) {
        $scope.value.distanceParallel = output.distance.betweenTrack * convert.meter.to[$scope.unit.distanceParallel];
      },
      distanceForward: function(output) {
        $scope.value.distanceForward = output.distance.betweenCapture * convert.meter.to[$scope.unit.distanceForward];
      },
      timeCapture: function(output) {
        $scope.value.timeCapture = output.time.betweenCapture;
      },
      numCaptures: function(output) {
        var numcap = output.numOf.totalCaptures;
        $scope.value.numCaptures = numcap;
        $scope.value.numImages = numcap * TOTAL_IMAGER_COUNT;
      },
      timeTotal: function(output) {
        var timetothrs = Math.floor(output.time.totalFlight / 3600);
        var timetotmin = Math.ceil((output.time.totalFlight - timetothrs*3600) / 60);
        $scope.value.timeTotal = timetothrs + " hours " + timetotmin + " minutes";
      },
      areaPerHour: function(output) {
        $scope.value.areaPerHour = output.areaPerSecond * convert.meter2.to[$scope.unit.areaPerHour] * 3600;
      },
      storageSize: function(output) {
        $scope.value.storageSize = output.storageSize * $scope.value.numCaptures * 1e-9;
      }
    };

    // initialize form with the cached value
    function initForm(cacheValue, cacheUnit) {
      if (cacheValue && cacheUnit) {
        var value = JSON.parse(cacheValue);
        var unit = JSON.parse(cacheUnit);

        var key;
        for (key in BASIC_DOM.INPUT_VAL_ID) {
          $scope.value[key] = value[key];
        }

        for (key in BASIC_DOM.INPUT_UNIT_ID) {
          $scope.unit[key] = unit[key];
        }

        // update agl and gsd in meter value
        output.gsd = parseFloat(value.gsd) * convert[unit.gsd].to.meter;
        output.agl = parseFloat(value.agl) * convert[unit.agl].to.meter;
      }
    }

    // check error
    function checkError(output) {
      $scope.error.timeCapture = output.error.captureSpeed;
      $scope.error.storageSize = output.error.maxStorage;
    }

    // give flash to form
    function flashForm(form) {
      $scope.flash[form] = true;
      $timeout(function(){
        $scope.flash[form] = false;
      }, FLASH_DELAY);
    }
  }]);
