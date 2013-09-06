dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("esri.arcgis.utils");
dojo.require("esri.map");

/******************************************************
***************** begin config section ****************
*******************************************************/

var TITLE = "Lyrical Locations"
var BASEMAP_SERVICE = "http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer";

var FEATURE_SERVICE_URL = "http://services.arcgis.com/nzS0F0zdNLvs7nc8/arcgis/rest/services/Lyrical_Places/FeatureServer/0";

var LOCATIONS_FIELDNAME_X = "X";
var LOCATIONS_FIELDNAME_Y = "Y";
var LOCATIONS_FIELDNAME_STANDARDIZEDNAME = "Standardized_Name";
var LOCATIONS_FIELDNAME_COUNT = "Count";
var LOCATIONS_FIELDNAME_SHORTNAME = "Short_name";

var SPREADHSEET_FIELDNAME_PLACENAME = "Place name";
var SPREADSHEET_FIELDNAME_SONG = "Song";
var SPREADSHEET_FIELDNAME_ARTIST = "Artist";
var SPREADSHEET_FIELDNAME_HANDLE = "Handle";
var SPREADSHEET_FIELDNAME_LYRICS = "Lyrics";

var PARAMETER_STANDARDIZEDNAME = "standardizedName";

var SYMBOL_BASE_SIZE = 5;

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

	getLocations(function(locations){_locations = locations; finishInit()});
	
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
}

function deselect()
{
	_selected = null;
	$("#info").slideUp();
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

	queryRecsByCity(_selected.attributes.getStandardizedName(), function(recs){
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
	});	
}

function queryRecsByCity(name,callBack)
{
	var query = new esri.tasks.Query();
	query.where = LOCATIONS_FIELDNAME_STANDARDIZEDNAME + " = '" + name+"'";
	query.returnGeometry = false;
	query.outFields = ["*"];
	
	var queryTask = new esri.tasks.QueryTask(FEATURE_SERVICE_URL);
	queryTask.execute(query, function(result){
		var recs = [];
		$.each(result.features, function(index, value){recs.push(value.attributes)});
		callBack(recs);
	});
}

function moveGraphicToFront(graphic)
{
	var dojoShape = graphic.getDojoShape();
	if (dojoShape) dojoShape.moveToFront();
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
	$("#info").css("max-height", $("#map").height()-100);
}

function getLocations(callBack) 
{
	var locations = [];
	var pt;
	var att;
	
	$.ajax({
	  type: 'GET',
	  dataType:'json',
	  url: "http://services.arcgis.com/nzS0F0zdNLvs7nc8/arcgis/rest/services/Lyrical_Places/FeatureServer/0/query?where=1+%3D+1&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&outFields=&returnGeometry=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=X%2CY%2CStandardized_Name&outStatistics=%5B%0D%0A++%7B%0D%0A++++%22statisticType%22%3A+%22count%22%2C%0D%0A++++%22onStatisticField%22%3A+%22Standardized_Name%22%2C%0D%0A++++%22outStatisticFieldName%22%3A+%22Count%22%0D%0A++%7D%0D%0A%5D&f=pjson&token=",
	  cache: false,
	  success: function(text) {
		  $.each(text.features, function(index, value) {
			    att = new LocationRec(
					value.attributes[LOCATIONS_FIELDNAME_STANDARDIZEDNAME].split(",")[0],
					value.attributes[LOCATIONS_FIELDNAME_STANDARDIZEDNAME],
					value.attributes[LOCATIONS_FIELDNAME_COUNT]
				);
				if ($.trim(value.attributes[LOCATIONS_FIELDNAME_X]) != "") {
					pt = new esri.geometry.Point(value.attributes[LOCATIONS_FIELDNAME_X], value.attributes[LOCATIONS_FIELDNAME_Y]);
					locations.push(new esri.Graphic(pt, createSymbol(att.getCount()*SYMBOL_BASE_SIZE,0.25), att));
				}
		  });
		// sort unique locations in descending order of count
		locations.sort(function(a,b){return b.attributes.getCount() - a.attributes.getCount()});
		callBack(locations);	
	  }
	});		
}

function createSymbol(size, opacity)
{
	return new esri.symbol.SimpleMarkerSymbol(
				esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, size,
				new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0,0,233]), 2),
				new dojo.Color([0,0,233,opacity])
			);	
}

