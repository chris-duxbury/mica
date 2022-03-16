var appServices = angular.module('focusClientApp.services', ['ngResource']);

appServices.factory('Serial', ['$resource',
    function($resource){
    return $resource('serial/', {}, {
    query: {method:'GET'}
    });
}]);