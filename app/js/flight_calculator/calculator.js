/*
  Calculate flight data for a given flight mission

    var output = FLIGHT_CALCULATOR.getFlightData(input, output);

  input:
  - 'agl' : altitude agl (float) in meter
  - 'area' : field area (float) in meter square
  - 'overlap' : overlap requirement (Object)
    * 'forward' : forward/along-track overlap (float) 0 <= val < 1
    * 'cross' : cross-track overlap (float) 0 <= val < 1
  - 'flightSpeed' : aircraft flight speed (float) in meter/second
  - 'wing' : aircraft wing type (String), 'fixed' for  fixed wing or 'vtol' for vtol aircraft
  - 'imgQuality' : img output type (String), 'DNG' or 'TIFF'
  - 'resolution': image resolution (Array float) [horizontal, vertical]
  - 'numOfBands' : number of images per capture (int)
  - 'viewAngle' : the viewing angle (Array float) [horizontal, vertical] in radians

  output:
  - 'footprint' : projected image on the ground (Object)
    * 'width' : size corresponding to the horizontal side (float) in meter
    * 'height' : size corresponding to the vertical side (float) in meter
  - 'gsd' : average ground sample distance for both side (float) in meter
  - 'distance' : (Object)
    * 'betweenCapture' : distance between capture along the track (float) in meter
    * 'betweenTrack' : distance between capture across the track (float) in meter
  - 'numOf' : (Object)
    * 'tracks' : number of tracks/passes to cover the whole field (int)
    * 'capturesPerTrack' : number of captures in one track/pass (int)
  - 'time' : (Object)
    * 'betweenCapture' : time needed between capture (float) in second
    * 'turnTime' : total time needed for making turns between passes (float) in second
    * 'totalFlight' : total flight time (float) in second
  - 'areaPerSecond' : area per second (float) in meter square/second
  - 'storageSize' : storage space requirement (float) in Bytes
  - 'error' : (Object)
    * 'captureSpeed' : flag for time between capture < max possible capture speed (boolean)
    * 'maxStorage' : flag for storage requirement > max storage&overhead (boolean) 
*/

