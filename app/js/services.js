'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
var ms5Services = angular.module('myApp.services', ['ngResource']).
  value('version', '0.1');

ms5Services.factory('Status', ['$http',
    function($http) {
        return {
            getStatus: function($scope, callback) {
                $http.get('/status/').success(function(data) {
                    $scope.status = data;
                    
                    if (typeof callback === "function") {
                        callback();
                    }
                }).error(function() {
                    callback();    
                });
            }
        };
    }
]);


ms5Services.factory('Warnings', ['$http',
    function($http) {
        return {
            getWarnings: function($scope, callback) {
                $http.get('/warnings/').success(function(data) {
                    $scope.warnings = data;
                    
                    if (typeof callback === "function") {
                        callback();
                    }
                }).error(function() {
                    callback();
                });
            }
        };
    }
]);

ms5Services.factory('Serial', ['$resource',
    function($resource){
    return $resource('serial/', {}, {
    query: {method:'GET'}
    });
}]);

ms5Services.factory('LiveViewImage', ['$resource',
    function($resource) {
        return $resource('/jpeg_url', {}, { query: {method: 'GET', params: {}, isArray: false }} );
    }]
);

ms5Services.factory('testservice', ['$scope', function($scope) {
    return function() { $scope.test2 = "test2"; };
}]);

ms5Services.factory('Config', ['$http', '$timeout',
    function($http, $timeout) {
        return {
            getConfig: function($scope, success) {
                $scope.config = {
                    'operating_alt' : 100
                }
                $http.get('/config/').success(function(data) {
                    data.timer_period = Math.round(data.timer_period*100)/100
                    $scope.config = data;
                    if(success) {
                        success(data)
                    }
                })
            },
            changeField: function($scope, field) {
                var params = {}
                params[field] = $scope.config[field];
                console.log(params);
                $http({
                    method  : 'POST',
                    url     : '/config/',
                    data    : $.param(params),
                    headers : {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
                }).success( function(data) {
                    $scope.pending[field] = false;
                }).error( function(data) {
                    // Try again later if it fails
                    $timeout(changeField, 2000);
                })
            }
            
        }
    }]);

ms5Services.factory('CameraInfo', ['$http',
    function($http) {
        return {
            getCameraInfo: function($scope, callback) {
                $http.get('/camera_info').success(function(data) {
                    $scope.camera_info = data;
                    
                    if (typeof callback === "function") {
                        callback();
                    }
                }).error(function() {
                    callback();
                });
            }
        };
    }
]);

ms5Services.factory('PanelStatus', function() {
    return {
        'expanded': {
            'basicConfig': true,
            'advanceConfig': false
        },
        'dirtyForm': {
            'basicConfig': false,
            'advanceConfig': false
        }
    };
})

