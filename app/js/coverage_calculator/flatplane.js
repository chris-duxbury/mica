/**
 * Ground model for coverage app. Model represent a flat plane Earth using WGS-84 convention
 * Assumption:
 * - The plane is at z = 0 and expand in all directions of x and y axis
 * - The local coordinate z = 0 is at the altitude provided in origin[2].
 *      Since this plane represent the ground, this altitude should be less
 *      than or equal to the min(altitude) of all the captures.
 */

"use strict";

var PLANE = (function() {
    var Vector = require('./vector.js');

    var origin = null;
    var EARTH_RADIUS = 6378137; // in m, based on WGS-84
    
    /* Conversion factor to convert lat,lon to local coordinate */
    // 1 minute of latitude is 1,852 m. And 1 degree is 60 minutes.
    var Y_FACTOR = 1852 * 60; // meters/degree of lat
    
    var X_FACTOR = function(lat) {
        
        var latInRadian = parseFloat(lat) * Math.PI / 180;

        // (The circumference of Earth at latitude lat) / (360 degree)
        return 2 * Math.PI * EARTH_RADIUS * Math.cos(latInRadian) / 360;
        // meters/degree of longitude at latitude lat
    };

    /**
     * Set the origin used for local coordinate
     */
    var setOrigin = function(coord) {
        origin = coord;
    };

    /**
     * Return the point of intersection of a ray coming from point 'raystart' with direction
     * 'raydir' with this plane
     * Return null if the ray doesn't intersect
     */
    var intersectPlane = function(raystart, raydir) {
        // this is for flat plane
        // plane equation = N * P = c
        // N = the plane normal
        // P = a point in the plane
        // c = plane comstant

        // Since the plane is infinite and flat,
        // and the plane is at origin, we can pick P = (0,0,0) and then c = 0
        var N = [0,0,1];

        if (Vector.dotProduct(raydir, N) >= 0) {
            // ray parallel to plane, camera is perpendicular to ground
            // or camera facing up
            return null;
        } 

        // if ray intersect the plane
        // (raystart + t*raydir) -> a point in the plane
        // N * (raystart + t*raydir) = c
        // t = (c - N*raystart) / (N * raydir)
        var t = (-Vector.dotProduct(N, raystart)) / Vector.dotProduct(N, raydir);
        
        // the camera is under the ground. use EPSILON to handle rounding error
        if (t < 0) {
            return null;
        }

        // point = raystart + t*raydir
        return Vector.add(raystart, raydir, t);
    };

    var getGroundElevation = function(gpsCoord) {
        return origin[2];
    };

    var getLocalCoord = function(gpsCoord) {
        var x = (parseFloat(gpsCoord[1]) - parseFloat(origin[1])) * X_FACTOR(gpsCoord[0]);
        var y = (parseFloat(gpsCoord[0]) - parseFloat(origin[0])) * Y_FACTOR;
        var z = (parseFloat(gpsCoord[2]) - parseFloat(origin[2]));

        return [x,y,z];
    };

    return {
        'setOrigin': setOrigin,
        'intersectPoint': intersectPlane,
        'getGroundElevation': getGroundElevation,
        'getLocalCoord': getLocalCoord
    };

}());

module.exports = PLANE;