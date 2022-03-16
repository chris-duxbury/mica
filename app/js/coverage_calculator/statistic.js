"use strict";

var STATISTIC = (function() {

    /**
     * Get the minimum lat, min lon, min alt and return it as an array [lat,lon,alt]
     */
    var getMinimumLatLonAlt = function(features) {
        var minLat = Number.POSITIVE_INFINITY;
        var minLon = Number.POSITIVE_INFINITY;
        var minAlt = Number.POSITIVE_INFINITY;

        for (var i = 0; i < features.length; i++) {

            var coord = features[i].geometry.coordinates;
            
            if (minLat > coord[0]) {
                minLat = coord[0];
            }
            if (minLon > coord[1]) {
                minLon = coord[1];
            }
            if (minAlt > coord[2]) {
                minAlt = coord[2];
            }
        }

        return [minLat, minLon, minAlt];
    };

    /**
     * Get the median altitude from the array of features
     * features must be as specified in th GeoJSON document
     * (especially the array of coordinates is in this order [lat,lon,alt])
     */
    var getMedianAlt = function(features) {
        var altitudes = [], len = features.length;
        for (var i = 0; i < features.length; i++) {
            altitudes.push(features[i].geometry.coordinates[2]);
        }

        return _median(altitudes);
   };

   var _median = function(array) {
        array.sort( function(a,b) {return a-b;});

        var middle = Math.floor(array.length / 2);

        if (array.length % 2) {
            return array[middle];
        }

        return (10 * array[middle-1] + 10 * array[middle]) / 20.0;
   };

    return {
        'getMinimumLatLonAlt': getMinimumLatLonAlt,
        'getMedianAlt': getMedianAlt
    };

}());

module.exports = STATISTIC;