/*
 * This module handle the conversion from polygons data into
 * heatmap data
*/
"use strict";

var OVERLAP = (function() {
    var Vector = require('./vector.js');

    var MAX_PIXEL = 1e4;
    var DELAY_TIME = 5;
    var PIXEL_EPSILON = 0.5;
    var MAX_POLYGON_PER_ITER = 50;
    var ROUND = 1e8;


    var polygonsPerIter;

    /**
     * Get the bounding box that capture all the polygons inside
     */
    var getBoundingBox = function(polys) {
        var boxTop = Number.NEGATIVE_INFINITY;
        var boxBottom = Number.POSITIVE_INFINITY;
        var boxRight = Number.NEGATIVE_INFINITY;
        var boxLeft = Number.POSITIVE_INFINITY;

        for (var i = 0; i < polys.length; i++) {
            var corners = polys[i].fourPoints;
            
            for (var j = 0; j < corners.length; j++) {
                var point = corners[j].coordinate;

                boxTop = (point[1] > boxTop) ? point[1] : boxTop;
                boxBottom = (point[1] < boxBottom) ? point[1] : boxBottom;
                boxRight = (point[0] > boxRight) ? point[0] : boxRight;
                boxLeft = (point[0] < boxLeft) ? point[0] : boxLeft;
            }
        }

        return {
            'top': Math.ceil(boxTop), 'right': Math.ceil(boxRight),
            'bottom':Math.floor(boxBottom), 'left':Math.floor(boxLeft)
        };
    };

    /**
     * Build the overlap map that show how many polygons
     * intersect in a pixel
     *
     * This function will call onFinishFn with the overlap map data
     * (an object of {'map', 'max'}) as an argument, and 'onFinishArgs'
     * as the second argument (onFinishArgs won't be modified unless there is an error).
     * An error message will be pushed into onFinishArgs
     *  updateDisplayFn is an optional argument if a visual progess is desired.
     *  updateDisplayFn should take the curent percent progress
     *
     * NOTE:
     * - Overlap map data array starts at the lower left, reads to the right
     *   and go up accross rows
     */
    var getOverlapMap = function(unit, polygons, onFinishFn, onFinishArgs, updateDisplayFn) {

        // Using ray tracing technique.
        // The coverage image is flat. So assume it lies in the x-y plane.
        // For each grid/pixel, send a ray straight down to the middle (-z direction)
        // Check how many polygons this ray intersect
        // polygons will be flattened/projected to x-y plane

        if (!updateDisplayFn) {
            // empty fn
            updateDisplayFn = function(percent) {};
        }

        var boundingBox = getBoundingBox(polygons);
        var bottom = boundingBox.bottom, left = boundingBox.left;
        // Expand the top and right so that it becomes a multiple of unit
        boundingBox.top = Math.ceil((boundingBox.top * ROUND - bottom * ROUND) / unit / ROUND);
        boundingBox.top = (ROUND * boundingBox.top * unit + ROUND * bottom) / ROUND;
        
        boundingBox.right = Math.ceil((boundingBox.right * ROUND - left * ROUND) / unit / ROUND);
        boundingBox.right = (ROUND * boundingBox.right * unit + ROUND * left) / ROUND;
  
        var top = boundingBox.top;
        var right =  boundingBox.right;
      
        // if the number of pixel for one side is bigger than
        // MAX_PIXEL, don't draw
        if ((right - left) > unit * MAX_PIXEL || (top - bottom) > unit * MAX_PIXEL) {
            var message = "The output image is too large. In order to generate a coverage map,\n"
            message += " please only select flights which are close to one another, and make sure\n"
            message += " that the AGL of the flight is correctly set";
            onFinishArgs.push(message);
            onFinishFn(null, onFinishArgs);
        } else {

            var overlapMapData = _initMapData(boundingBox, unit);

            // divided by 100 so that each iteration is 1%
            polygonsPerIter = Math.min(Math.ceil(polygons.length / 100), MAX_POLYGON_PER_ITER);
            var coverageData = [unit, boundingBox, polygons];

            // iterate through each polygon
            _oneIteration(0, overlapMapData, coverageData, onFinishFn, onFinishArgs, updateDisplayFn);
        }      
    };

    // Initialize map data to all zeros
    var _initMapData = function(boundingBox, unit) {
        var bottom = boundingBox.bottom, top = boundingBox.top;
        var left = boundingBox.left, right = boundingBox.right;
   
        var overlapMap = [];
        // initialize heatmap to all 0
        for (var r = bottom; r < top; r += unit) {
            var rowmap = [];
            for (var c = left; c < right; c += unit) {
                rowmap.push(0);
            }
            overlapMap.push(rowmap);
        }

        return { 'map': overlapMap, 'max':0 };

    }

    /**
     * Check if a point is in polygon
     * 
     * Note: the polygon will be projected into the x-y plane, dropping
     * z coordinate
     */
    var isInPolygon = function(point, poly) {
        var corners = poly.fourPoints;
        // bottomleft, bottomright, topright
        var ABC = [corners[2].coordinate,
                   corners[1].coordinate,
                   corners[0].coordinate];
        // bottomleft, topright, topleft
        var ACD = [corners[2].coordinate,
                   corners[0].coordinate,
                   corners[3].coordinate];

        return (_isInTriangle(point, ABC) || _isInTriangle(point, ACD));
    };


    /**
     * Iterate through some smaller number of polygons and check the intersection
     */
    function _oneIteration(i, overlapMapData, coverageData, onFinishFn, onFinishArgs, updateDisplayFn) {
        var unit = coverageData[0];
        var boundingBox = coverageData[1];
        var polygons = coverageData[2];

           
        if (i < polygons.length) {
            // go some number of polygons
            for (var x = 0; x < polygonsPerIter && (i+x) < polygons.length; x++) {
                var tempI = i + x;
                // check each for intersection
                overlapMapData =
                        _onePolygonIntersection(polygons[tempI], overlapMapData, unit, boundingBox);
            }    

            var count = i + x;

            setTimeout(function() {
                var cur_percent = Math.round(count*100/polygons.length);
                updateDisplayFn(cur_percent);
                _oneIteration(count, overlapMapData, coverageData, onFinishFn, onFinishArgs,updateDisplayFn);
            }, DELAY_TIME);
        }
        else {
            onFinishFn(overlapMapData, onFinishArgs);
        }

    }

    /** Check the intersection in one polygon */
    function _onePolygonIntersection(polygon, overlapMapData, unit, coverageBoundingBox) {

        var bottom = coverageBoundingBox.bottom, top = coverageBoundingBox.top;
        var left = coverageBoundingBox.left, right = coverageBoundingBox.right;

        var polygonBox = getBoundingBox([polygon]);
        if (polygonBox.top - polygonBox.bottom === 0 || polygonBox.right - polygonBox.left === 0) { // zero area polygon
            return overlapMapData; // no update
        }
        // expand polygonBox so that it is aligned with the coverage bounding box
        // and evenly divided by 'unit'
        polygonBox.left = Math.floor((polygonBox.left * ROUND - left * ROUND) / unit / ROUND);
        polygonBox.left = (ROUND * polygonBox.left * unit + ROUND * left) / ROUND;
        polygonBox.bottom = Math.floor((polygonBox.bottom * ROUND - bottom * ROUND) / unit / ROUND);
        polygonBox.bottom = (ROUND * polygonBox.bottom * unit + ROUND * bottom) / ROUND;
        // polygonBox.right = Math.ceil((polygonBox.right - left) / unit) * unit + left;
        // polygonBox.top = Math.ceil((polygonBox.top - bottom) / unit) * unit + bottom;

        var rowIdx = Math.round((polygonBox.bottom * ROUND - bottom * ROUND) / unit / ROUND);
        var startColIdx = Math.round((polygonBox.left * ROUND - left * ROUND) / unit / ROUND);

        for (var r = polygonBox.bottom; r < polygonBox.top; r += unit) {
            // var rowIdx = Math.round((r - bottom) / unit);
            var rowmap = overlapMapData.map[rowIdx];

            var colIdx = startColIdx;
            for (var c = polygonBox.left; c < polygonBox.right; c += unit) {
                // var colIdx = Math.round((c - left) / unit);
                
                var p = _getPoint(unit, r, c);

                if (isInPolygon(p, polygon)) {
                   rowmap[colIdx]++;
                }

                if (rowmap[colIdx] > overlapMapData.max) {
                    overlapMapData.max = rowmap[colIdx];
                }

                colIdx++;
            }

            rowIdx++;
        }

        return overlapMapData;
    }

    // Return the middle point of a unit square at row,col
    var _getPoint = function(unit, row, col) {
        return [(col*ROUND + unit *ROUND * 0.5) / ROUND,
                (row*ROUND + unit *ROUND * 0.5) / ROUND];
    };

    /**
     * is in triangle
     * triangle --> array of three points
     * the normal follow these three points in the order given in the array
     */
    var _isInTriangle = function(point, triangle) {
        var A = triangle[0];
        var B = triangle[1];
        var C = triangle[2];

        var AB = [(B[0]-A[0]), (B[1]-A[1]), 0];
        var BC = [(C[0]-B[0]), (C[1]-B[1]), 0];

        var normal = Vector.crossProduct(AB, BC);
        if (normal[0] === 0 && normal[1] === 0 && normal[2] === 0) {
            return false;
        }

        var AP = [(point[0]-A[0]), (point[1]-A[1]), 0];
        if (Vector.dotProduct(Vector.crossProduct(AB,AP), normal) < 0) {
            return false;
        }

        var BP = [(point[0]-B[0]), (point[1]-B[1]), 0];
        if (Vector.dotProduct(Vector.crossProduct(BC,BP), normal) < 0) {
            return false;
        }

        var CA = [(A[0]-C[0]), (A[1]-C[1]), 0];
        var CP = [(point[0]-C[0]), (point[1]-C[1]), 0];
        if (Vector.dotProduct(Vector.crossProduct(CA,CP), normal) < 0) {
            return false;
        }

        return true;
    };
   
    /**
     * Return this OVERLAP_CALCULATOR module
     */
    return {
        'getBoundingBox': getBoundingBox,
        'isInPolygon': isInPolygon,
        'getOverlapMap': getOverlapMap
    };
    
}());


module.exports = OVERLAP;
