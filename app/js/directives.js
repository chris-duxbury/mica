'use strict';

/* Directives */


var app = angular.module('myApp.directives', []);
app.directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }]);
  
  
var FLOAT_REGEXP = /^\-?\d+((\.|\,)\d+)?$/;
app.directive('smartFloat', function() {
  return {
    require: 'ngModel',
    link: function(scope, elm, attrs, ctrl) {
      var min = -Infinity;
      var max = Infinity;
      if (attrs.min) {
        min = attrs.min;
      }
      if (attrs.max) {
        max = attrs.max;
      }
      
      ctrl.$parsers.unshift(function(viewValue) {
        if (FLOAT_REGEXP.test(viewValue)) {
          ctrl.$setValidity('float', true);
          var x = parseFloat(viewValue.replace(',', '.'));
        } else {
          ctrl.$setValidity('float', false);
          return undefined;
        }
        if (x < min) {
          ctrl.$setValidity('range', false);
          return undefined;
        } else if (x > max) {
          ctrl.$setValidity('range', false);
          return undefined;
        } else {
          ctrl.$setValidity('range', true);
        }
        return x;
      });
    }
  };
})

.directive('ipValidation', function() {
  var IP_REGEXP = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  return {
    require: 'ngModel',
    restrict: '',
    link: function(scope, elm, attrs, model) {
      if (model) {
        model.$validators.ip_address = function(modelValue) {
          return (!model.$isEmpty(modelValue)) //can't be an IP adddress if it's empty
                  && (modelValue != "0.0.0.0")
                  && (modelValue != "255.255.255.255")
                  && IP_REGEXP.test(modelValue);
        };
      }
    }
  };
});
