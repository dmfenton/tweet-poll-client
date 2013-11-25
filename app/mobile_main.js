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
			writeTable(_service.getRecsSortedByName());	
			if (!($.mobile.activePage[0].id == "intro" || $.mobile.activePage[0].id == "list")) instantiateMap();
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
	
	$("#btnSeeTweets").click(function(e) {
		_service.queryRecsByCity(_selected.attributes.getStandardizedName(), function(recs){	
			fetchTweets(recs);		
	        $.mobile.changePage("#tweets");
		});	
    });
	
}

function instantiateMap()
{
	_counter++
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
	setTimeout(function(){_map.centerAndZoom(_center, Config.LEVEL)}, 500);
}


/**********
	events
**********/

function tableRec_onClick(event)
{
	deselect();
	var standardizedName = $(this).find(".hiddenData").html();
	_selected = $.grep(_locations, function(n, i){return n.attributes.getStandardizedName() == standardizedName})[0];
	$.mobile.changePage("#pageMap");
	postSelection();
	_map.centerAt(_selected.geometry);
}



function layerOV_onClick(event) 
{
	var graphic = event.graphic;
	_selected = graphic;
	postSelection();
	_map.centerAt(_selected.geometry);
}

function writeTable(list)
{
	$("#table").empty();
	var li;
	$.each(list, function(index, value){
		li = "<li><a>"+value.short_name+"<div class='hiddenData'>"+value.standardized_name+"</div></a></li>";
		$("#table").append(li);
	});
	$("#table li").click(tableRec_onClick);
}

function handleWindowResize() {
	$("#map").height($("body").height()- 78);
	$("#map").width($("body").width());
	_map.resize();
}

function deselect()
{
	_selected = null;
	$("#map").multiTips({
		pointArray : [],
		labelValue: "",
		mapVariable : _map,
		labelDirection : "top",
		backgroundColor : "#FFFFFF",
		textColor : "#000000",
		pointerColor: "#FFFFFF"
	});
	$("#btnSeeTweets").fadeOut();
}

function postSelection()
{
	$("#map").multiTips({
		pointArray : [_selected],
		labelValue: _selected.attributes.getShortName(),
		mapVariable : _map,
		labelDirection : "top",
		backgroundColor : "#FFFFFF",
		textColor : "#000000",
		pointerColor: "#FFFFFF"
	});	
	$("#btnSeeTweets").html("See Tweets for <br>"+_selected.attributes.getShortName());
	$("#btnSeeTweets").fadeIn();
}

function fetchTweets(recs)
{	
	$("#info").empty();
	var count = 0;
	$.each(recs, function(index, value) {
		_twitter.fetch(value.tweet_id, 
						function(result){
							count++;
							$("#info").append(result.html);
						}, 
						function(event){
							count++;
						}
						);
	});
}


