myApp.controller("mordertrack",['$rootScope', '$scope',
function($rootScope, $scope) {
	var mobilevm = this;
	mobilevm.showstatus = true;
	mobilevm.showorddetails = false;
	mobilevm.showordertrack = false;

	mobilevm.ordernavclicked = function() {
		if(mobilevm.showstatus == true){
			mobilevm.showstatus = false;
			mobilevm.showordertrack = false;
			mobilevm.showorddetails = true;
		}
		else if(mobilevm.showorddetails == true){
			mobilevm.showorddetails = false;
			mobilevm.showordertrack = false;
			mobilevm.showstatus = true;
		}
		else if(mobilevm.showordertrack == true){
			mobilevm.showstatus = false;
			mobilevm.showordertrack = false;
			mobilevm.showorddetails = true;
		}
	}

	mobilevm.trackorder = function() {
		if($scope.$parent.vm.status == 4) {
			mobilevm.showstatus = false; 
			mobilevm.showorddetails = false; 
			mobilevm.showordertrack = true;

			$scope.$parent.vm.setMap();
		}
		else {
			mobilevm.showstatus = false;
			mobilevm.showordertrack = false;
			mobilevm.showorddetails = true;
		}
	}

}]);