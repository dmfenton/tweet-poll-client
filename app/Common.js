function Common()
{
}

Common.createSymbol = function(size, rgb, opacity)
{
	return new esri.symbol.SimpleMarkerSymbol(
				esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, size,
				new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color(rgb), 2),
				new dojo.Color(rgb.concat([opacity]))
			);	
}

Common.getStarterName = function(argName)
{
	var sn;
	var params = esri.urlToObject(document.location.href).query;
	if (params != null) {
		$.each(params,function(index,value){			
			if (index.toLowerCase() == argName.toLowerCase()) {
				sn = value
			}
		});
	}
	return sn;	
}