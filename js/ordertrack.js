var firebaseUrl = "http://logbasedev.firebaseio.com/";
var tripurl = 'http://stick-read-dev.logbase.io/api/';

myApp.controller("ordertrack",['$http', '$q', '$window', '$rootScope', '$scope', '$compile', 'uiGmapGoogleMapApi', 'uiGmapIsReady', 
function($http, $q, $window, $rootScope, $scope, $compile, uiGmapGoogleMapApi, uiGmapIsReady) {
   	var vm = this;
   	var infowindow, device, token, accountId, deviceinfo, address;
   	var livedataref = null;
	var flightPlanCoordinates = [];
	var flightPath = null;
	var starttime = null;
	var endtime = null;
	var dest = null;
	vm.mapinstance = null;
	vm.status = null;
	vm.statusText = "Placed";
	vm.isstatusclicked = false;
	vm.showorhideStatus = showorhideStatus;
   	vm.marker = null;
   	vm.showmaps = false;
   	vm.map = { 
   		center: {latitude:11.0168, longitude:76.9558},
    	zoom: 14 
   	};
    vm.mapOptions = {
   		mapTypeId : google.maps.MapTypeId.ROADMAP,
   		disableDefaultUI : true,
   		scrollwheel: true
    };
    vm.orderdetails = null;
    vm.setMap = setGoogleMaps;

	activate();

	function activate() {
		vm.isdesktop = IsDesktop();
		vm.durarion = null;

		token = getParameterByName('token');
		
		vm.marker = {
		    id: 1,
		    coords: null,
	     	options: { 
	     		labelAnchor: '40 -10',
	     		draggable: false
	     	}
 		}

		vm.startmarker = {
            id: 5,
            options: { 
                draggable: false, 
                icon: 'img/marker-GREEN-DOT.png',
            }
        };

        vm.endmarker = {
        	id:10,
            options: { 
                draggable: false, 
                icon: 'img/red-marker.png',
            }
        }

		if(token != null && token != undefined && token != "" && token.split("_").length == 3) {
		   	vm.haserror = false;
			checkToken();
		}
		else {
			vm.haserror = true;
			vm.status = 0;
			vm.errortext = "Your link is invalid.";
		}

		navigator.geolocation.getCurrentPosition(currentPositionCallback);
	}

	function currentPositionCallback(position) {
		vm.map.center.latitude = position.coords.latitude;
		vm.map.centerlongitude = position.coords.longitude;
	}

	function showorhideStatus ($event) {
        var mapPos = parseInt($('.statusoption').css('left'), 10);
        if (mapPos < 0) {
            vm.isstatusclicked = true;
            $('.statusoption').animate({
                left: 0
            }, 458, 'swing', function() {
                // Animation complete.
            });
       }
       else {
            vm.isstatusclicked = false;
            $('.statusoption').animate({
                left: -90
            }, 458, 'swing', function() {
                // Animation complete.
            });
       } 
    }

	function checkToken() { 
		var tokensplit = token.split("_"); //accountid_date_orderid
		var date = tokensplit[1];
		var trackref = new Firebase(firebaseUrl+'trackurl/'+ date +"/"+ tokensplit[0]+"_"+tokensplit[2]);
		trackref.on("value", function(snapshot) {
			vm.orderId = null;
			if(snapshot.val() != null) {
				if(vm.orderdetails == null)
					getOrderDetails(tokensplit[0], date, tokensplit[2]);

				vm.orderId = token.split('_')[2];
				if((vm.status == 4 && snapshot.val().status != "Dispatched") || 
				   (vm.status != null && vm.status != 0 && vm.status != 4 && snapshot.val().status == "Dispatched")) {
					$window.location.reload();
				}
				else if(snapshot.val().status == "Cancelled") {
					setErrorText("#"+vm.orderId+" - Your Order has been Cancelled");
				}
				else {
					vm.durarion = null;

					if(livedataref != null)
						livedataref.off();

					if(flightPath != null)
						flightPath.setMap(null);

					accountId = token.split('_')[0];
					vm.haserror = false;
					vm.marker.coords = null;
					vm.startmarker.coords = null;
					vm.endmarker.coords = null;
					
					starttime = snapshot.val().starttime;
					endtime = snapshot.val().endtime;
					
					setStatus(snapshot.val().status, snapshot.val().history);

					if(vm.isstatusclicked == false)
						showorhideStatus();

					if(vm.isdesktop == true && vm.status == 4)
						setGoogleMaps();

					if(vm.status >= 4) { //Status - Dispatched or Delivered - Track driver
						device = snapshot.val().device;
						getDeviceInfoId();
					}
				  	
				  	applyscope();
			  	}
		  	}
		  	else {
				setErrorText("Your link is invalid.");
		  		applyscope();
		  	}

		}, function (errorObject) {
		  	console.error("The trackurl read failed: " , errorObject);
		});
 	}

 	function getOrderDetails(accountid, date, orderid) { 
		var orderref = new Firebase(firebaseUrl+'/accounts/'+accountid+'/unassignorders/'+date+"/"+orderid);
		orderref.on("value", function(snapshot) {
			var data = snapshot.val();
			vm.orderdetails = {};
			vm.orderdetails.rawaddress = data.address + " "+ data.zip;
			vm.orderdetails.address = data.address.split(",");
			vm.orderdetails.zip = data.zip;

			vm.orderdetails.items = [];
			var itemsplit = data.productdesc.split("\n");
			for(var i=0; i< itemsplit.length; i++) {
				var item = itemsplit[i];
				var messageindex = (item.toLowerCase()).indexOf("message on the cake");
				if(messageindex >= 0) {
					item = itemsplit[i].substr(0,messageindex);
				}

				if(item.toLowerCase().indexOf("delivery charge") < 0 && item != null && item != undefined && item != "")
					vm.orderdetails.items.push(item);

			}

			if(data.location != null && data.location != undefined && data.location != "") {
				dest = new google.maps.LatLng(data.location.lat, data.location.lng);
			}
			else
				dest = null;

			vm.orderdetails.name = data.name;
			vm.orderdetails.time = data.time;
			vm.orderdetails.deliverydate = moment(new Date(data.delivery_date.substr(0,4),data.delivery_date.substr(4,2)-1, data.delivery_date.substr(6,2))).format("MMM DD, YYYY");

			applyscope();

		}, function (errorObject) {
		  	console.error("The order read failed: " , errorObject);
		});
 	}

 	function setStatus(statustext, history) {
 		vm.statushistory = {placed: null, reviewed: null, prepared: null, dispatched: null, delivered: null};
 		vm.statusText = statustext;
 		if(statustext == "Placed") {
 			vm.status = 1;
 			setHistory(history, "placed");
 		}
 		else if(statustext == "Reviewed") {
 			vm.status = 2;
			setHistory(history, "placed");
			setHistory(history, "reviewed"); 		
		}
 		else if(statustext == "Prepared") {
 			vm.status = 3;
 			setHistory(history, "placed");
			setHistory(history, "reviewed");
			setHistory(history, "prepared");
 		}
 		else if(statustext == "Dispatched") {
 			vm.status = 4;
 			setHistory(history, "placed");
			setHistory(history, "reviewed");
			setHistory(history, "prepared");
			setHistory(history, "dispatched");
		}
 		else if(statustext == "Delivered") {
 			vm.status = 5;
 			setHistory(history, "placed");
			setHistory(history, "reviewed");
			setHistory(history, "prepared");
			setHistory(history, "dispatched");
			setHistory(history, "delivered");
 		}

 		vm.createddate = moment(new Date(vm.statushistory.placed)).format("MMM DD, YYYY");
		vm.createdtime = moment(new Date(vm.statushistory.placed)).format("hh:mm A");
 	}

 	function setHistory(history, prop) {
 		if(history != null && history != undefined)
 			vm.statushistory[prop] = (history[prop] != null  && history[prop] != undefined && history[prop] != "") ? moment(new Date(history[prop])).format("MMM DD, YYYY hh:mm A") : null;
 	}

 	function setErrorText(text) {
		vm.haserror = true;
		vm.errortext = text;
		vm.status = 0;
		applyscope();
 	}

 	function getDeviceInfoId() {
 		var deviceref = new Firebase(firebaseUrl+'accounts/'+accountId+'/devices/'+ device);
		deviceref.once("value", function(snapshot) {
			if(snapshot.val() != null) {
				deviceinfo = snapshot.val();
				vm.drivername = (deviceinfo.drivername != null && deviceinfo.drivername != undefined && deviceinfo.drivername != "") ? deviceinfo.drivername : "";
				vm.drivermobile = deviceinfo.drivermobile;
				vm.marker.options.icon = deviceinfo.vehicletype == 'car' ? 'img/car-moving.png':'img/bike-moving.png';

				if(vm.status == 4) { //If Dispatched - Get trip data till now and Track driver
					getTripdata(new Date().getTime());
				}
			}
			else if(vm.status != 5) {
				setErrorText("Your link is invalid.");
			}
			applyscope();
		}, function (errorObject) { 
		  	console.error("The device read failed: " , errorObject);
		});
 	}

 	function getTripdata(deliveryendtime) {
 		getTripHistory(device, starttime, deliveryendtime).then(function(data){
 			flightPlanCoordinates = [];
            for(var i=0; i<data.length; i++) {
                flightPlanCoordinates.push(new google.maps.LatLng(data[i].latitude, data[i].longitude));
            }

            if(data.length > 0) {
	            vm.startmarker.coords = {
	               latitude: data[0].latitude,
	               longitude: data[0].longitude
	            }

	            if(vm.status == 5) {
		            vm.endmarker.coords = {
		               latitude: data[(data.length-1)].latitude,
		               longitude: data[(data.length-1)].longitude
		            };
		        }
		    }
            setPolyline(flightPlanCoordinates);
            if(vm.status == 4)
            	getlivedata();

 		}, function(error){
 			console.log(error);
 		});
 	}

 	function setPolyline() {
 		flightPath = new google.maps.Polyline({
            path: flightPlanCoordinates,
		    geodesic: true,
		    strokeColor: '#2E9AFE',
		    strokeOpacity: 1.0,
		    strokeWeight: 4,
		    map : vm.mapinstance
        });
 	}

	function getlivedata() {
		livedataref = new Firebase(firebaseUrl+'accounts/'+accountId+'/livecars/'+ device);
		livedataref.on("value", function(snapshot) {
			if(snapshot.val()) {
				var livedata = snapshot.val();
				var isIdle = getIsIdle(livedata);

				var latlng = new google.maps.LatLng(livedata.latitude, livedata.longitude);
			    var geocoder = new google.maps.Geocoder();
		 		geocoder.geocode({ 'latLng': latlng }, function (results, status) {
		 			var location = "";
		            if (status == google.maps.GeocoderStatus.OK) {
		                if (results[0]) {
		                	var sublocality = _.first(_.filter(results[0].address_components, function(address){ return address.types[0].indexOf('sublocality') >= 0}));
		                	if(sublocality == null)
		                		sublocality = _.first(_.filter(results[0].address_components, function(address){ return address.types[0].indexOf('route') >= 0}));
		                	location = sublocality.long_name;
		          		}
		            }

		            vm.map.center.latitude = livedata.latitude;
					vm.map.center.longitude = livedata.longitude;

					flightPlanCoordinates.push(new google.maps.LatLng(livedata.latitude, livedata.longitude));
		            setPolyline(flightPlanCoordinates);

		            vm.marker.coords = {};
					vm.marker.coords.latitude = livedata.latitude;
					vm.marker.coords.longitude = livedata.longitude;
					vm.marker.time = getTimeStamp(livedata.locationtime);
					vm.marker.options.labelContent ='<div style="min-width:120px;"><span style="font-weight:bold; font-size:15px;; color:black"> @ ' + location + '</span><br/>' + '<span style="font-weight:bold; font-size:15px;color:black">On the way</span></div>'
		  			
		  			getEstimatedTime(livedata.latitude, livedata.longitude);

		  			applyscope();

	            });
		  	}
		}, function (errorObject) {
		  	console.error("The livedata read failed: " , errorObject);
		});
 	}

 	function setGoogleMaps(){
		vm.showmaps =true;
       	uiGmapGoogleMapApi.then(function(maps) {
       		maps.visualRefresh = true;
		   	infowindow = new google.maps.InfoWindow({
	  			content: ''
			});
   		});

   		uiGmapIsReady.promise(1).then( function(instances) {
   			vm.mapinstance = instances[0].map;
   			setPolyline();
   		});
   	}

   	function getEstimatedTime(sourcelat, sourcelng) {
   		if(dest != null) {
	   		var service = new google.maps.DistanceMatrixService();
			service.getDistanceMatrix(
		    {
			    origins: [new google.maps.LatLng(sourcelat, sourcelng)],
			    destinations: [dest, vm.orderdetails.rawaddress],
			    travelMode: google.maps.TravelMode.DRIVING,
			    unitSystem: google.maps.UnitSystem.METRIC,
			    avoidHighways: false,
			    avoidTolls: false
		    }, 
		    function(response, status) {
		    	console.log(response);
		    	if(status == 'OK') {
		    		var durationvalue = 0;
		    		var durationtext = "";
					for(var i=0; i<response.rows.length; i++) {
						for(var j=0; j< response.rows[i].elements.length; j++) {
							var element = response.rows[i].elements[j];
							if(element.status == 'OK') {
								if(durationvalue == 0 || element.duration.value <= durationvalue) {
									durationvalue = element.duration.value;
									durationtext = element.duration.text.replace("hour", "hr");
								}
							}
						}
					}
					vm.duration = durationtext;
					applyscope();
				}
		    });
		}
   	}

   	function getIsIdle(liveobj) {
		var isIdle = liveobj.running ? !liveobj.running: true;
 		return isIdle;
	}

   	function getTimeStamp(unixtimestamp){
		return moment((unixtimestamp)).fromNow();
 	}

    $rootScope.$on('search:location', function (event, data) {
	   	vm.map.center.latitude = data.lat;
		vm.map.center.longitude = data.lng;
		applyscope();
	});

    function getParameterByName(name) {
	    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
	        results = regex.exec(location.search);
	    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}

	function applyscope() {
        if ($scope.$root && $scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest') 
            $scope.$apply();
    }

    function getTripHistory(device, from, to) {
      return $http.get(tripurl + 'location/history/'+device+'?from='+from+'&to='+to)
         .then(function (response) {
             return response.data;
         }, function (error, code) {
             return $q.reject(error);
      });
    }

    function IsDesktop() {
        if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
            return false;               
        else
            return true;
    }

}]);