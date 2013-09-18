dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("esri.arcgis.utils");
dojo.require("esri.map");

/******************************************************
***************** begin config section ****************
*******************************************************/

var TITLE = "Lyrical Locations"
var BASEMAP_SERVICE = "http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer";

var PARAMETER_STANDARDIZEDNAME = "standardizedName";

var SYMBOL_BASE_SIZE = 7;
var SYMBOL_COLOR = {r:0,g:0,b:233};

var CENTER_X = -10910315;
var CENTER_Y = 4002853;
var LEVEL = 4;

/******************************************************
***************** end config section ******************
*******************************************************/

var _map;
var _service;
var _locations;
var _center;
var _selected;

var _dojoReady = false;
var _jqueryReady = false;

var _isMobile = isMobile();
var _isIE = (navigator.appVersion.indexOf("MSIE") > -1);

var _isEmbed = false;

dojo.addOnLoad(function() {_dojoReady = true;init()});
jQuery(document).ready(function() {_jqueryReady = true;init()});

function init() {
	
	if (!_jqueryReady) return;
	if (!_dojoReady) return;
	
	_service = new GoogleService();
	
	_center = new esri.geometry.Point(CENTER_X, CENTER_Y, new esri.SpatialReference(102100));
	
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
	
	_map = new esri.Map("map", {slider:false});
	
	_map.addLayer(new esri.layers.ArcGISTiledMapServiceLayer(BASEMAP_SERVICE));
	_map.centerAndZoom(_center, LEVEL);
	

	if(_map.loaded){
		finishInit();
	} else {
		dojo.connect(_map,"onLoad",function(){
			finishInit();
		});
	}

	_service.getLocations(function(locations){_locations = locations; finishInit()});
	
}

function finishInit() {
	
	if (!_locations) return false;	
	if (!_map.loaded) return false;
	
	$.each(_locations, function(index, value) {
		_map.graphics.add(value);
	});
	
	var params = esri.urlToObject(document.location.href).query;
	var starterName;
	if (params != null) {
		$.each(params,function(index,value){			
			if (index.toLowerCase() == PARAMETER_STANDARDIZEDNAME.toLowerCase()) {
				starterName = value
			}
		});
	}
	if (starterName) {
		_selected = $.grep(_locations, function(n, i) {
			return n.attributes.getStandardizedName() == starterName;
		})[0];
		postSelection();
		_map.centerAndZoom(_selected.geometry, 5);
	}
		
	dojo.connect(_map.graphics, "onMouseOver", layerOV_onMouseOver);
	dojo.connect(_map.graphics, "onMouseOut", layerOV_onMouseOut);
	dojo.connect(_map.graphics, "onClick", layerOV_onClick);		
	
	// click action on the map where there's no graphic 
	// causes a deselect.

	dojo.connect(_map, 'onClick', function(event){
		if (event.graphic == null) {
			deselect();
		}
	});
	
	handleWindowResize();
	$("#whiteOut").fadeOut();
	
}

function layerOV_onMouseOver(event) 
{
	if (_isMobile) return;
	var graphic = event.graphic;
	_map.setMapCursor("pointer");
	if (graphic!=_selected) {
		graphic.setSymbol(createSymbol(SYMBOL_BASE_SIZE*graphic.attributes.getCount()+3, 0.35));
		$("#hoverInfo").html(graphic.attributes.getShortName());
		var pt = _map.toScreen(graphic.geometry);
		hoverInfoPos(pt.x,pt.y);	
	}
}


function layerOV_onMouseOut(event) 
{
	var graphic = event.graphic;
	_map.setMapCursor("default");
	$("#hoverInfo").hide();
	graphic.setSymbol(createSymbol(SYMBOL_BASE_SIZE*graphic.attributes.getCount(), 0.25));
}


function layerOV_onClick(event) 
{
	$("#hoverInfo").hide();
	var graphic = event.graphic;
	_selected = graphic;
	postSelection();
	flipToLyrics();
}

function deselect()
{
	_selected = null;
	flipToTable();
	$("#map").multiTips({
		pointArray : [],
		labelValue: "",
		mapVariable : _map,
		labelDirection : "top",
		backgroundColor : "#000000",
		textColor : "#FFFFFF",
		pointerColor: "#000000"
	});		
}

function postSelection()
{
	$("#map").multiTips({
		pointArray : [_selected],
		labelValue: _selected.attributes.getShortName(),
		mapVariable : _map,
		labelDirection : "top",
		backgroundColor : "#000000",
		textColor : "#FFFFFF",
		pointerColor: "#000000"
	});		

	_service.queryRecsByCity(_selected.attributes.getStandardizedName(), function(recs){
		$(".page2").empty();
		writeTable(recs);		
		$(".page2").append("<a>Return to Table</a>");
		$(".page2 a").click(function(e) {
			flipToTable();
        });
		// make sure point doesn't occupy right-most 400px of map.
		if (_map.toScreen(_selected.geometry).x > ($("#map").width() - 400))
			_map.centerAt(_selected.geometry);
	});	
}

function writeTable(recs)
{
	var lyrics;
	var casualName;
	$.each(recs, function(index, value) {
		lyrics = value.getLyrics();
		casualName = value.getPlaceName();
		// does casualName have a comma?  if so, get what's before the comma			
		if (casualName.indexOf(",") > -1) casualName = casualName.split(",")[0];
		casualName = $.trim(casualName);
		lyrics = lyrics.replace(casualName, "<b>"+casualName+"</b>");
		$(".page2").append("<b>"+value.getArtist()+"</b>, <i>"+value.getSong()+"</i>");
		$(".page2").append("<br>");
		$(".page2").append("<br>");
		$(".page2").append(lyrics);
		$(".page2").append("<br>");
		$(".page2").append("<br>");
		$(".page2").append("<br>");
	});
}

function flipToTable()
{
	$(".page2").removeClass('flip in').addClass('flip out').hide();
	$(".page1").removeClass('flip out').addClass('flip in').show();	
}

function flipToLyrics()
{
	$(".page1").removeClass('flip in').addClass('flip out').hide();
	$(".page2").removeClass('flip out').addClass('flip in').show();	
}

function hoverInfoPos(x,y){
	if (x <= ($("#map").width())-230){
		$("#hoverInfo").css("left",(x-($("#hoverInfo").width()/2))-5);
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

function handleWindowResize() {
	if ((($("body").height() <= 500) || ($("body").width() <= 800)) || _isEmbed) $("#header").height(0);
	else $("#header").height(115);
	
	$("#map").height($("body").height() - $("#header").height());
	$("#map").width($("body").width());
	_map.resize();
	$(".page2").css("max-height", $("#map").height()-100);
}

function createSymbol(size, opacity)
{
	return new esri.symbol.SimpleMarkerSymbol(
				esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, size,
				new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([SYMBOL_COLOR.r, SYMBOL_COLOR.g, SYMBOL_COLOR.b]), 2),
				new dojo.Color([SYMBOL_COLOR.r, SYMBOL_COLOR.g, SYMBOL_COLOR.b, opacity])
			);	
}