function HerokuService(refreshHandler, REFRESH_RATE)
{
	
	var PROXY_URL = window.location.href.toLowerCase().indexOf("storymaps.esri.com") >= 0 ? 
						"http://storymaps.esri.com/proxy/proxy.ashx" : 
						"http://localhost/proxy/proxy.ashx";
						
	var SERVICE_URL = PROXY_URL+"?http://esri-destination.herokuapp.com/";
	
	var _recs;
	
	fetchLocations();
	
	function fetchLocations()
	{
		$.ajax({
			type: 'GET',
			url: SERVICE_URL,
			cache: true,
			success: processLocations,
			error: function(event){console.log("uh-oh...")}
		});			
	}
		
	function processLocations(results)
	{
		if (_recs == null) {
			_recs = results;
			refreshHandler(true);
		} else {
			if (diff(results, _recs)) {
				_recs = results;
				refreshHandler(false);
			}			
		}
		setTimeout(fetchLocations, REFRESH_RATE);
	}
	
	function diff(arr1, arr2)
	{
		var matches;
		var flag = false;
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
	
	this.queryRecsByCity = function(name, callBack)
	{
		$.ajax({
			type: 'GET',
			url: SERVICE_URL+"/location/"+name,
			cache: true,
			success: function(result) {
				callBack(result);
			}
		});			
	}
	
}