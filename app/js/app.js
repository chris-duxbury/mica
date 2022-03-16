'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', [
  'ngRoute',
  'ngAnimate',
  'angularSpinner',
  'smoothScroll',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'myApp.controllers'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/status', {templateUrl: 'partials/home.html', controller: 'StatusCtrl'});
  $routeProvider.when('/config', {templateUrl: 'partials/config.html'});
  $routeProvider.when('/live_view', {templateUrl: 'partials/camera.html', controller: 'LiveViewCtrl'});
  $routeProvider.when('/map', {templateUrl: 'partials/map.html'});
  $routeProvider.when('/magcal', {templateUrl: 'partials/magcal.html'});
  $routeProvider.when('/firmware', {templateUrl: 'partials/firmware.html'});
  $routeProvider.otherwise({redirectTo: '/status'});
}]).
run(['$rootScope', '$location', function($rootScope, $location){
   var path = function() { return $location.path();};
   $rootScope.$watch(path, function(newVal, oldVal){
     $rootScope.activetab = newVal;
   });
}]).
// Configure the default style of loading spinner
config(['usSpinnerConfigProvider', function (usSpinnerConfigProvider) {
  // mainly used for loading spinner when rendering the coverage image
  var defaultSpinner = {
                          radius:40, 
                          width:20, 
                          length: 56,
                          position: 'absolute', 
                          speed: 0.5, 
                          color: '#00b2ff', 
                          opacity: 0.05
                        };
  usSpinnerConfigProvider.setDefaults(defaultSpinner);
}]);
