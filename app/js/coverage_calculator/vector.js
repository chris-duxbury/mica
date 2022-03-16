"use strict";

var VECTOR = (function() {

    var crossProduct = function(vecU, vecV) {
        var x = (vecU[1]*vecV[2]) - (vecU[2]*vecV[1]);
        var y = -(vecU[0]*vecV[2]) + (vecU[2]*vecV[0]);
        var z = (vecU[0]*vecV[1]) - (vecU[1]*vecV[0]);
        return [x,y,z];
    };

    var dotProduct = function(vecU, vecV) {
        return (vecU[0]*vecV[0]) + (vecU[1]*vecV[1]) +
                        (vecU[2]*vecV[2]);
    };

    // Add vecU + scale * vecV
    var add = function(vecU, vecV, scale) {
        return [ vecU[0] + scale * vecV[0],
                 vecU[1] + scale * vecV[1],
                 vecU[2] + scale * vecV[2] ];
    };

    var rotateInX = function(omega, vector) {
        omega *= Math.PI / 180;
        var y = vector[1] * Math.cos(omega) - vector[2] * Math.sin(omega);
        var z = vector[1] * Math.sin(omega) + vector[2] * Math.cos(omega);
        return [vector[0], y, z];
    };

    var rotateInY = function(phi, vector) {
        phi *= Math.PI / 180;
        var x = vector[0] * Math.cos(phi) + vector[2] * Math.sin(phi);
        var z = - vector[0] * Math.sin(phi) + vector[2] * Math.cos(phi);
        return [x, vector[1], z];
    };

    var rotateInZ = function(kappa, vector) {
        kappa *= Math.PI / 180;
        var x = vector[0] * Math.cos(kappa) - vector[1] * Math.sin(kappa);
        var y = vector[0] * Math.sin(kappa) + vector[1] * Math.cos(kappa);
        return [x, y, vector[2]];
    };

    var normalize = function(vector) {
        var l = length(vector);
        return add([0,0,0], vector, 1/l);
    };

    var length = function(vector) {
        return Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1] + vector[2] * vector[2]);
    };

    return {
        'crossProduct': crossProduct,
        'dotProduct': dotProduct,
        'add': add,
        'length': length,
        'normalize': normalize,
        'rotateInZ': rotateInZ,
        'rotateInX': rotateInX,
        'rotateInY': rotateInY
    };

}());

module.exports = VECTOR;