'use strict';

/* Controllers */

var attrs = [
        'operating_alt',
        'auto_cap_mode',
        'operating_alt_tolerance',
        'overlap_cross_track',
        'overlap_along_track',
        'timer_period',
        'ext_trigger_mode',
        'pwm_trigger_threshold',
        'enable_man_exposure'
    ];

var ms_module = angular.module('myApp.controllers', []).
    controller('ConfigCtrl', ['$http', '$timeout', '$scope', 'Config', 'Status', 'Serial', 'PanelStatus',
    function($http, $timeout, $scope, Config, Status, Serial, PanelStatus) {
        $scope.status = {}
        Config.getConfig($scope, function(data) {
            // Copy the form elements to a local data structure
            $scope.config_form = {}
            attrs.forEach(function(attr) {
                $scope.config_form[attr] = $scope.config[attr];
            })
        });
        Status.getStatus($scope);

        // For panel expansion
        $scope.expand = PanelStatus.expanded;
        PanelStatus.dirtyForm.basicConfig = function() {
            return $scope.form.$dirty;
        };
        
          $scope.expandPanel = function() {
            if (PanelStatus.dirtyForm.advanceConfig()) {
                alert('Save your advance configuration first!');
            } else {
                $scope.expand.advanceConfig = false;
                $scope.expand.basicConfig = !$scope.expand.basicConfig;
            }
          };

        // Update altitude feet box when meters box changes
        $scope.$watch(function () {
            if($scope.config_form && 'operating_alt' in $scope.config_form) {
                return $scope.config_form['operating_alt'];
            } else {
                return 0;
            }
        }, function(newValue, oldValue) { 
            $scope.operating_alt_feet = newValue * 3.28084;
        })

        // Update altitude feet box when meters box changes
        $scope.$watch(function () {
            if($scope.config_form && 'operating_alt_tolerance' in $scope.config_form) {
                return $scope.config_form['operating_alt_tolerance'];
            } else {
                return 0;
            }
        }, function(newValue, oldValue) { 
            $scope.operating_alt_tolerance_feet = newValue * 3.28084;
        })
        
        $scope.toInt = function(val) {
            return parseInt(val,10);
        };
        
        $scope.overlap_options = {};
        for(var i = 35; i < 91; i+=5){
          $scope.overlap_options[i] = "" + i + "%";
        };

        $scope.pending = {};
        
        $scope.auto_cap_status_msg = function() {
            if ($scope.status.auto_cap_active) {
                return "Running";
            } else {
                return "Not Running";
            }
        }
        
        $scope.processForm = function() {
            
            if ($scope.form.$invalid) {
                $scope.form_error = "Invalid config values present. Cannot update configuration."
            } else {
                $scope.form_error = undefined;
                
                $http({
                    method  : 'POST',
                    url     : 'config',
                    data    : $.param($scope.config_form),  // pass in data as strings
                    headers : { 'Content-Type': 'application/x-www-form-urlencoded' }  // set the headers so angular passing info as form data (not request payload)
                })
                .success(function(data) {
                    attrs.forEach(function(attr) {
                        $scope.config[attr] = $scope.config_form[attr];
                    })
                    $scope.form.$setPristine();
                });
            }
        }

        $scope.start_autocap = function() {
            $http.get('/timer?enable=true').success(function(data) {
                $scope.status['auto_cap_active'] = data['auto_cap_active'];
            }).error(function() {
                console.log("Failed to enable auto capture");
            });
        };
        $scope.stop_autocap = function() {
            $http.get('/timer?enable=false').success(function(data) {
                $scope.status['auto_cap_active'] = data['auto_cap_active'];
            }).error(function() {
                console.log("Failed to disable auto capture");
            });
        };
        
        $scope.auto_cap_status = "Status Unknown";

    }])
    
    .controller('StatusCtrl', ['$scope', 'Status', '$http', 'Config', 'Warnings', function($scope, Status, $http, Config, Warnings) {
        
        $scope.status = {};
        $scope.config = {};
        $scope.dls_attitude = {};
        
        Status.getStatus($scope);
        Config.getConfig($scope);
        Warnings.getWarnings($scope);
        $scope.sw_version = $http.get('/version').success(
            function(data) {
                $scope.serial = data['serial']
            }
        );
        $http.get('networkstatus')
            .success(function(data){
              $scope.network = data.network_map;
          });

        var request_pending = false;
        
        var updateStatus = function() {
            if (!request_pending) {
                request_pending = true;
                $http({
                        method: 'GET',
                        url : '/dls_imu'
                     }).success( function(data){
                        $scope.dls_attitude = data;
                     });
                Status.getStatus($scope, function() { request_pending = false; });
                $http.get('networkstatus')
                    .success(function(data){
                    $scope.network = data.network_map;
                });
                Warnings.getWarnings($scope);
            }
        };
        
        $scope.batteryWarn = function() {
            if(typeof($scope.status.voltage_warn) == 'undefined') {
                return $scope.status.bus_volts < 3.5;
            } else {
                return $scope.status.voltage_warn;
            
            }
        };
        
        var myInterval = setInterval(updateStatus, 1000);
        $scope.$on("$destroy", function() {
            clearInterval(myInterval);
        });
    }])
    
    .controller('LiveViewCtrl', ['$scope', '$timeout', '$http', 'LiveViewImage', 'CameraInfo',
                               function($scope, $timeout, $http, LiveViewImage, CameraInfo) {
                                
        $scope.viewTypePending = false;
        
        $scope.camera_info = {};
        CameraInfo.getCameraInfo($scope);
        
        $http.get('/config/').success(function(data) {
            $scope.config = data;
        });
        
        function find_closest_exposure(exposure, options) {
            var i;
            for (i=0; i<options.length; i++) {
                if (options[i] > exposure ) {
                    break;
                }
            }
            if(i == 0) {
                return options[i];
            } else if (i == options.length) {
                return options[i-1];
            } else {
                var d1 = Math.abs(exposure - options[i-1]);
                var d2 = Math.abs(exposure - options[i]);
                if (d1 < d2) {
                    return options[i-1];
                } else {
                    return options[i];
                }
            }
        }
        
        $scope.exp_options = [66, 100, 140, 190, 250, 330, 440, 590, 780, 1000, 1400, 1900, 2500, 3300, 4400, 5900, 7800, 10400, 13800, 18400, 24500 ];
        $scope.exp_gain_options = [1, 2, 4, 8];
        $scope.exp_settings = [];//Initially empty. Dynamically populated

        $http.get('/lastexposure').success(function(data) {
            $scope.exp_settings = [];
            for(var key in data){
                var img_num_match = key.match(/(\d+)/);
                if(img_num_match){
                    var img_num = parseInt(img_num_match[0]);
                    var img_idx = img_num - 1;
                    if('undefined' === typeof $scope.exp_settings[img_idx]){
                        $scope.exp_settings[img_idx] = { "band_number" : img_num };
                        $scope.exp_settings[img_idx].update = function(){

                            sendValue(this);
                        };
                    }

                    if(key.match("gain")){
                        $scope.exp_settings[img_idx].gain = data[key].toString();
                    }
                    else if(key.match("exposure")){
                        $scope.exp_settings[img_idx].value = find_closest_exposure(data[key] * 1e3, $scope.exp_options).toString();
                    }
                    
                }
            }
        });
        
        function sendValue(exposure) {
            var sendObj = {};
            sendObj["exposure"+exposure.band_number] = exposure.value/1000.0; // Convert us to ms
            sendObj["gain"+exposure.band_number] = exposure.gain;
            $http({
                    method : 'POST',
                    url    : '/exposure',
                    data   : $.param(sendObj),
                    headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
                }).success( function(data) {
                    console.log(data);
                }).error( function(data) {
                    console.log("Failed to update exposure value");
                });
        }
        
        $scope.setStreaming = function(exposure) {
            var sendObj = {};
            sendObj["streaming_enable"] = $scope.config.streaming_enable;
            $http({
                    method : 'POST',
                    url    : '/config',
                    data   : $.param(sendObj),
                    headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
                }).success( function(data) {
                    console.log(data);
                }).error( function(data) {
                    console.log("Failed to update enable_streaming value");
                });
        };
        
        $scope.command_image_capture = function() {
            $http({
                method : 'POST',
                url    : '/capture?preview=true&anti_sat=true',
                data   : null
            }).success(function(data) {
                console.log(data);
            });
        };
        
        $scope.detect_panel_running = false;
        $scope.detect_panel_clicked = function() {
            if($scope.detect_panel_running){
                $http({
                    method : 'POST',
                    url    : '/detect_panel?abort_detect_panel=true',
                    data   : null
                }).success(function(data) {
                    console.log(data);
                    $scope.detect_panel_running = data['detect_panel'];
                });
             }
             else{
                 $http({
                     method : 'POST',
                     url    : '/capture?preview=true&anti_sat=true&detect_panel=true',
                     data   : null
                 }).success(function(data) {
                     console.log(data);
                 });
             }
        };
        
        $scope.setViewType = function(type) {
            $scope.viewTypePending = true;
            $http({
                method : 'POST',
                url    : '/config',
                data   : $.param({preview_band : type}),
                headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
            }).success( function(data) {
               $scope.viewTypePending = false;
               console.log(data);
            });
        };
    
        // Setup an interval to periodically refresh the JPEG, and disable
        // that interval when the controller is destroyed (i.e. a different
        // template is loaded)
        $scope.a = 1;
        var updateJpeg = function() {
            $http({
                method : 'GET',
                url    : '/jpeg_url'
            }).success(function(data) {
                $scope.a += 1;
                $scope.live_image = data;
            });
            $http({
                method : 'GET',
                url    : '/detect_panel'
            }).success(function(data) {
                $scope.detect_panel_running = data['detect_panel'];
            });
        };
        var myInterval = setInterval(updateJpeg, 750);
        $scope.$on("$destroy", function() {
            clearInterval(myInterval);
        });
    }])
    
   .controller('VersionCtrl', ['$scope', '$http', function($scope, $http) {
        $scope.sw_version = $http.get('/version').success(
            function(data) {
                $scope.sw_version = data['sw_version'];
                $scope.serial = data['serial']
            }
        );
    }])
    
    .controller('MiscCameraCtrl', ['$http', '$scope', function($http,$scope){
        $scope.miscCamExpand = false;
        $scope.reformat_response = "";
        $scope.reformat_response_type = "";
        
        $scope.ConfirmFormatStoragePrompt = function(){
        
            if(confirm("All data on the storage device will be permanently erased. Are you sure you want to continue?")){
               $scope.reformat_response = "Reformatting...";
               $scope.reformat_response_type = "inProgress";

               $http({
                  method  : 'POST',
                  url     : '/reformatstorage',
                  data    : {erase_all_data : true}
               }).then(
                        function(data){//Success
                           $scope.reformat_response = "Success!";
                           $scope.reformat_response_type = "success";
                        },
                        function(data){//Failure
                           $scope.reformat_response = "Reformat failed: " + data['message'];
                           $scope.reformat_response_type = "failure";
                        });
            }
            else{
               $scope.reformat_response = "";
               $scope.reformat_response_type = "";
            }
        };
    }])
    
    .controller('DlsCtrl', ['$http', '$scope', function($http,$scope){
        $scope.dlsInfoExpand = false;
    }])
    
    .controller('AdvancedCtrl', ['$http', '$scope', 'PanelStatus', 'CameraInfo',
                         function($http,   $scope,   PanelStatus,   CameraInfo){
      $scope.adv_config_form = {};
      $scope.adv_config_form["raw_format"] = "DNG";
      $scope.adv_config_form["enabled_bands_jpeg"] = 0;
      $scope.adv_config_form["enabled_bands_raw"] = 31;
      $scope.adv_config_form["network_mode"] = "main";
      $scope.adv_config_form["ip_address"] = "192.168.1.83";
      $scope.adv_config_form["ext_trigger_out_enable"] = false;
      $scope.adv_config_form["ext_trigger_out_pulse_high"] = true;
      $scope.adv_config_form["streaming_allowed"] = true;
      $scope.adv_config_form["pin_modes"] = {};
      $scope.cameras = [];
      $scope.network = [];
      $scope.pin_mux = {};
      $scope.pin_mux_function_selection_count = {};
      $http.get('/version').success(
            function(data) {
                $scope.serial = data['serial'];
      });
      $http.get('/ui_text').success(
            function(data) {
                $scope.ui_text = data;
      });
      $scope.camera_info = {};
      CameraInfo.getCameraInfo($scope,function() {
         var num_cams = 0;
         for(var k in $scope.camera_info){
            num_cams++;
         }
         for(var i=0;i<num_cams;i++){
            $scope.cameras[i] = {raw:true,jpeg:false};
         }
         
         $scope.camSetBits();
      });
      
      // For panel expansion
      $scope.expand = PanelStatus.expanded;
      PanelStatus.dirtyForm.advanceConfig = function() {
          return $scope.adv_form.$dirty;
      };
      $scope.expandPanel = function() {
        if (PanelStatus.dirtyForm.basicConfig()) {
            alert('Save your basic configuration first!');
        } else {
            $scope.expand.advanceConfig = !$scope.expand.advanceConfig;
            $scope.expand.basicConfig = false;
        }
      };

      $scope.camSelectBits = function(){
        $scope.adv_config_form["enabled_bands_jpeg"] = 0;
        $scope.adv_config_form["enabled_bands_raw"] = 0;
        for(var i=0;i<$scope.cameras.length;i++){
          $scope.adv_config_form["enabled_bands_jpeg"] |= ($scope.cameras[i].jpeg?1<<i:0);
          $scope.adv_config_form["enabled_bands_raw"] |= ($scope.cameras[i].raw?1<<i:0);
        }
      }
      
      $scope.camSetBits = function(){
        for(var i=0;i<$scope.cameras.length;i++){
          $scope.cameras[i].jpeg = ($scope.adv_config_form["enabled_bands_jpeg"] & (1<<i))?true:false;
          $scope.cameras[i].raw = ($scope.adv_config_form["enabled_bands_raw"] & (1<<i))?true:false;
        }
      }
      
      $scope.validatePinModes = function(){
        for(var fn in $scope.pin_mux['functions']){
          $scope.pin_mux_function_selection_count[fn] = 0;
        }
        Object.keys($scope.adv_config_form['pin_modes']).forEach(function(key,index){
          ++($scope.pin_mux_function_selection_count[$scope.adv_config_form['pin_modes'][key]]);
        });
        $scope.pin_mux_function_selection_count[0] = 0;//Disabled can be selected as many times as desired
        $scope.pin_mux_function_selection_invalid = false;
        var the_form = this.$parent.$parent.adv_form;
        for(var form_prop in the_form){
          if(the_form.hasOwnProperty(form_prop) && form_prop.includes("wrapper_form_")){
            var the_wrap = the_form[form_prop];
            for(var wrap_prop in the_wrap){
               if(the_wrap.hasOwnProperty(wrap_prop) && wrap_prop.includes("pin_mode_")){
                 var the_pin = the_wrap[wrap_prop];
                 if(1 < $scope.pin_mux_function_selection_count[wrap_prop.split("_")[3]]){
                   the_pin.$setValidity("duplicate",false);
                   $scope.pin_mux_function_selection_invalid = true;
                 }
                 else{
                   the_pin.$setValidity("duplicate",true);
                 }
               }
            }
          }
        }
      }

      $scope.processAdvForm = function() {
        if ($scope.adv_form.$invalid) {
          $scope.adv_form_error = "Invalid config values present. Cannot update configuration."
        }
        else {
          $scope.adv_form_error = undefined;
          
          $http({
            method  : 'POST',
            url     : 'config',
            data    : $scope.adv_config_form
          })
          .success(function(data) {
            $scope.populateFields(data);
            $scope.adv_form.$setPristine();
          })
          .error(function(){
            //handle errors?
          });
          
          $http.get('networkstatus')
            .success(function(data){
              $scope.network = data.network_map;
          });
          
          $http.get('pin_mux')
            .success(function(data){
              $scope.pin_mux = data;
          });
        }
      }

      $scope.populateFields = function(data){
        if(data.hasOwnProperty('raw_format')){
          $scope.adv_config_form['raw_format'] = data.raw_format;
        }
        if(data.hasOwnProperty('enabled_bands_raw')){
          $scope.adv_config_form['enabled_bands_raw'] = data.enabled_bands_raw;
        }
        if(data.hasOwnProperty('enabled_bands_jpeg')){
          $scope.adv_config_form['enabled_bands_jpeg'] = data.enabled_bands_jpeg;
        }
        if(data.hasOwnProperty('ip_address')){
          $scope.adv_config_form['ip_address'] = data.ip_address;
        }
        if(data.hasOwnProperty('network_mode')){
          $scope.adv_config_form['network_mode'] = data.network_mode;
        }
        if(data.hasOwnProperty('ext_trigger_out_enable')){
          $scope.adv_config_form['ext_trigger_out_enable'] = data.ext_trigger_out_enable;
        }
        if(data.hasOwnProperty('ext_trigger_out_pulse_high')){
          $scope.adv_config_form['ext_trigger_out_pulse_high'] = data.ext_trigger_out_pulse_high;
        }
        if(data.hasOwnProperty('streaming_allowed')){
          $scope.adv_config_form['streaming_allowed'] = data.streaming_allowed;
        }
        if(data.hasOwnProperty('audio_enable')){
          $scope.adv_config_form['audio_enable'] = data.audio_enable;
        }
        if(data.hasOwnProperty('pin_modes')){
          $scope.adv_config_form['pin_modes'] = data.pin_modes;
        }
      }

      //Run these functions to initialize properly
      $http.get('config')
      .success(function(data){
        $scope.populateFields(data);
        $scope.camSetBits();
      });

      $http.get('networkstatus')
      .success(function(data){
        $scope.network = data.network_map;
      });
      
      $http.get('pin_mux')
      .success(function(data){
        $scope.pin_mux = data;
      });
   }])
   
   .controller('MagCalCtrl', ['$http', '$scope', function($http,$scope){
      $scope.mag_cal = {state:"idle",sample_counts:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],required_counts:5,level_vector:[0,0,1],level_threshold_angle:0.5,message:"Mag Cal Not Running"};
      
      $scope.magCanvas = document.getElementById("magCanvas");
      $scope.magCanvas_wrapper = document.getElementById("canvasWrapper");
      $scope.magContext = $scope.magCanvas.getContext("2d");
      $scope.compassCanvas = document.getElementById("compassCanvas");
      $scope.compassCanvas_wrapper = document.getElementById("completed");
      $scope.compassContext = $scope.compassCanvas.getContext("2d");
      
      $scope.aircraft_img = new Image();
      
      var color = GetStyle(".u-bgGreen");
      $scope.green_color = color.substr(color.search(/rgb/i),color.search(/\)/i)-color.search(/rgb/i)+1);
      color = GetStyle(".u-bgDark");
      $scope.dark_color = color.substr(color.search(/rgb/i),color.search(/\)/i)-color.search(/rgb/i)+1);
      color = GetStyle(".u-bgLight");
      $scope.light_color = color.substr(color.search(/rgb/i),color.search(/\)/i)-color.search(/rgb/i)+1);
      color = GetStyle(".u-bgWhite");
      $scope.white_color = color.substr(color.search(/rgb/i),color.search(/\)/i)-color.search(/rgb/i)+1);
      
      $scope.h1El = document.getElementsByTagName("h1")[0];
      
      var ProcessData = function(){
         $http.get('/mag_cal')
            .success(function(data){
               $scope.mag_cal = data;
               switch($scope.mag_cal.state){
                  case "edge1":{$scope.aircraft_img.src="./icons/top_up.png";break;}
                  case "edge2":{$scope.aircraft_img.src="./icons/bottom_up.png";break;}
                  case "edge3":{$scope.aircraft_img.src="./icons/left_up.png";break;}
                  case "edge4":{$scope.aircraft_img.src="./icons/tail_up.png";break;}
                  case "edge5":{$scope.aircraft_img.src="./icons/right_up.png";break;}
                  case "succeeded"://fallthrough intended
                  case "edge6":{$scope.aircraft_img.src="./icons/nose_up.png";break;}
                  default:{break;}
               };
               DrawMagUI();
         });
         $http.get('/dls_imu')
            .success(function(data){
               $scope.yaw = data["yaw"];
               $scope.yaw_deg = (($scope.yaw * 180/Math.PI) + 360)%360;
               DrawCompassUI();
         });
      };
      
      $scope.StartMagCal = function(){
         var command = {"action":"start"};
         $http.post('/mag_cal',command)
            .success(function(data){
               $scope.mag_cal = data;
         }).error(function(data){alert("Failed! "+data)});
      };
      
      $scope.CancelMagCal = function(){
         var command = {"action":"cancel"};
         $http.post('/mag_cal',command)
            .success(function(data){
               $scope.mag_cal = data;
         });
      };
      
      var DrawMagUI = function(){
          var canvas_wrapper_style = getComputedStyle($scope.magCanvas_wrapper)
          
          if(canvas_wrapper_style.display === 'none'){
             return;//nothing for us to do if the element is hidden
          }
          if(typeof($scope.mag_cal.sample_counts) == "undefined" || $scope.mag_cal.sample_counts === null || $scope.mag_cal.sample_counts.length == 0){
             return;//nothing for us to do without samples to draw
          }

          // Resize canvas to be a "good fit" for the screen
          var canvas_width = parseFloat(canvas_wrapper_style.getPropertyValue('width'),10);
          if(window.innerHeight < window.innerWidth){
             var nav_height = parseFloat(getComputedStyle(document.getElementsByTagName('nav')[0]).getPropertyValue('height'),10);
             var footer_height = parseFloat(getComputedStyle(document.getElementById('canvasFooter')).getPropertyValue('height'),10);
             var height_mode_width = window.innerHeight - (nav_height + footer_height);
             canvas_width = Math.min(canvas_width,height_mode_width);
          }
          $scope.magCanvas.width = canvas_width;
          $scope.magCanvas.height = canvas_width;
          
          // Convenient shorthand
          var cvs = $scope.magCanvas;
          var ctx = $scope.magContext;

          // The center of the canvas
          var cx = cvs.width/2;
          var cy = cvs.height/2;

          // Various radii needed to draw all of the elements
          var wedgeOutsideRadius     = cx*0.95;
          var wedgeInsideRadius      = cx*0.70;
          var indicatorOutsideRadius = cx*0.65;
          var indicatorInsideRadius  = cx*0.50;
          var levelBubbleRadius      = cx*0.05;
          var levelBubbleMaxRadius   = indicatorInsideRadius - levelBubbleRadius*2;
          var levelCircleRadius      = (levelBubbleMaxRadius*Math.asin($scope.mag_cal.level_threshold_angle)) + levelBubbleRadius;
          var aircraftVerticalAlign  = levelCircleRadius*1.5;
          var aircraftSideLength     = indicatorInsideRadius-levelCircleRadius;

          // Clear the context
          ctx.clearRect(0, 0, cvs.width, cvs.height);
          
          // Draw desired vehicle orientation indicator
          var airplaneRenderWidth = aircraftSideLength;
          var airplaneRenderHeight = aircraftSideLength;
          if($scope.aircraft_img.height < $scope.aircraft_img.width){
             airplaneRenderHeight = aircraftSideLength*$scope.aircraft_img.height/$scope.aircraft_img.width;
          }
          else{
             airplaneRenderWidth = aircraftSideLength*$scope.aircraft_img.width/$scope.aircraft_img.height;
          }
          ctx.drawImage($scope.aircraft_img,cx-airplaneRenderWidth/2,cy+aircraftVerticalAlign,airplaneRenderWidth,airplaneRenderHeight);

          // Draw fixed level circle
          ctx.strokeStyle=$scope.dark_color;
          ctx.lineWidth=2;
          DrawCircle(ctx, cx, cy, levelCircleRadius);

          // Draw bubble
          var ax = $scope.mag_cal.level_vector[1] * levelBubbleMaxRadius;
          var ay = -$scope.mag_cal.level_vector[0] * levelBubbleMaxRadius;
          var az = $scope.mag_cal.level_vector[2] * levelBubbleMaxRadius;
          var am = Math.sqrt(ax*ax + ay*ay);
          var aa = Math.atan2(am,az);

          var bx = ax + cx; // bubble x
          var by = ay + cy; // bubble y
          
          ctx.lineWidth=0;
          var levelEnough = (aa < $scope.mag_cal.level_threshold_angle && az > 0);
          if (levelEnough){
              ctx.strokeStyle=$scope.green_color;
              ctx.fillStyle="black";
              DrawCircle(ctx, bx, by, levelBubbleRadius);
              ctx.fill();
          }
          else if(az < 0){
              ctx.strokeStyle="red";
              DrawX(ctx, cx + levelBubbleMaxRadius*Math.sin(Math.atan2(ax,ay)), cy + levelBubbleMaxRadius*Math.cos(Math.atan2(ax,ay)), levelBubbleRadius);
          }
          else{
              ctx.strokeStyle="red";
              ctx.fillStyle="red"
              DrawCircle(ctx, bx, by, levelBubbleRadius);
              ctx.fill();
          }

          // Draw current direction indicator
          ctx.lineWidth=5;
          DrawNav(ctx,cx,cy,indicatorInsideRadius,indicatorOutsideRadius, $scope.mag_cal.mag_angle, 10*Math.PI/180, 0.25);

          // Draw ring
          ctx.fillStyle="black"
          ctx.lineWidth=1;
          var numBuckets = $scope.mag_cal.sample_counts.length;
          var step = (Math.PI*2) / numBuckets;
          for(var i=0;i<numBuckets;i++){
              ctx.strokeStyle=$scope.light_color;
              DrawWedge(ctx,cx,cy,wedgeInsideRadius,wedgeOutsideRadius,i*step,(i*step)+step);

              if($scope.mag_cal.sample_counts[i] == 0){
                 ctx.strokeStyle="black";
                 ctx.fillStyle=$scope.white_color;
                 DrawWedge(ctx,cx,cy,wedgeInsideRadius,wedgeOutsideRadius,i*step,(i*step)+step);
                 ctx.fill();
              }
              else if($scope.mag_cal.sample_counts[i] < $scope.mag_cal.required_counts){
                 ctx.strokeStyle="black";
                 ctx.fillStyle=$scope.dark_color;
                 DrawWedge(ctx,cx,cy,wedgeInsideRadius,wedgeOutsideRadius,i*step,(i*step)+step);
                 ctx.fill();
              }
              else{
                 ctx.strokeStyle=$scope.light_color;
                 ctx.fillStyle=$scope.green_color;
                 DrawWedge(ctx,cx,cy,wedgeInsideRadius,wedgeOutsideRadius,i*step,(i*step)+step);
                 ctx.fill();
              }
          }
      };
      
      var DrawCompassUI = function(){
          var canvas_wrapper_style = getComputedStyle($scope.compassCanvas_wrapper)
          
          if(canvas_wrapper_style.display === 'none'){
             return;//nothing for us to do if the element is hidden
          }

          // Resize canvas to be a "good fit" for the screen
          var canvas_width = parseFloat(canvas_wrapper_style.getPropertyValue('width'),10);
          if(window.innerHeight < window.innerWidth){
             var nav_height = parseFloat(getComputedStyle(document.getElementsByTagName('nav')[0]).getPropertyValue('height'),10);
             var header_height = parseFloat(getComputedStyle(document.getElementById('compassHeader')).getPropertyValue('height'),10);
             var footer_height = parseFloat(getComputedStyle(document.getElementById('compassFooter')).getPropertyValue('height'),10);
             var height_mode_width = window.innerHeight - (nav_height + header_height + footer_height);
             canvas_width = Math.min(canvas_width,height_mode_width);
          }
          $scope.compassCanvas.width = canvas_width;
          $scope.compassCanvas.height = canvas_width;
          
          var h1_style = getComputedStyle($scope.h1El);
          var h1_font = h1_style.getPropertyValue('font-family');
          
          // Convenient shorthand
          var cvs = $scope.compassCanvas;
          var ctx = $scope.compassContext;

          // The center of the canvas
          var cx = cvs.width/2;
          var cy = cvs.height/2;

          // Various radii needed to draw all of the elements
          var outerRingRadius = cx*0.95;
          var innerRingRadius = cx*0.70;
          var indicatorOutsideRadius = cx*0.65;
          var indicatorInsideRadius  = cx*0.50;
          var middleRingRadius = (outerRingRadius-innerRingRadius)/2 + innerRingRadius;
          var textSize = (outerRingRadius-innerRingRadius) * 0.9;

          // Clear the context
          ctx.clearRect(0, 0, cvs.width, cvs.height);
          
          // Draw a bounding circles
          ctx.strokeStyle=$scope.dark_color;
          DrawCircle(ctx,cx,cy,innerRingRadius);
          DrawCircle(ctx,cx,cy,outerRingRadius);
          
          // Draw desired vehicle orientation indicator
          var aircraftSideLength = indicatorOutsideRadius*2;
          var airplaneRenderWidth = aircraftSideLength;
          var airplaneRenderHeight = aircraftSideLength;
          if($scope.aircraft_img.height < $scope.aircraft_img.width){
             airplaneRenderHeight = aircraftSideLength*$scope.aircraft_img.height/$scope.aircraft_img.width;
          }
          else{
             airplaneRenderWidth = aircraftSideLength*$scope.aircraft_img.width/$scope.aircraft_img.height;
          }
          ctx.save();
          ctx.translate(cx,cy);
          ctx.rotate($scope.yaw);
          ctx.drawImage($scope.aircraft_img,-airplaneRenderWidth/2,-airplaneRenderHeight/2,airplaneRenderWidth,airplaneRenderHeight);
          ctx.restore();
          
          // Draw current direction indicator
          ctx.lineWidth=5;
          ctx.strokeStyle=$scope.green_color;
          DrawNav(ctx,cx,cy,indicatorInsideRadius,indicatorOutsideRadius, $scope.yaw, 10*Math.PI/180, 0.25);
          
          // Draw compass rose headings
          ctx.font=textSize + "px " + h1_font;
          ctx.fillStyle="red";
          ctx.textAlign="center";
          ctx.textBaseline="middle";
          ctx.fillText("N",cx,cy-middleRingRadius);
          ctx.fillStyle="black";
          ctx.fillText("S",cx,cy+middleRingRadius);
          ctx.fillText("E",cx+middleRingRadius,cy);
          ctx.fillText("W",cx-middleRingRadius,cy);
      };

      function DrawCircle(ctx, x, y, r){
          ctx.beginPath();
          ctx.arc(x,y,r,0,2*Math.PI);
          ctx.stroke();
      };
      
      function DrawX(ctx, x, y, r){
          r=r/Math.sqrt(2);
          ctx.beginPath();
          ctx.moveTo(x-r,y-r);
          ctx.lineTo(x+r,y+r);
          ctx.moveTo(x-r,y+r);
          ctx.lineTo(x+r,y-r);
          ctx.stroke();
      }

      function DrawNav(ctx, x, y, r1, r2, a, w, d){
          var x1=x+r1*Math.sin(a+w);
          var y1=y-r1*Math.cos(a+w);
          var x2=x+r2*Math.sin(a);
          var y2=y-r2*Math.cos(a);
          var x3=x+r1*Math.sin(a-w);
          var y3=y-r1*Math.cos(a-w);
          var x4=x+(r2*d+r1*(1-d))*Math.sin(a);
          var y4=y-(r2*d+r1*(1-d))*Math.cos(a);
          ctx.beginPath();
          ctx.moveTo(x1,y1);
          ctx.lineTo(x2,y2);
          ctx.lineTo(x3,y3);
          ctx.lineTo(x4,y4);
          ctx.lineTo(x1,y1);
          ctx.lineTo(x2,y2); //This extra line gets us a pointy corner when rendered
          ctx.stroke();
      }

      // Draw a wedge at center x,y, radius r1 to r2, from angle a1 to a2 optionally filled
      // it's assumed that a2 is bigger than a1
      function DrawWedge(ctx, x, y, r1, r2, a1, a2){
          var x0=x+r1*Math.sin(a1);
          var y0=y-r1*Math.cos(a1);
          var x2=x+r2*Math.sin(a2);
          var y2=y-r2*Math.cos(a2);

          a1 -= Math.PI/2; 
          a2 -= Math.PI/2;
          ctx.beginPath();
          ctx.arc(x,y,r2,a2,a1,true); // outside arc (counter-clockwise)
          ctx.lineTo(x0,y0);          // line to outside arc
          ctx.arc(x,y,r1,a1,a2);      // inside arc (clockwise)
          ctx.lineTo(x2,y2);          // line to inside arc

          ctx.stroke();
      }
      
      function GetStyle(className_) {
         var styleSheets = window.document.styleSheets;
         var styleSheetsLength = styleSheets.length;
         for(var i = 0; i < styleSheetsLength; i++){
            var classes = styleSheets[i].rules || styleSheets[i].cssRules;
            if (!classes)
               continue;
            var classesLength = classes.length;
            for (var x = 0; x < classesLength; x++) {
               if (classes[x].selectorText == className_){
                  var ret;
                  if(classes[x].cssText){
                     ret = classes[x].cssText;
                  }
                  else {
                     ret = classes[x].style.cssText;
                  }

                  if(ret.indexOf(classes[x].selectorText) == -1){
                     ret = classes[x].selectorText + "{" + ret + "}";
                  }
                  return ret;
               }
            }
         }
      }

      var myInterval = setInterval(ProcessData, 100);
      $scope.$on("$destroy", function() {
         clearInterval(myInterval);
      });
   }])
   
   .controller('FirmwareCtrl', ['$http', '$scope', function($http,$scope){
      $scope.upload_progress = 0;
      $scope.form = document.getElementById("upload_form");
      $scope.upload_state = "selecting";
      $scope.sd_files = {};
      $scope.selected_file = "";
      
      $http.get('files')
      .success(function(data){
         $scope.sd_files = data.files;
         for(var i=0;i<$scope.sd_files.length;){
            var file=$scope.sd_files[i];
            if(file.name.indexOf('.bin') == file.name.length-4){
               ++i;
            }
            else{
               $scope.sd_files.splice(i,1);
            }
         }
         $scope.sd_files.sort(function(a,b){return a.name > b.name;});
         if(0 < $scope.sd_files.length){
            $scope.selected_file = $scope.sd_files[0].name;
         }
      });
      
      $scope.SelectBinary = function(){
         if($scope.form.file_select.value == "upload"){
            $scope.UploadFile();
         }
         else{
            $scope.UseSdBinary($scope.form.file_select.value);
         }
      }
      
      $scope.UseSdBinary = function(filename){
         var xhr = new XMLHttpRequest();
         
         xhr.onreadystatechange = function(x){
            if(xhr.readyState == 4){
               if(xhr.status == 200){
                  $scope.$apply($scope.upload_state = "succeeded");
               }
               else{
                  $scope.$apply($scope.upload_state = "failed");
               }
            }
            else{
               $scope.upload_state = "pending";//don't apply - this case is exercised in the initial button press apply phase
            }
         };//onreadystatechange
         
         xhr.open($scope.form.method, $scope.form.action, true);
         xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
         xhr.send("media_name="+$scope.form.file_select.value);
      }
      
      $scope.UploadFile = function(){
         $scope.upload_progress = 0;
         var xhr = new XMLHttpRequest();
         if(xhr.upload){//make sure the function exists - it doesn't on older browsers
            xhr.upload.addEventListener("progress", function(prog){
                  $scope.$apply($scope.upload_progress = 100*((prog.loaded / prog.total)));
                  if($scope.upload_progress == 100){
                     $scope.$apply($scope.upload_state="pending");
                  }
               },
               false);
         }
         xhr.onreadystatechange = function(x){
            if(xhr.readyState == 4){
               if(xhr.status == 200){
                  $scope.$apply($scope.upload_state = "succeeded");
               }
               else{
                  $scope.$apply($scope.upload_state = "failed");
               }
            }
            else{
               $scope.upload_state = "uploading";//don't apply - this case is exercised in the initial button press apply phase
            }
         };//onreadystatechange
         
         xhr.open($scope.form.method, $scope.form.action, true);
         var form_data = new FormData();
         form_data.append("file",$scope.form.upload_file.files[0]);
         xhr.send(form_data);
      };//UploadFile
   }]);

