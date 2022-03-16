/**
 * Module for basic dom manipulation, and calculation (like the conversion of the input to
 * metric system) that can be shared between any html
 */

var BASIC_DOM = (function() {
  'use strict';

  // Shortcut for get dom by ID and get its value
  var getDOM = function(id) { return document.getElementById(id); };
  var getVAL = function(id) { 
    var dom = getDOM(id);
    if (dom) {
      return dom.value;
    }

    return null;
  };

  // Round to 2 decimal place
  var ROUND2 = function(val) { return Math.round(val * 100) / 100; };

  // list of ids for input values
  var INPUT_VAL_ID = {
    agl: "agl.value", area: "area.value", forwardOverlap: "overlap.forward", crossOverlap: "overlap.cross",
    flightSpeed: "speed.flight.value", wing: "wing", orientation: "orientation", imgQuality: "imgQuality",
    gsd: "gsd.value"
      // for input units
  }, INPUT_UNIT_ID = {
    agl: "agl.unit", area: "area.unit", flightSpeed: "speed.flight.unit", gsd: "gsd.unit"
      // for output values
  }, OUTPUT_VAL_ID = {
    footprintWidth: "footprint.width.value", footprintHeight: "footprint.height.value",
    distanceParallel: "distance.parallel.value", distanceForward: "distance.forward.value",
    timeCapture: "time.capture", numCaptures: "number.captures", numImages: "number.images",
    timeTotal: "time.total", areaPerHour: "speed.coverage.value", storageSize: "size.storage"
      /// for output ids
  }, OUTPUT_UNIT_ID = {
    footprintWidth: "footprint.width.unit", footprintHeight: "footprint.height.unit",
    distanceParallel: "distance.parallel.unit", distanceForward: "distance.forward.unit",
    areaPerHour: "speed.coverage.unit"
  };

  var IMAGER_TYPE_DATA = {'init': {'count': 0}};
  var IMAGER_TYPE = 'init';

  // object to convert value between units
  var convert = {
    meter: {
      to: {
        meter: 1,
        feet: 3.28084,
        cm: 1e2,
        inch: 39.3701
      }
    },
    feet: { to: { meter: 0.3048 }},
    meter2: {
      to: {
        hectare: 1e-4,
        acre: 0.000247105
      }
    },
    hectare: { to: { meter2: 1e4 }},
    acre: { to: { meter2: 4046.86 }},
    mph: { to: { meterSec: 0.44704 }},
    kph: { to: { meterSec: 0.277778 }},
    knot: { to: { meterSec: 0.514444 }},
    meterSec: { to: { meterSec: 1 }},
    cm: { to: { meter: 1e-2 }},
    inch: { to: { meter: 0.0254 }}
  };

  var displayFn = {
    // gsd and agl is part of input, so update its value
    gsd: function(output) {
      var gsd = output.gsd * convert.meter.to[ getVAL( INPUT_UNIT_ID.gsd ) ];
      getDOM(INPUT_VAL_ID.gsd).value = ROUND2(gsd);
    },
    agl : function(output) {
      var agl = output.agl * convert.meter.to[ getVAL( INPUT_UNIT_ID.agl ) ];
      getDOM(INPUT_VAL_ID.agl).value = ROUND2(agl);
    },
    // The rest are output(readonly) so update inner html
    footprintWidth: function(output) {
      var width = output.footprint.width * convert.meter.to[ getVAL( OUTPUT_UNIT_ID.footprintWidth ) ];
      getDOM(OUTPUT_VAL_ID.footprintWidth).innerHTML = ROUND2(width);
    },
    footprintHeight: function(output) {
      var height = output.footprint.height * convert.meter.to[ getVAL( OUTPUT_UNIT_ID.footprintHeight ) ];
      getDOM(OUTPUT_VAL_ID.footprintHeight).innerHTML = ROUND2(height);
    },
    distanceParallel: function(output) {
      var distpar = output.distance.betweenTrack * convert.meter.to[ getVAL( OUTPUT_UNIT_ID.distanceParallel ) ];
      getDOM(OUTPUT_VAL_ID.distanceParallel).innerHTML = ROUND2(distpar);
    },
    distanceForward: function(output) {
      var distfor = output.distance.betweenCapture * convert.meter.to[ getVAL( OUTPUT_UNIT_ID.distanceForward ) ];
      getDOM(OUTPUT_VAL_ID.distanceForward).innerHTML = ROUND2(distfor);
    },
    timeCapture: function(output) {
      var timecap = output.time.betweenCapture;
      getDOM(OUTPUT_VAL_ID.timeCapture).innerHTML = ROUND2(timecap) + " seconds";
    },
    numCaptures: function(output) {
      var numcap = output.numOf.totalCaptures;
      getDOM(OUTPUT_VAL_ID.numCaptures).innerHTML = Math.round(numcap);
      getDOM(OUTPUT_VAL_ID.numImages).innerHTML = Math.round(numcap * IMAGER_TYPE_DATA[IMAGER_TYPE].count);
    },
    timeTotal: function(output) {
      var timetothrs = Math.floor(output.time.totalFlight / 3600);
      var timetotmin = Math.ceil((output.time.totalFlight - timetothrs*3600) / 60);
      if(timetomin == 60){
        timetohrs = timetohrs + 1;
        timetomin = 0;
      }
      getDOM(OUTPUT_VAL_ID.timeTotal).innerHTML = timetothrs + " hours " + timetotmin + " minutes";
    },
    areaPerHour: function(output) {
      var areaPerHour = output.areaPerSecond * convert.meter2.to[ getVAL( OUTPUT_UNIT_ID.areaPerHour ) ] * 3600;
      getDOM(OUTPUT_VAL_ID.areaPerHour).innerHTML = ROUND2(areaPerHour);
    },
    storageSize: function(output) {
      var storageSize = output.storageSize * 1e-9;
      getDOM(OUTPUT_VAL_ID.storageSize).innerHTML = ROUND2(storageSize) + " GB";
    }
  };

  function setImagerTypeData(imager_type_data) {
    IMAGER_TYPE_DATA = imager_type_data;
  }

  function setImagerType(imager_type) {
    IMAGER_TYPE = imager_type;
  }

  // assign onchange on all the output's unit
  function outputUnitOnchange(key, output) {
    var dom = getDOM(OUTPUT_UNIT_ID[key]);
    if (dom) {
      dom.onchange = function() {
        displayFn[key](output);
      };
    }
  }

  function displayAllOutput(output) {
    var key;
    for (key in displayFn) {
      displayFn[key](output);
    }
  }

  function convertInput(inputMode, form) {
    var input = {};

    input.mode = inputMode;
    input.agl = parseFloat(form.value.agl) * convert[form.unit.agl].to.meter;
    input.gsd = parseFloat(form.value.gsd) * convert[form.unit.gsd].to.meter;
    input.area = parseFloat(form.value.area) * convert[form.unit.area].to.meter2;
    input.overlap = {
      'forward': parseFloat(form.value.forwardOverlap) / 100,
      'cross': parseFloat(form.value.crossOverlap) / 100
    };
    input.flightSpeed = parseFloat(form.value.flightSpeed) * convert[form.unit.flightSpeed].to.meterSec;
    input.wing = form.value.wing;
    input.imgQuality = form.value.imgQuality;

    // camera input
    input.resolution = IMAGER_TYPE_DATA[IMAGER_TYPE].resolution.slice(0);
    if (form.value.orientation === "portrait") {
      input.resolution.reverse();
    }
    input.viewAngle = [
                          getViewAngle(IMAGER_TYPE_DATA[IMAGER_TYPE].focal_length_px, IMAGER_TYPE_DATA[IMAGER_TYPE].resolution[0]),// in radians
                          getViewAngle(IMAGER_TYPE_DATA[IMAGER_TYPE].focal_length_px, IMAGER_TYPE_DATA[IMAGER_TYPE].resolution[1]) // in radans
                        ];
    input.numOfBands = IMAGER_TYPE_DATA[IMAGER_TYPE].count;
    input.imagerType = IMAGER_TYPE;

    return input;
  }

  function getFormValue() {
    var key, form = {};

    form.value = {};
    for (key in INPUT_VAL_ID) {
      form.value[key] = getVAL( INPUT_VAL_ID[key] );
    }

    form.unit = {};
    for (key in INPUT_UNIT_ID) {
      form.unit[key] = getVAL( INPUT_UNIT_ID[key] );
    }

    return form;
  }

  //////////////////////////////////////////////////////////////////////////////////////

  function getViewAngle(focal, imgsize) {
    if (focal <= 0 || imgsize <= 0) {
      return 0.0;
    }

    var value = imgsize/(2*focal);
    return (2.0 * Math.atan(value));
  }

  // BASIC_DOM module
  return {
    'getDOM': getDOM, 'getVAL': getVAL, 'getFormValue': getFormValue,
    'INPUT_VAL_ID': INPUT_VAL_ID, 'INPUT_UNIT_ID': INPUT_UNIT_ID,
    'OUTPUT_VAL_ID': OUTPUT_VAL_ID, 'OUTPUT_UNIT_ID': OUTPUT_UNIT_ID,
    'displayFn': displayFn, 'displayAllOutput': displayAllOutput,
    'outputUnitOnchange': outputUnitOnchange,
    'convert': convert, 'convertInput':convertInput,
    'NUM_OF_BANDS': IMAGER_TYPE_DATA[IMAGER_TYPE].count, 'ROUND2': ROUND2,
    'setImagerTypeData' : setImagerTypeData, 'setImagerType' : setImagerType
  };

}());
