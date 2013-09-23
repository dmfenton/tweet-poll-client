function HerokuService()
{
	
	var SERVICE_URL = "http://localhost/proxy/proxy.ashx/?http://esri-destination.herokuapp.com/";
	
	//var PROXY_URL = window.location.href.toLowerCase().indexOf("storymaps.esri.com") >= 0 ? "http://storymaps.esri.com/proxy/proxy.ashx" : "http://localhost/proxy/proxy.ashx";
	//esri.config.defaults.io.proxyUrl = PROXY_URL;

	
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
					console.log(value);
					sym = createSymbol(value.count*SYMBOL_BASE_SIZE,0.25);
					console.log(sym);
					pt = new esri.geometry.Point(parseFloat(value.x), parseFloat(value.y));
					console.log(pt);
					atts = new LocationRec(value.standardized_name, value.standardized_name, value.count);
					arr.push(new esri.Graphic(pt, sym, atts));
				});
				callBack(arr);
			}
		});			
	}
	
	
	this.queryRecsByCity = function(name, callBack)
	{
		return [];
	}
	
}