function AGOLService(refreshHandler, REFRESH_RATE)
{

	var FEATURE_SERVICE_URL = "http://services.arcgis.com/nzS0F0zdNLvs7nc8/arcgis/rest/services/BestXmasEverMap/FeatureServer/0";	
	var _recs;
	
	fetchLocations();
		
	function fetchLocations() 
	{
		var locations = [];
		var pt;
		var att;
		
		$.ajax({
		  type: 'GET',
		  dataType:'json',
		  url: FEATURE_SERVICE_URL+"/query?where=1+%3D+1&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&outFields=&returnGeometry=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=X%2CY%2CStandardized_Location&outStatistics=%5B%0D%0A++%7B%0D%0A++++%22statisticType%22%3A+%22count%22%2C%0D%0A++++%22onStatisticField%22%3A+%22Standardized_Location%22%2C%0D%0A++++%22outStatisticFieldName%22%3A+%22Count%22%0D%0A++%7D%0D%0A%5D&f=pjson&token=",
		  cache: false,
		  success: processLocations
		  });		
	}
	
	function convertToRecs(features)
	{
		var recs = [];
		$.each(features, function(index, value){
			recs.push({
				count: value.attributes.Count, 
				x: value.attributes.X, 
				y: value.attributes.Y, 
				standardized_name: value.attributes.Standardized_Location, 
				short_name: value.attributes.Standardized_Location.split(",")[0]
			});
		});
		return recs;
	}
	
	function processLocations(text)
	{
		if (_recs == null) {
			_recs = convertToRecs(text.features);
			refreshHandler(true);
		} else {
			var temp = convertToRecs(text.features);
			if (diff(temp, _recs)) {
				_recs = temp
				refreshHandler(false);
			}
		}
		setTimeout(fetchLocations, REFRESH_RATE);
	}
	
	function diff(arr1, arr2)
	{
		var matches;
		var flag = false;
		
		if (hasDeletionOccurred(arr1, arr2)) {
			console.log("deletion has occurred");
			return true;
		}
		
		$.each(arr1, function(index, value) {
			matches = $.grep(arr2, function(n, i) {
				return n.standardized_name == value.standardized_name;
			});
			if (matches.length > 0) {
				if (matches[0].count != value.count) {
					console.log("count changed");
					flag = true;
				}
			} else {
				console.log("new one!");
				flag = true;
			}
		});
		return flag;
	}
	
	function hasDeletionOccurred(arrNew, arrOrig)
	{
		// is there a location in the original that is not
		// in the new?
		var matches;
		var flag = false;
		$.each(arrOrig, function(index, value) {
			matches = $.grep(arrNew, function(n, i) {
				return n.standardized_name == value.standardized_name;
			});
			if (matches.length == 0) {
				flag = true;
			}
		});
		return flag;
	}
	
	this.getRecsSortedByCount = function() 
	{
		var list = $.extend(true, [], _recs);
		list.sort(function(a,b){return b.count - a.count});
		return list;
	}
	
	this.getRecsSortedByName = function()
	{
		var list = $.extend(true, [], _recs);
		list.sort(function(a,b){
			if (a.short_name < b.short_name) return -1;
			if (a.short_name > b.short_name) return 1;
			return 0;
		});
		return list;		
	}
	
	this.queryRecsByCity = function(name,callBack)
	{
		
		var query = new esri.tasks.Query();
		query.where = "Standardized_Location = '" + name+"'";
		query.returnGeometry = false;
		query.outFields = ["*"];
		
		var queryTask = new esri.tasks.QueryTask(FEATURE_SERVICE_URL);
		queryTask.execute(query, function(result){
			var recs = [];
			$.each(result.features, function(index, value){
				recs.push({tweet_id: value.attributes.Tweet_ID});
			});
			callBack(recs);
		});	
	}
	
	
}