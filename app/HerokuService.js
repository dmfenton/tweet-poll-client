function HerokuService()
{
	
	var PROXY_URL = window.location.href.toLowerCase().indexOf("storymaps.esri.com") >= 0 ? 
						"http://storymaps.esri.com/proxy/proxy.ashx" : 
						"http://localhost/proxy/proxy.ashx";
						
	var SERVICE_URL = PROXY_URL+"?http://esri-destination.herokuapp.com/"
	
	this.getLocations = function(callBack)
	{
		$.ajax({
			type: 'GET',
			url: SERVICE_URL,
			cache: true,
			success: function(result) {
				var arr = [];
				var sym, pt, atts;
				$.each(result, function(index, value) {
					sym = createSymbol(value.count*SYMBOL_BASE_SIZE,0.25);
					pt = new esri.geometry.Point(parseFloat(value.x), parseFloat(value.y));
					atts = new LocationRec(value.standardized_name, value.standardized_name, value.count);
					arr.push(new esri.Graphic(pt, sym, atts));
				});
				callBack(arr);
			}
		});			
	}
	
	
	this.queryRecsByCity = function(name, callBack)
	{
		callBack([]);
	}
	
}