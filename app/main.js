dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("esri.arcgis.utils");
dojo.require("esri.map");

/******************************************************
***************** begin config section ****************
*******************************************************/

var TITLE = "This is the title."
var BYLINE = "This is the byline"
var WEBMAP_ID = "3732b8a6d0bc4a09b00247e8daf69af8";
var GEOMETRY_SERVICE_URL = "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer";
var SPREADSHEET_URL = "https://docs.google.com/spreadsheet/pub?key=0ApQt3h4b9AptdHdvUDd4NnRVOEhpcExwQldNN3BlZHc&output=csv";
var PROXY_URL = "http://localhost/proxy/proxy.ashx";
var BASEMAP_SERVICE_SATELLITE = "http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer";

var SPREADHSEET_FIELDNAME_PLACENAME = "Place name";
var SPREADSHEET_FIELDNAME_SONG = "Song";
var SPREADSHEET_FIELDNAME_ARTIST = "Artist";
var SPREADSHEET_FIELDNAME_HANDLE = "Handle";
var SPREADSHEET_FIELDNAME_LYRICS = "Lyrics";
var SPREADSHEET_FIELDNAME_X = "X";
var SPREADSHEET_FIELDNAME_Y = "Y";
var SPREADSHEET_FIELDNAME_STANDARDIZEDNAME = "Standardized Name";

var CENTER_X = -10910315;
var CENTER_Y = 4002853;
var LEVEL = 3;

/******************************************************
***************** end config section ******************
*******************************************************/

var _map;
var _recsSpreadSheet;
var _locations;
var _center;

var _dojoReady = false;
var _jqueryReady = false;

var _isMobile = isMobile();

var _isEmbed = false;

/*

might need this if you're using icons.

var _lutBallIconSpecs = {
	tiny:new IconSpecs(24,24,12,12),
	medium:new IconSpecs(30,30,15,15),
	large:new IconSpecs(30,30,15,15)
}
*/

dojo.addOnLoad(function() {_dojoReady = true;init()});
jQuery(document).ready(function() {_jqueryReady = true;init()});

function init() {
	
	if (!_jqueryReady) return;
	if (!_dojoReady) return;
	
	var params = esri.urlToObject(document.location.href).query;
	if (params != null) {
		
		$.each(params,function(index,value){
			
			if (index.toLowerCase() == "center") {
				_center = new esri.geometry.Point(value.split(",")[0], value.split(",")[1]);
			}
			
			if (index.toLowerCase() == "level") {
				LEVEL = value;
			}
			
		});
	}
	
	if (!_center) _center = new esri.geometry.Point(CENTER_X, CENTER_Y, new esri.SpatialReference(102100));

	esri.config.defaults.io.proxyUrl = PROXY_URL;	
	
	// determine whether we're in embed mode
	
	var queryString = esri.urlToObject(document.location.href).query;
	if (queryString) {
		if (queryString.embed) {
			if (queryString.embed.toUpperCase() == "TRUE") {
				_isEmbed = true;
			}
		}
	}
	
	// jQuery event assignment
	
	$(this).resize(handleWindowResize);
	
	$("#zoomIn").click(function(e) {
        _map.setLevel(_map.getLevel()+1);
    });
	$("#zoomOut").click(function(e) {
        _map.setLevel(_map.getLevel()-1);
    });
	$("#zoomExtent").click(function(e) {
        _map.centerAndZoom(_center, LEVEL);
    });
	
	$("#title").append(TITLE);
	$("#subtitle").append(BYLINE);	
	
	_map = new esri.Map("map", {slider:false});
	
	_map.addLayer(new esri.layers.ArcGISTiledMapServiceLayer(BASEMAP_SERVICE_SATELLITE));
	_map.centerAndZoom(_center, LEVEL);
	

	if(_map.loaded){
		finishInit();
	} else {
		dojo.connect(_map,"onLoad",function(){
			finishInit();
		});
	}
	
	var serviceCSV = new CSVService();
	$(serviceCSV).bind("complete", function() {	
	
		_recsSpreadSheet = parseSpreadsheet(serviceCSV.getLines());

		var unique = [];
		var graphic;
		$.each(_recsSpreadSheet, function(index, value){
			if ($.inArray(value[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME], unique) == -1) {
				unique.push(value[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME]);
			}
		});

		_locations = [];
		var recs;
		var rec;
		var sym;
		$.each(unique, function(index, value) {
			recs = $.grep(_recsSpreadSheet, function(n,i){return n[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME] == value});
			rec = recs[0]
			sym =   new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_SQUARE, 10*recs.length,
					new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255,0,0]), 1),
					new dojo.Color([0,255,0,0.25]));
			_locations.push(new esri.Graphic(new esri.geometry.Point(rec[SPREADSHEET_FIELDNAME_X], rec[SPREADSHEET_FIELDNAME_Y]),sym,{standardizedName:rec[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME],count:recs.length}));
		});
		
		finishInit();

	});
	serviceCSV.process(SPREADSHEET_URL);	
	
}

