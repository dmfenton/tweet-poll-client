dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("esri.arcgis.utils");
dojo.require("esri.map");

/******************************************************
***************** begin config section ****************
*******************************************************/

var TITLE = "Map My Lyrics"
var SPREADSHEET_URL = "https://docs.google.com/spreadsheet/pub?key=0ApQt3h4b9AptdHdvUDd4NnRVOEhpcExwQldNN3BlZHc&output=csv";
var PROXY_URL = window.location.href.toLowerCase().indexOf("storymaps.esri.com") >= 0 ? "http://storymaps.esri.com/proxy/proxy.ashx" : "http://localhost/proxy/proxy.ashx";
var BASEMAP_SERVICE = "http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer";

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
var LEVEL = 4;

/******************************************************
***************** end config section ******************
*******************************************************/

var _map;
var _recsSpreadSheet;
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
	
	_center = new esri.geometry.Point(CENTER_X, CENTER_Y, new esri.SpatialReference(102100));

	esri.config.defaults.io.proxyUrl = PROXY_URL;	
	
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
		var pt;
		var atts;
		$.each(unique, function(index, value) {
			recs = $.grep(_recsSpreadSheet, function(n,i){return n[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME] == value});
			rec = recs[0]
			sym = createSymbol(recs.length*10);
			if ($.trim(rec[SPREADSHEET_FIELDNAME_X]) != "") {
				pt = new esri.geometry.Point(rec[SPREADSHEET_FIELDNAME_X], rec[SPREADSHEET_FIELDNAME_Y]);
				atts = {name:rec[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME].split(",")[0], standardizedName:rec[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME],count:recs.length};
				_locations.push(new esri.Graphic(pt, sym, atts));
			}
		});
		
		finishInit();

	});
	serviceCSV.process(SPREADSHEET_URL);	
	
}

function createSymbol(size)
{
	return new esri.symbol.SimpleMarkerSymbol(
				esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, size,
				new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0,0,233]), 2),
				new dojo.Color([0,0,233,0.25])
			);	
}

function finishInit() {
	
	if (!_recsSpreadSheet) return false;	
	if (!_map.loaded) return false;
	
	$.each(_locations, function(index, value) {
		_map.graphics.add(value);
	});
	
	var params = esri.urlToObject(document.location.href).query;
	var starterName;
	if (params != null) {
		$.each(params,function(index,value){			
			if (index.toLowerCase() == "standardizedname") {
				starterName = value
			}
		});
	}
	if (starterName) {
		_selected = $.grep(_locations, function(n, i) {
			return n.attributes.standardizedName == starterName;
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


function layerOV_onMouseOver(event) 
{
	if (_isMobile) return;
	var graphic = event.graphic;
	_map.setMapCursor("pointer");
	if (graphic!=_selected) {
		graphic.setSymbol(createSymbol(10*graphic.attributes.count+3));
		$("#hoverInfo").html(graphic.attributes.standardizedName.split(",")[0]);
		var pt = _map.toScreen(graphic.geometry);
		hoverInfoPos(pt.x,pt.y);	
	}

	if (!_isIE) moveGraphicToFront(graphic);	

}


function layerOV_onMouseOut(event) 
{
	var graphic = event.graphic;
	_map.setMapCursor("default");
	$("#hoverInfo").hide();
	graphic.setSymbol(createSymbol(10*graphic.attributes.count));
}


function layerOV_onClick(event) 
{
	$("#hoverInfo").hide();
	var graphic = event.graphic;
	_selected = graphic;
	postSelection();
}

function deselect()
{
	_selected = null;
	$("#info").slideUp();
	$("#map").multiTips({
		pointArray : [],
		attributeLabelField: "name",
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
		attributeLabelField: "name",
		mapVariable : _map,
		labelDirection : "top",
		backgroundColor : "#000000",
		textColor : "#FFFFFF",
		pointerColor: "#000000"
	});		
	
	var recs = queryRecsByCity(_selected.attributes.standardizedName);
	$("#info").empty();
	$.each(recs, function(index, value) {
		$("#info").append("<b>"+value[SPREADSHEET_FIELDNAME_ARTIST]+"</b>, <i>"+value[SPREADSHEET_FIELDNAME_SONG]+"</i>");
		$("#info").append("<br>");
		$("#info").append("<br>");
		$("#info").append(value[SPREADSHEET_FIELDNAME_LYRICS]);
		$("#info").append("<br>");
		$("#info").append("<br>");
		$("#info").append("<br>");
	});
	$("#info").slideDown();
	// make sure point doesn't occupy right-most 400px of map.
	if (_map.toScreen(_selected.geometry).x > ($("#map").width() - 400))
		_map.centerAt(_selected.geometry);
	
}

function queryRecsByCity(name)
{
	return $.grep(_recsSpreadSheet, function(n,i){return n[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME] == name});
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

function handleWindowResize() {
	if ((($("body").height() <= 500) || ($("body").width() <= 800)) || _isEmbed) $("#header").height(0);
	else $("#header").height(115);
	
	$("#map").height($("body").height() - $("#header").height());
	$("#map").width($("body").width());
	_map.resize();
	$("#info").css("max-height", $("#map").height()-100);
}
