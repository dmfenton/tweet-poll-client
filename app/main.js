/******************************************************
***************** begin config section ****************
*******************************************************/

var TITLE = "#WhereToLive"
var BASEMAP_SERVICE = "http://tiles.arcgis.com/tiles/nGt4QxSblgDfeJn9/arcgis/rest/services/DGCM_2Msmaller_BASE/MapServer";

var PARAMETER_STANDARDIZEDNAME = "standardizedName";

var SYMBOL_BASE_SIZE = 7;
var SYMBOL_COLOR = {r:255,g:0,b:0};

var CENTER_X = -10910315;
var CENTER_Y = 4002853;
var LEVEL = 4;
var REFRESH_RATE = 3000;

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

dojo.addOnLoad(function() {_dojoReady = true;init()});
jQuery(document).ready(function() {_jqueryReady = true;init()});

function init() {
	
	if (!_jqueryReady) return;
	if (!_dojoReady) return;
	
	$(document).keydown(onKeyDown);
	
	_service = new HerokuService();
	
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
	
	$("#listIcon").click(function(e) {
		deselect();
    });
	
	loadGraphics();	
	writeTable();
	
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
	
	if (REFRESH_RATE > 0) setTimeout(refreshLocations, REFRESH_RATE);
	
}

/*****************
	core functions
*******************/

function refreshLocations()
{
	_service.getLocations(function(locations){
		
		_locations = locations; 
		var matches;
		var flag = false;
		$.each(_locations, function(index, value) {
			matches = $.grep(_map.graphics.graphics, function(n, i) {
				return n.attributes.getStandardizedName() == value.attributes.getStandardizedName();
			});
			if (matches.length > 0) {
				if (matches[0].attributes.getCount() != value.attributes.getCount()) {
					console.log("count changed");
					flag = true;
				}
			} else {
				console.log("new one!");
				flag = true;
			}
		});
		
		if (flag) {
			console.log("wiping graphics");
			loadGraphics();
			writeTable();			
		}
		
		setTimeout(refreshLocations, REFRESH_RATE);
		
	});
	
}


/**********
	events
**********/

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
	adjustExtent();
}

function tableRec_onClick(event)
{
	deselect();
	$(this).addClass("selected");
	var standardizedName = $(this).find(".hiddenData").html();
	_selected = $.grep(_locations, function(n, i){return n.attributes.getStandardizedName() == standardizedName})[0];
	postSelection();
	adjustExtent();
}

function onKeyDown(e)
{

	if (e.keyCode == 27) {
		if (_selected) {
			deselect();
		}
	}
	
}

/*******************
	helper functions
********************/

function adjustExtent()
{
	// make sure point doesn't occupy right-most 400px of map.
	if ((_map.toScreen(_selected.geometry).x > ($("#map").width() - 400)) || (!_map.extent.expand(0.75).contains(_selected.geometry))) 
		_map.centerAt(_selected.geometry);
}

function deselect()
{
	_selected = null;
	$(".page1 li").removeClass("selected");
	if ($('.page2').is(':visible')) flipToTable();
	$("#map").multiTips({
		pointArray : [],
		labelValue: "",
		mapVariable : _map,
		labelDirection : "top",
		backgroundColor : "#FFFFFF",
		textColor : "#000000",
		pointerColor: "#FFFFFF"
	});		
}

function loadGraphics()
{
	_map.graphics.clear();
	$.each(_locations, function(index, value) {
		_map.graphics.add(value);
	});
}

function postSelection()
{
	
	if ($("#question").css("display") != "none") $("#question").slideUp();
	$("#locationTitle").empty();
	$("#locationTitle").append("<b>"+_selected.attributes.getShortName()+"</b>");	
	
	$("#info").slideUp(null,null,function(){
		$("#map").multiTips({
			pointArray : [_selected],
			labelValue: _selected.attributes.getShortName(),
			mapVariable : _map,
			labelDirection : "top",
			backgroundColor : "#FFFFFF",
			textColor : "#000000",
			pointerColor: "#FFFFFF"
		});		
	
		_service.queryRecsByCity(_selected.attributes.getStandardizedName(), function(recs){
	
			$("#info").empty();
			writeLyrics(recs);		
			flipToLyrics();
		});	
	});
	
}

function writeLyrics(recs)
{
	
	var PROXY_URL = window.location.href.toLowerCase().indexOf("storymaps.esri.com") >= 0 ? 
						"http://storymaps.esri.com/proxy/proxy.ashx" : 
						"http://localhost/proxy/proxy.ashx";
						
	var SERVICE_URL = PROXY_URL+"?https://api.twitter.com/1/statuses/oembed.json"
	
	var count = 0;
	$.each(recs, function(index, value) {
		$.ajax({
			type: 'GET',
			url: SERVICE_URL+"?id="+value.tweet_id,
			cache: true,
			success: function(result) {
				count++;
				$("#info").append(result.html);
				$("#info").append("<br>");
				$("#info").append("<br>");
				if (count == recs.length) {
					$("#info").slideDown();
				}
			}, 
			error: function(event) {
				count++;
				if (count == recs.length) {
					$("#info").slideDown();
				}
			}
		});			
	});
}

function writeTable()
{
	var list = [];
	$.each(_locations, function(index, value){
		list.push({name: value.attributes.getShortName(), standardizedName: value.attributes.getStandardizedName()});
	});
	list.sort(function(a,b){
		if (a.name < b.name) return -1;
		if (a.name > b.name) return 1;
		return 0;
	});
	$("#table").empty();
	var li;
	$.each(list, function(index, value){
		li = "<li>"+value.name+"<div class='hiddenData'>"+value.standardizedName+"</div></li>";
		$("#table").append(li);
	});
	$(".page1 li").click(tableRec_onClick);
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
	$("#map").height($("body").height());
	$("#map").width($("body").width());
	_map.resize();
	$("#info").css("max-height", $("#map").height()-260);
	$("#table").css("max-height", $("#map").height()-175);	
}

function createSymbol(size, opacity)
{
	return new esri.symbol.SimpleMarkerSymbol(
				esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, size,
				new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([SYMBOL_COLOR.r, SYMBOL_COLOR.g, SYMBOL_COLOR.b]), 2),
				new dojo.Color([SYMBOL_COLOR.r, SYMBOL_COLOR.g, SYMBOL_COLOR.b, opacity])
			);	
}