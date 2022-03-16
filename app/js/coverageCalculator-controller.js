'use strict';

/* Map Controller */
/**

### Selecting multiple flights

When multiple flights are selected, the app will concatenate the feature array from each flight.
This is done with the assumptions that all the selected flights are taken with the same camera
and every flight has the same camera properties (`feature.properties` with the exception
of `Attitude` field).
*/

var ms_module = angular.module('myApp.controllers')
    .controller('MapCtrl', ['$http', '$timeout', '$scope', 'Config', function($http, $timeout, $scope, Config) {    

        var PERCENT_CHUNK = 1;
        var PREPARE_RENDER_DELAY = 500; // millisecond
        var SHOW_COVERAGE_DELAY = 500; // millisecond
        var PANEL_INITIAL_DELAY = 1; // millisecond
        var RESET_PROGRESS_BAR_DELAY = SHOW_COVERAGE_DELAY + 100;
        var RENDER_DELAY = 500;

        var selected_folder;
        var division = {
                            'low': 50,
                            'high': 150
                        };
        var stepMessage = [
                            '',
                            "Calculating the flight's coverage",
                            "Generating image coverage"
                           ];

        $scope.is_rendering = false;
        $scope.orientation = "0";
        $scope.agl_value = 50;
        $scope.resolution = 'low';
        $scope.part_progress = 0;
        $scope.progress_message = "";
        $scope.selected_flightName =  []; // setname of the selected flights
        $scope.error_panel = {
            'no_selected_flight': false,
            'coverage_error': false,
            'no_available_flight': false,
            'no_valid_captures': false
        };

        // function for expanding panels
        $scope.expandFn = {};
        $scope.expandFn.chooseFlight = function() {
            $("#chooseFlight").toggle();
            $("#flightMode").hide();
            $("#coverageDisplay").hide();
        };
        $scope.expandFn.flightMode = function() {
            $("#chooseFlight").hide();
            $("#flightMode").toggle();
            $("#coverageDisplay").hide();
        };
        $scope.expandFn.coverageDisplay = function() {
            $("#chooseFlight").hide();
            $("#flightMode").hide();
            $("#coverageDisplay").toggle();
        };

        // Display flight data of the selected flight and prepare the UI
        // for user to select the flight setting
        $scope.loadSelectedFolder = function() {
            $("#smallSpinner").show();
            selected_folder = getSelectedFolder();
            if (selected_folder.length) {
                var flightData = Heatmap.getFlightData(selected_folder);
                if (flightData) {
                    $scope.estimated_AGL = flightData.agl;
                    $scope.agl_value = Math.round(flightData.agl * 100) / 100;
                    $scope.estimated_flight_GSD = flightData.horizontalGSD;

                    $("#coverageDisplay").hide(1,function(){
                        $("#chooseFlight").hide(1,function(){
                            $("#flightMode").show(1,function(){
                                $("#flightMode-Panel").slideDown(PANEL_INITIAL_DELAY, function(){
                                    tryApply();
                                    $("#flightMode-Panel").get(0).scrollIntoView({block:"start",behavior:"smooth"});
                                });
                            });
                        });
                    });
                    
                    $scope.error_panel.no_valid_captures = false;
                    $scope.error_panel.no_selected_flight = false;
                } else {
                    $scope.error_panel.no_selected_flight = false;
                    $scope.error_panel.no_valid_captures = true;
                }

            } else {
                $scope.error_panel.no_selected_flight = true;
                $scope.error_panel.no_valid_captures = false;
            }
            $("#smallSpinner").hide();
        };

        // onclick function to render the coverage image
        $scope.render = function() {
            // If there is at least one folder selected
            $("#image_area > img").remove();

            if (selected_folder.length) {
                $scope.is_rendering = true;
                $scope.error_message = null;

                $scope.error_panel.no_selected_flight = false;
                $scope.error_panel.coverage_error = false;

                var additionalArgs = {
                    'division': division[$scope.resolution],
                    'updateProgress': updatePartProgress,
                    'updateUnit' : updateUnit
                }

                $("#flightMode").hide(1,function(){
                    $("#chooseFlight").hide(1,function(){
                        $("#coverageDisplay").show(1,function(){
                            $("#coverageDisplay-Panel").slideDown(PANEL_INITIAL_DELAY, function() {
                                $("#coverageDisplay-Panel").get(0).scrollIntoView({block:"start",behavior:"smooth"});
                                $("#canvas").slideUp(PREPARE_RENDER_DELAY);
                                $("#progress_bar").fadeIn(PREPARE_RENDER_DELAY);
                                $("#render_spinner").fadeIn(PREPARE_RENDER_DELAY, function() {
                                    //setTimeout(function(){$("#coverageDisplay-Panel").get(0).scrollIntoView({block:"start",behavior:"smooth"});},10);
                                    // Heatmap is a global module for coverage app. Name is defined in the build file
                                    // See standalone part of Browserify
                                    // args: features, agl, orientation, onFinishFn, additionalArgs
                                    Heatmap.getImageCoverage(selected_folder, $scope.agl_value, parseFloat($scope.orientation), showCoverage, additionalArgs);
                                });
                            });
                        });
                    });
                });

            } else {
                $scope.error_panel.no_selected_flight = true;
            }
            
        };

        // Initialize the state
        (function init() {

            $scope.folder_list = []; // {setname: 'setname', features: 'features', isChecked:'isChecked'}

            $http.get('./captures.json').success(function(data) {
                loadFlightList(data);
            });

            $("#flightMode-Panel").hide();
            $("#coverageDisplay-Panel").hide();
            $("#smallSpinner").hide();
            $("#canvas").hide();
        })();

        // load the availble flights from GeoJSON file
        function loadFlightList(data) {
            var keys = Object.keys(data);
            for (var i = 0; i < keys.length; i++) {
                var features = data[keys[i]].features;
                features = swapFeaturesLatLon(features);
                var setname = keys[i];
                $scope.folder_list.push({"setname": setname,
                                            "features": features,
                                            "numOfCaptures": features.length,
                                            "isChecked":false });
            }

            if (keys.length === 0) {
                $scope.error_panel.no_available_flight = true;
            }
        }
        
        // Data input is (lon,lat,alt) but we want (lat,lon,alt)
        function swapFeaturesLatLon(features) {
           for (var i = 0; i < features.length; i++) {
               features[i].geometry.coordinates = [features[i].geometry.coordinates[1],
                                                   features[i].geometry.coordinates[0],
                                                   features[i].geometry.coordinates[2]];
           }

           return features;
       }

        // get the selected flights
        function getSelectedFolder() {
            $scope.selected_flightName =  [];

            var selected = [];
            for (var i = 0; i < $scope.folder_list.length; i++) {
                if ($scope.folder_list[i].isChecked) {
                    $scope.selected_flightName.push($scope.folder_list[i].setname);
                    selected = selected.concat($scope.folder_list[i].features);
                }
            }

            return selected;
        }

        // update the progress bar
        function updatePartProgress(percentage) {
            if (percentage === 100) {
                $scope.progress_message = stepMessage[2];
            } else if (percentage === 0) {
                $scope.progress_message = stepMessage[1];
            }

            if (percentage % PERCENT_CHUNK === 0) {
                $scope.part_progress = percentage;
                tryApply();    
            }
        }
        
        function updateUnit(new_unit) {
            $scope.estimated_map_GSD = new_unit;
        }

        // try to force angular to update variables
        function tryApply() {
            var phase = $scope.$root.$$phase;
            if(phase == '$apply' || phase == '$digest') {
                // do nothing    
            } else {
                $scope.$apply();
            }
        }

        // Callback function for the heatmap coverage
        function showCoverage(img, message) {

            if (img === null) {
                $scope.error_message = message;
                $scope.is_rendering = false;
                $("#render_spinner").hide();
                $("#canvas").hide();
                $("#progress_bar").hide();
                $scope.error_panel.coverage_error = true;
                tryApply();

            } else {

                $timeout(function() {
                    img.alt = "RedEdge coverage for " + $scope.selected_flightName.toString();
                    img.classList.add("img-responsive");
                    img.style.width = "100%";

                    $("#image_area").append(img);
                    $scope.error_panel.coverage_error = false;

                    // $("#loading_bar").slideUp(SHOW_COVERAGE_DELAY);
                    $("#render_spinner").fadeOut(SHOW_COVERAGE_DELAY);
                    $("#progress_bar").fadeOut(SHOW_COVERAGE_DELAY);

                    $scope.is_rendering = false;
                    tryApply();
                   
                    $("#canvas").slideDown(SHOW_COVERAGE_DELAY,function(){
                        $("#coverageDisplay-Panel").get(0).scrollIntoView({block:"start",behavior:"smooth"});
                    });

                    // reset loading bar in the background
                    $timeout(function() {
                        // updateSteps(0,0);
                        updatePartProgress(0);
                    }, RESET_PROGRESS_BAR_DELAY);

                }, SHOW_COVERAGE_DELAY);
            }
        };

    }]);