var FLIGHT_CALCULATOR = (function(){
  'use strict';

  var imgDataSize = {
          'DNG': 12,
          'TIFF': 16
          };
  var maxCaptureSpeed = {
    'DNG': .9, // in seconds
    'TIFF': 1
  }

  var m = {}; // this module

  m.getFlightData = function(input, output, $scope, $http, total_capture_size) {
    if (!input || !input.mode) {
      return {};
    }

    // grab updated values
    $http.get('/status/').success(function(data) {
                    $scope.status = data;
                }).error(function() {
                    console.log("ERROR getting status");;
                });

    var values = output || {};
    var fieldSize = Math.sqrt(input.area); // in meter

    values.footprint = values.footprint || {};

    if (input.mode === "agl") {
      values.footprint.width = getFootprint.agl(input.viewAngle[0], input.agl); // in meter
      values.footprint.height = getFootprint.agl(input.viewAngle[1], input.agl); // in meter
      values.agl = input.agl;
      values.gsd = getAvgGSD(values.footprint, input.resolution);
    } else if (input.mode === "gsd") {
      values.footprint.width = getFootprint.gsd(input.resolution[0], input.gsd); // in meter
      values.footprint.height = getFootprint.gsd(input.resolution[1], input.gsd); // in meter
      values.gsd = input.gsd;
      values.agl = getAGL(values.footprint, input.viewAngle);
    }

    values.imagerType = input.imagerType;

    var d = values.distance = values.distance || {};
    d.betweenCapture = getDistance.capture(input.overlap.forward, values.footprint.height);
    d.betweenTrack = getDistance.capture(input.overlap.cross, values.footprint.width);

    var n = values.numOf = values.numOf || {};
    n.tracks = getNumOf.tracks(d.betweenTrack, fieldSize);
    n.capturesPerTrack = getNumOf.capturesPerTrack(d.betweenCapture, fieldSize);
    n.totalCaptures = n.tracks * n.capturesPerTrack;

    var t = values.time = values.time || {};
    t.betweenCapture = getTime.betweenCapture(d.betweenCapture, input.flightSpeed);
    var turnFn = getTime.turnTime[input.wing] || function(){return 0;};
    t.turnTime = turnFn(input, values);
    t.totalFlight =
      getTime.perPass(n.capturesPerTrack, t.betweenCapture) * n.tracks + t.turnTime;

    values.areaPerSecond = getAreaPerSecond(t.totalFlight, input.area);

    values.storageSize = getStorageRequirement(total_capture_size, input.imgQuality);

    values.error = output.error || {};
    values.error.captureSpeed = (t.betweenCapture < maxCaptureSpeed[input.imgQuality]);

    values.error.maxStorage = values.storageSize > ($scope.status.sd_gb_free*1e9*0.99995);  // to bytes, and then multiply to estimate max storage minus log files

    return values;
  };

////////////////////////////////////////////////////////////////////////////////////////////////
// Helper function
////////////////////////////////////////////////////////////////////////////////////////////////

  // Return the footprint of one of the side based on which side is the given viewangle/resolution
  // Use agl or gsd
  var getFootprint = {};
  getFootprint.agl = function(viewAngle, agl) {
    return 2 * agl * Math.tan(viewAngle / 2);
  };
  getFootprint.gsd = function(pixelResolution, gsd) {
    return gsd * pixelResolution;
  };

  // Get the agl. footprint(object) and viewAngle(array) for both side
  var getAGL = function(footprint, viewAngle) {
    return footprint.width / 2 / Math.tan(viewAngle[0] / 2);
  };

  // Get the gsd. footprint(object) and resolution(array) for both side
  var getAvgGSD = function(footprint, resolution) {
    var horGSD = footprint.width / resolution[0]; // meter
    var verGSD = footprint.height / resolution[1];

    return (horGSD + verGSD) / 2;
  }

  var getDistance = {};
  // Get the distance between 2 capture (forward or cross-track depending arguments)
  getDistance.capture = function(overlap, footprintSize) {
    return footprintSize * (1 - overlap);
  };

  var getNumOf = {};
  getNumOf.tracks = function(distanceBetweenTrack, fieldWidth) {
    return Math.ceil(fieldWidth / distanceBetweenTrack);
  };
  getNumOf.capturesPerTrack = function(distanceBetweenCapture, fieldHeight) {
    return Math.ceil(fieldHeight / distanceBetweenCapture);
  };

  var getTime = {};
  getTime.betweenCapture = function(distanceBetweenCapture, flightSpeed) {
    return distanceBetweenCapture/flightSpeed;
  };
  getTime.perPass = function(capsPerTrack, timeBetweenCapture) {
    return capsPerTrack * timeBetweenCapture;
  };
  getTime.turnTime = {};
  getTime.turnTime['fixed']= function(input, output) {
    var turnRate = 20; // degree per second
    var t = 180 / turnRate; // time to turn 180 degree
    var m = 0.2; // multiplier for keyhole pattern 20%
    var p = output.numOf.tracks; // number of parallel tracks
    return t * (1 + m) * (p - 1);
  };
  getTime.turnTime['vtol'] = function(input, output) {
    var t = output.distance.betweenTrack / input.flightSpeed; // time for moving to the next track
    var m = 0.25; // multiplier for perpendicular path
    var p = output.numOf.tracks; // number of parallel tracks
    return t * (1 + m) * (p - 1);
  };

  var getAreaPerSecond = function(flightTime, area) {
    return area / flightTime;
  };

  var getStorageRequirement = function(tot_cap_size, imgQuality) {
    return tot_cap_size * imgDataSize[imgQuality]/8;    // units: bytes
  };

  // return this module
  return m;
} ());
