var myApp = angular.module('myApp', ['uiGmapgoogle-maps']);

myApp.directive('googlePlaces', ['$rootScope', function($rootScope){
	return {
	    restrict:'E',
	    replace:true,
	    scope: {},
	    template: '<input id="google_places_ac" name="google_places_ac" type="text" class="form-control tm-search-text" placeholder="Search by location" />',
	    link: function($scope, elm, attrs){
	        var autocomplete = new google.maps.places.Autocomplete($("#google_places_ac")[0], {});
	        google.maps.event.addListener(autocomplete, 'place_changed', function() {
	            var place = autocomplete.getPlace();
	            $rootScope.$emit('search:location', {lat:place.geometry.location.lat(), lng:place.geometry.location.lng()});
	        });
	    }
	}
}]);