function finishInit() {
	
	if (!_recsSpreadSheet) return false;	
	if (!_map.loaded) return false;
	
	$.each(_locations, function(index, value) {
		_map.graphics.add(value);
	});
	
	/*
	
	use this for layer interactivity
	
	dojo.connect(_layerOV, "onMouseOver", layerOV_onMouseOver);
	dojo.connect(_layerOV, "onMouseOut", layerOV_onMouseOut);
	dojo.connect(_layerOV, "onClick", layerOV_onClick);		
	*/
	
	handleWindowResize();
	$("#whiteOut").fadeOut();
	
}

function parseSpreadsheet(lines)
{
	var parser = new ParserMain([
		SPREADHSEET_FIELDNAME_PLACENAME,
		SPREADSHEET_FIELDNAME_SONG,
		SPREADSHEET_FIELDNAME_ARTIST,
		SPREADSHEET_FIELDNAME_HANDLE,
		SPREADSHEET_FIELDNAME_LYRICS,
		SPREADSHEET_FIELDNAME_X,
		SPREADSHEET_FIELDNAME_Y,
		SPREADSHEET_FIELDNAME_STANDARDIZEDNAME
	]);
	return parser.getRecs(lines);
}


/*

sample layer event code.

function layerOV_onMouseOver(event) 
{
	if (_isMobile) return;
	var graphic = event.graphic;
	_map.setMapCursor("pointer");
	if ($.inArray(graphic, _selected) == -1) {
		graphic.setSymbol(resizeSymbol(graphic.symbol, _lutBallIconSpecs.medium));
	}
	if (!_isIE) moveGraphicToFront(graphic);	
	$("#hoverInfo").html("<b>"+graphic.attributes.getLanguage()+"</b>"+"<p>"+graphic.attributes.getRegion());
	var pt = _map.toScreen(graphic.geometry);
	hoverInfoPos(pt.x,pt.y);	
}


function layerOV_onMouseOut(event) 
{
	var graphic = event.graphic;
	_map.setMapCursor("default");
	$("#hoverInfo").hide();
	if ($.inArray(graphic, _selected) == -1) {
		graphic.setSymbol(resizeSymbol(graphic.symbol, _lutBallIconSpecs.tiny));
	}
}


function layerOV_onClick(event) 
{
	$("#hoverInfo").hide();
	var graphic = event.graphic;
	_languageID = graphic.attributes.getLanguageID();
	$("#selectLanguage").val(_languageID);
	changeState(STATE_SELECTION_OVERVIEW);
	scrollToPage($.inArray($.grep($("#listThumbs").children("li"),function(n,i){return n.value == _languageID})[0], $("#listThumbs").children("li")));	
}

function createIconMarker(iconPath, spec) 
{
	return new esri.symbol.PictureMarkerSymbol(iconPath, spec.getWidth(), spec.getHeight()); 
}

function resizeSymbol(symbol, spec)
{
	return symbol.setWidth(spec.getWidth()).setHeight(spec.getHeight())	
}

function moveGraphicToFront(graphic)
{
	var dojoShape = graphic.getDojoShape();
	if (dojoShape) dojoShape.moveToFront();
}

function hoverInfoPos(x,y){
	if (x <= ($("#map").width())-230){
		$("#hoverInfo").css("left",x+15);
	}
	else{
		$("#hoverInfo").css("left",x-25-($("#hoverInfo").width()));
	}
	if (y >= ($("#hoverInfo").height())+50){
		$("#hoverInfo").css("top",y-35-($("#hoverInfo").height()));
	}
	else{
		$("#hoverInfo").css("top",y-15+($("#hoverInfo").height()));
	}
	$("#hoverInfo").show();
}

*/


function handleWindowResize() {
	if ((($("body").height() <= 500) || ($("body").width() <= 800)) || _isEmbed) $("#header").height(0);
	else $("#header").height(115);
	
	$("#map").height($("body").height() - $("#header").height());
	$("#map").width($("body").width());
	_map.resize();
}
