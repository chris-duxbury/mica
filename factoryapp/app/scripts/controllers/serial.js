'use strict';

/**
 * @ngdoc function
 * @name focusClientApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the focusClientApp
 */
angular.module('focusClientApp')
  .controller('SerialCtrl', ['$scope', '$http', function($scope, $http) {
        $scope.serial_pending = false;
        $scope.serial = undefined;
        $scope.alert_message = undefined;
        $scope.factory_key = "";
        var originalSerial = undefined;

        $http.get('/serial/').success(function(data) {
            $scope.serial = data['camera_serial_number'];
            originalSerial = $scope.serial
        });
        $scope.setSerial = function() {
            $scope.alert_message = undefined;
            var sendObj = {};
            sendObj['camera_serial_number'] = $scope.serial;
            sendObj['key'] = $scope.factory_key;
            $scope.serial_pending = true;
            $http({
                    method : 'POST',
                    url    : '/serial',
                    data   : $.param(sendObj),
                    headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
                }).success( function(data) {
                    $scope.serial_pending = false;
                    $scope.alert_message = "Successfully set camera serial number!";
                    console.log("Successfully set camera serial number");
                }).error( function(data) {
                    $scope.alert_message = "Failed to update camera serial number!";
                    console.log("Failed to update serial number");
                });
        };

        $scope.keyRequired = function() {
            if(originalSerial == "7654321" || originalSerial == "99999" || 
                typeof originalSerial === 'undefined') {
                return false;
            } else {
                return true;
            }
        }
    }])
