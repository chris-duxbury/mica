'use strict';

/**
 * @ngdoc overview
 * @name focusClientApp
 * @description
 * # focusClientApp
 *
 * Main module of the application.
 */
angular
  .module('focusClientApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/serial.html',
        controller: 'SerialCtrl'
      })
      .when('/serial', {
        templateUrl: 'views/serial.html',
        controller: 'SerialCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
