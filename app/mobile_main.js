var _map;
var _service;
var _twitter;
var _locations;
var _center;
var _selected;

var _counter = 0;

var _dojoReady = false;
var _jqueryReady = false;

dojo.addOnLoad(function() {_dojoReady = true;init()});
jQuery(document).ready(function() {_jqueryReady = true;init()});

function init() {
	
	if (!_jqueryReady) return;
	if (!_dojoReady) return;
	
	_service = new HerokuService(
		function(flag) {
			_locations = Common.createGraphics(_service.getRecsSortedByCount(), Config.SYMBOL_BASE_SIZE, Config.SYMBOL_COLOR);
			//writeTable(_service.getRecsSortedByName());	
			if (_map) Common.loadGraphics(_map, _locations);	
		}
		, Config.REFRESH_RATE);
		
	_twitter = new TwitterService();
	
	_center = new esri.geometry.Point(Config.CENTER_X, Config.CENTER_Y, new esri.SpatialReference(102100));
	
	// jQuery event assignment
	
	$(this).resize(handleWindowResize);
	
	$("#zoomIn").click(function(e) {
        _map.setLevel(_map.getLevel()+1);
    });
	$("#zoomOut").click(function(e) {
        _map.setLevel(_map.getLevel()-1);
    });
	$("#zoomExtent").click(function(e) {
        _map.centerAndZoom(_center, Config.LEVEL);
    });
	
	$(".maplink").click(function(e) {
        if (_counter == 0) instantiateMap();
		_counter++;
    });
	
}


function instantiateMap()
{

	_map = new esri.Map("map", {slider:false});
	_map.addLayer(new esri.layers.ArcGISTiledMapServiceLayer(Config.BASEMAP_SERVICE));

	if(_map.loaded){
		finishMap();
	} else {
		dojo.connect(_map,"onLoad",function(){
			finishMap();
		});
	}
}

function finishMap() {
	Common.loadGraphics(_map, _locations);		
	dojo.connect(_map.graphics, "onClick", layerOV_onClick);		
	// click action on the map where there's no graphic 
	// causes a deselect.
	dojo.connect(_map, 'onClick', function(event){
		if (event.graphic == null) {
			deselect();
		}
	});
	handleWindowResize();	
	_map.centerAndZoom(_center, Config.LEVEL);
	
}


/**********
	events
**********/

function layerOV_onClick(event) 
{
	alert(event.graphic.attributes.getShortName());
	/*
	$("#hoverInfo").hide();
	var graphic = event.graphic;
	_selected = graphic;
	postSelection();
	adjustExtent();
	*/
}

function handleWindowResize() {
	$("#map").height($("body").height()-150);
	$("#map").width($("body").width()-35);
	_map.resize();
}
