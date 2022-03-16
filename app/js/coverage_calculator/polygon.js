'use strict';

/**
 *Note:
 *  1. The kappa value from the camera attitude + orientation will be used
 *      as heading
 *  2. GroundModel knows the ground elevation at each gps coordinate
 *  3. The polygon will be stored using local coordinate using the origin in ground model
 *  4. Assume that feature object is in the right format
 *  5. Camera rotation/attitude is applied in z, y, then x
 */


/**
 * POLYGON module responsible for making polygon for each capture
 * 
 * polygon = {
 *   origin: {array} lat,lon,alt that is used as the origin of the local coordinate
 *   centerFOV:      the intersection point of ray from the middle of camera to ground
 *   {
 *     coordinate: {array} x,y,z at the local coordinate
 *     elevation: {float} the MSL of the ground at middle point
 *   }
 *   fourPoints: {array} an array of the 4 corner points of this polygon.
 *                          [topright, bottomright, bottomleft, topleft]
 *                       each point is a point object similar to centerFOV.
 *                       the polygon is connected such that there is a line from
 *                       the first point, to the second, from second to third,
 *                       from third to fourth, and from fourth to first
 *   heading: {degree} the direction of the polygon relative to north
 * }
 */
var POLYGON = (function() {

    var Vector = require('./vector.js');
    
    var ROUND = 1e8; // rounding factor to make sure the value is rounded correctly

    var top = null, right = null, bottom = null, left = null;
    var groundModel = null;

    /**
     * Initialize the ground model
     */
     var setGroundModel = function(model) {
        groundModel = model;
     }

    /**
     * Make a polygon from the given feature(a capture) object.
     * @param {object} feature The feature object containing data about a capture
     * @param {float} orientation The orientation of the camera in degree.
     *                              landscape is 0 degree and potrait is 90 degree
     * @param {float} flightAGL (optional) The altitude above ground level where the
     *                              capture is taken. If not provided, then it will
     *                              use the altitude msl and the ground elevation to
     *                              figure this out
     *
     *
     * @return null if origin and groundmodel is not set,
                    if the feature is at gps (0,0,0),
                    or if flightAGL < 0
     * @return polygon object as described in the module's comment
     *
     * NOTE: The feature object is as defined in the GeoJSON object
     * from RedEdge.
     */
    var makePolygon = function(feature, orientation, flightAGL) {
        // check if ground model and origin is not set or null
        if (!groundModel) {
            return null;
        }
        var origin = groundModel.getOrigin();
        if (!origin) {
            return null;
        }

        var gps = feature.geometry.coordinates;
        // gps is string, so use ==
        if (gps[0] == 0 && gps[1] == 0 && gps[2] == 0) {
            return null;
        }

        if (!flightAGL) {
            flightAGL = gps[2] - groundModel.getGroundElevation(gps);
        }

        // below ground
        if (flightAGL < 0) {
            return null;
        }

        var flightCoord = [gps[0], gps[1], flightAGL + parseFloat(origin[2])];

        // camera rotation including the orientation
        var attitude = [parseFloat(feature.properties.Attitude[0]),
                        parseFloat(feature.properties.Attitude[1]),
                        parseFloat(feature.properties.Attitude[2]) + orientation];
        var resolution = feature.properties.ImageSize;
        var pixelsize = feature.properties.PixelSize;
        var focal = feature.properties.FocalLength;

        // HFOV, horizontal viewing angle
        var theta = getViewAngle(focal, resolution[0]*pixelsize[0]);
        // VFOV, vertical viewing angle
        var alpha = getViewAngle(focal, resolution[1]*pixelsize[1]);

        var center = getCenter(attitude, flightCoord);
        var topright = getCorner(attitude, alpha/2, theta/2, flightCoord);
        var bottomright = getCorner(attitude, -alpha/2, theta/2, flightCoord);
        var bottomleft = getCorner(attitude, -alpha/2, -theta/2, flightCoord);
        var topleft = getCorner(attitude, alpha/2, -theta/2, flightCoord);


        if (!center || !topright || !topleft || !bottomright || !bottomleft) {
            console.log("Polygon is null: capture " + feature);
            return null;
        }


        return {
            'origin': origin,
            'centerFOV': center,
            'fourPoints': [topright, bottomright, bottomleft, topleft],
            'heading': attitude[2]
        };
    };


    /**
     * Calculate the viewing angle of the camera in one of the side
     * @param {float} focal The focal length of the camera in mm
     * @param {float} imgsize The image size in mm
     *
     * @return the viewing angle in radian
     */
    var getViewAngle = function(focal, imgsize) {
        // Assume that RedEdge won't have negative focal length
        // Assume that imgsize won't be negative
        if (focal <= 0 || imgsize <= 0) {
            return 0.0;
        }

        var value = Math.round(ROUND * imgsize/(2*focal)) / ROUND;
        return (2.0 * Math.atan(value));
    };

    /**
     * Figure out the centerFOV, the point where a ray from the middle of
     * camera intersect the ground
     * @param {array} attitude The angle of camera rotation in the three axis
     *                           z,y,x in that order (orientation has been added)
     * @param {array} gps An array of (lat,lon,alt) that represents the camera GPS
     *                      coordinate when taking the capture
     * 
     * @return {coordinate: <local coordinate>,
     *          elevation: <the elevation>}
     *          representing the point
     */
    var getCenter = function(attitude, gps) {
        return getCorner(attitude, 0, 0, gps);
    };


    /**
     * Figure out the corner of the image on the ground. The corner is specified
     * using the half viewing angle. For example, top right corner is
     * +alpha/2 (vertical view angle) and +theta/2 (horizontal view angle)
     *
     * @param {array} attitude The angle of camera rotation in the three axis
     *                           z,y,x in that order (w/ orientation has been added)
     * @param {array} gps An array of (lat,lon,alt) that represents the camera GPS
     *                      coordinate when taking the capture
     * 
     * @return {coordinate: <local coordinate>,
     *          elevation: <the elevation>}
     *          representing the point
     */
    var getCorner = function(attitude, alpha, theta, coord) {
        var cameraLocal = groundModel.getLocalCoord(coord);
        // top right is maxX, maxY        

        var x = Math.tan(theta);
        var y = Math.tan(alpha);
        var direction = [x,y,-1];

        direction = Vector.normalize(direction);

        direction = _rotateCamera(attitude, direction);

        var point = groundModel.intersectPoint(cameraLocal, direction);
        if (!point) {
            return null;
        }
        
        var groundElevation = groundModel.getGroundElevation(coord);
        return {
            'coordinate': point,
            'elevation': groundElevation
        }
    };
    

    /**
     * Apply the camera rotation to the ray vector
     * rotation is applied in z, y, x in that order
     */
    var _rotateCamera = function(attitude, vector) {
        vector = Vector.rotateInZ(attitude[0], vector);
        vector = Vector.rotateInY(attitude[1], vector);
        vector = Vector.rotateInX(attitude[2], vector);
 
        return vector;
    };

    /**
     * Return the module with all the public function
     */
    return {
        'setGroundModel': setGroundModel,
        'makePolygon': makePolygon,
        'getViewAngle': getViewAngle,
        'getCenter': getCenter,
        'getCorner': getCorner
    };

}());

module.exports = POLYGON;
