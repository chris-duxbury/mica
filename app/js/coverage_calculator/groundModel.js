/*
 *  This is the ground model that knows where a ray intersect at the ground
 *  (Using local coordinate with the origin (lat,lon,alt) at the coordinate
 *  provided in the initialization).
 *
 *  The ground model must implement:
 *    1. setOrigin:
 *          param--> array gpsCoord: array of [lat,lon,alt] 
 *    2. intersectPoint:
 *          param--> point/vector raystart: [x,y,z] in local coordinate where the ray originate
 *               --> vector raydir: the direction of the ray
 *          return --> point/vector where the intersect happen
 *                 --> null if there is no intersection
 *    3. getGroundElevation:
 *          param--> array gpsCoord: array of [lat,lon,alt]
 *          return --> float the ground elevation at the given lat,lon
 *    4. getLocalCoordinate:
 *          param--> array gpsCoord: array of [lat,lon,alt]
 *          return --> the local coordinate of the given gps
 */
"use strict";

var GROUND = (function() {

    // Change the ground model here
    var groundModel = require('./flatplane.js');

    var origin = null;
    var model = groundModel;

    var initModel = function(orig) {
        origin = orig;
        model.setOrigin(orig);
    };

    var getOrigin = function() {
        return origin;
    }

    // Return the point of intersection between the ray from the camera to the 
    // ground
    // Return null if there is no intersection
    // raystart and raydir should be in local coordinate and normalize
    var intersectPoint = function(raystart, raydir) {
        return model.intersectPoint(raystart, raydir);
    };

    var getGroundElevation = function(gps) {
        return model.getGroundElevation(gps);
    };

    var getLocalCoordinate = function(gps) {
        return model.getLocalCoord(gps);
    };

    return {
        'getOrigin': getOrigin,
        'initModel': initModel,
        'intersectPoint': intersectPoint,
        'getGroundElevation': getGroundElevation,
        'getLocalCoord': getLocalCoordinate
    };

}());

module.exports = GROUND;