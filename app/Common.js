function Common()
{
}

Common.createGraphics = function(recs, symBaseSize, symColor) 
{
	var arr = [];
	var sym, pt, atts;
	$.each(recs, function(index, value){
		sym = Common.createSymbol(value.count*symBaseSize, symColor, 0.25);
		pt = new esri.geometry.Point(parseFloat(value.x), parseFloat(value.y));
		atts = new LocationRec(value.short_name, value.standardized_name, value.count);
		arr.push(new esri.Graphic(pt, sym, atts));		
	});
	return arr;
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

Common.loadGraphics = function(map, graphics)
{
	map.graphics.clear();
	$.each(graphics, function(index, value) {
		map.graphics.add(value);
	});
}

