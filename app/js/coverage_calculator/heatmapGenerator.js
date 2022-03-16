/*
 * This module is responsible for producing a coverage map from an array
 * of features
 * feature = {  "type" : "Feature",
                "geometry" :
                    {  "type" : "Point",
                    "coordinates" : [47.65, -122.34, 10.0]
                    },
                "properties" :
                    {
                    "Attitude" : [0.0, 0.0, 0.0],
                    "FocalLength" : 5.5,
                    "PixelSize" : [0.00375, 0.00375],
                    "ImageSize" : [1280, 960] // horizontal
                    }
    }

    There are going to be three steps
 */
var HEATMAP = (function() {
    'use strict';

    // Module
    var Polygon = require('./polygon.js');
    var Overlap = require('./overlapCalculator.js');
    var Ground = require('./groundModel.js');
    var Statistic = require('./statistic.js');

    // Constant
    var ROUND = 1e8; // constant for rounding the result of arithemthic
    var MIN_PIXEL_SIZE = 0;
    var PER_PROGRESS_DELAY = 0; // milisecond
    var PER_STEP_DELAY = 200; // milisecond
    var BASE_COLOR; // array of color for coverage map based on number of overlap

    function _generateBaseColor() {
        // color map based on https://ai.googleblog.com/2019/08/turbo-improved-rainbow-colormap-for.html
        var baseColor = [
                            [255,255,255],  // white
                            [193,35,2],     // red, bad
                            [210,40,5],
                            [225,65,9],
                            [236,83,15],
                            [245,105,24],   // poor
                            [251,129,34],
                            [253,174,53],
                            [236,209,58],
                            [203,237,52],
                            [161,253,61],   // good
                            [105,253,102],
                            [47,241,155],
                            [24,219,197],
                            [30,203,218],
                            [42,185,238],
                            [67,145,254],
                            [70,125,244],   // Excellent
                            [70,105,224],
                            [63,62,156]     // blue
                        ];
        return baseColor;
    }

    // Get the pixel color given the number of overlap in that pixel
    function _getColor(numOfOverlap) {
        if (numOfOverlap > BASE_COLOR.length - 1) {
            numOfOverlap = BASE_COLOR.length - 1;
        }
        return BASE_COLOR[numOfOverlap];
    }

    // Color the given overlap map
    var _colorHeatMap = function(overlapMapData) {
        var overlapMap = overlapMapData.map;
        for (var r = 0; r < overlapMap.length; r++) {
            var rowmap = overlapMap[r];
            for (var c = 0; c < rowmap.length; c++) {
                rowmap[c] = _getColor(rowmap[c]);
            }
        }

        return overlapMap;
    };

    // Clean up the given features array from unnecessary data
    function _preprocessData(features) {
        features = _removeZeroCoord(features);
        return features;
    }

    // Remove the data that has 0,0,0 gps coord
    function _removeZeroCoord(features) {
        for (var i = 0; i < features.length; i++) {

            var coord = features[i].geometry.coordinates;
            
            if (coord[0] == 0 && coord[1] == 0 && coord[2] == 0) {
                features.splice(i, 1);
                i--;
            }
        }

        return features;
    }


    // Create an array of polygons from the features array
    var _createAllPolygons = function(features, origin, orientation, flightAGL) {

        Ground.initModel(origin);
        Polygon.setGroundModel(Ground);

        var polys = [];
        for (var i =0; i < features.length; i++) {
            var poly = Polygon.makePolygon(features[i], orientation, flightAGL);
            if (poly === null) {
                continue;
            }
            polys.push(poly);
        }
        
        return polys;

    };

    // Get the unit used for 1 pixel: how many meters/pixel
    function _getUnit(capture, agl, division) {
        var focal = capture.properties.FocalLength;
        var size = capture.properties.ImageSize[0] * capture.properties.PixelSize[0];
        var horizontalViewAngle = Polygon.getViewAngle(focal, size);
        var horizontalWidth = 2 * agl * Math.tan(horizontalViewAngle/2);

        return Math.round(ROUND * horizontalWidth / division) / ROUND;
    }

    // Get GSD
    function _getHorizontalDistance(feature, agl) {
        var focal = feature.properties.FocalLength;
        var size = feature.properties.ImageSize[0] * feature.properties.PixelSize[0];
        var horizontalViewAngle = Polygon.getViewAngle(focal, size);

        return 2 * agl * Math.tan(horizontalViewAngle/2);
    }

    /**
     * @param features {array} an array of captures. Must be a valid array with length > 0
     * Get the flight data (AGL, GSD) from the given array of features
     * Return null if features doesn't contain captures with valid gps
     */
    function getFlightData(features) {
        features = _preprocessData(features);

        if (features.length === 0) {
            // No captures with valid gps
            return null;
        }
        var minCoord = Statistic.getMinimumLatLonAlt(features);
        var altMedian = Statistic.getMedianAlt(features);
        var agl = altMedian - minCoord[2]; // in meter

        var horizontalDistance = _getHorizontalDistance(features[0], agl);
        var horizontalPixel = features[0].properties.ImageSize[0];
        var horizontalGSD = Math.round(ROUND * horizontalDistance / horizontalPixel) / ROUND; // in meter

        return {
            'agl': agl,
            'horizontalGSD': horizontalGSD
        };
    }

    /**
     * Get the coverage map from the given GeoJSON:features and
     * pass in the img DOM into onFinishFn
     *
     * @param features {array} an array of captures. Must be a valid array with length > 0
     * @param onFinishFn {function} a return function that takes img DOM
     * 
     * additionalArgs is explained in the README
     */
    function getImageCoverage(features, agl, orientation, onFinishFn, additionalArgs) {
        if (!additionalArgs.updateProgress) {
            // empty fn
            additionalArgs.updateProgress = function(percent) {};
        }
        if (!additionalArgs.updateUnit) {
            additionalArgs.updateUnit = function(unit) {};
        }
        BASE_COLOR = (additionalArgs.baseColor) ? additionalArgs.baseColor : _generateBaseColor();

        additionalArgs.updateProgress(0);
        setTimeout(function() { // get statistic
            features = _preprocessData(features);
            var origin = Statistic.getMinimumLatLonAlt(features);
            var altMedian = Statistic.getMedianAlt(features);
            
            origin[2] = altMedian - agl;

            setTimeout(function() { // create polygons
                var polys = _createAllPolygons(features, origin, orientation);

                // if unit (size of 1 pixel in meters) is not set, figure it out from
                // agl
                if (!additionalArgs.unit) {
                    additionalArgs.unit = _getUnit(features[0], agl, additionalArgs.division);
                    // round to milimeters precision
                    // additionalArgs.unit = Math.round(additionalArgs.unit * 100) / 100;
                    if (additionalArgs.unit <= MIN_PIXEL_SIZE) {
                        var message = "Make sure that the above ground level is > 0.\n";
                        onFinishFn(null, message);
                        return;
                    }
                }

                additionalArgs.updateUnit(additionalArgs.unit)

                setTimeout(function() { // get overlap
                    var getBitmapArgs = [onFinishFn];
                    var map =
                      Overlap.getOverlapMap(additionalArgs.unit, polys, _getBitmap, getBitmapArgs, additionalArgs.updateProgress);

                }, PER_STEP_DELAY); // end overlap

            }, PER_PROGRESS_DELAY); // end polygons creation

        }, PER_PROGRESS_DELAY); // end statistics
    }

    // Get the bitmap
    // onFinishFn is in args[0]
    // If overlapMapData is null, args[args.length-1] contains the message
    function _getBitmap(overlapMapData, args) {

        var onFinishFn = args[0];
        
        if (overlapMapData === null) {
            var message = args.pop();
            onFinishFn(null, message);
            return;
        } else {
            setTimeout(function() { // converto to color array
                var colored = _colorHeatMap(overlapMapData);

                setTimeout(function() { // make bitmap image
                    var bitmapURL = window.generateBitmapDataURL(colored, 1);

                    setTimeout(function() { // display coverage
                        var img = document.createElement('img');
                        img.src = bitmapURL;
                    
                        onFinishFn(img);
                    }, PER_STEP_DELAY); // end display coverage

                }, PER_PROGRESS_DELAY); // end making bitmap

            }, PER_STEP_DELAY); // end color array
        }
        
    } 

    return {
        'getImageCoverage': getImageCoverage,
        'getFlightData': getFlightData
    };

}());

module.exports = HEATMAP;