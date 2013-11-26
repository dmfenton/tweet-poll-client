/* ****************************************************************
	This is the main driver for the web (non-mobile) version of the 
   	Twitter Poll app 
	***************************************************************/
   
var _map;
var _service;
var _twitter;
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
	
	_service = new AGOLService(
		function(flag) {
			_locations = Common.createGraphics(_service.getRecsSortedByCount(), Config.SYMBOL_BASE_SIZE, Config.SYMBOL_COLOR);
			writeTable(_service.getRecsSortedByName());	
			if (flag) {
				finishInit();
			} else {
				Common.loadGraphics(_map, _locations);	
			}	
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
	
	_map = new esri.Map("map", {slider:false});
	_map.addLayer(new esri.layers.ArcGISTiledMapServiceLayer(Config.BASEMAP_SERVICE));
	_map.centerAndZoom(_center, Config.LEVEL);

	if(_map.loaded){
		finishInit();
	} else {
		dojo.connect(_map,"onLoad",function(){
			finishInit();
		});
	}
}

function finishInit() {
	
	if (!_locations) return false;	
	if (!_map.loaded) return false;
	
	$("#listIcon").click(function(e) {
		deselect();
    });
	
	Common.loadGraphics(_map, _locations);	
	
	var starterName = Common.getStarterName(Config.PARAMETER_STANDARDIZEDNAME);
	if (starterName) {
		var results = $.grep(_locations, function(n, i) {
			return n.attributes.getStandardizedName() == starterName;
		});
		if (results.length > 0) {
			_selected = results[0];
			postSelection();
			_map.centerAndZoom(_selected.geometry, 5);
		}
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

/*****************
	core functions
*******************/

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
			fetchTweets(recs);		
			flipToLyrics();
		});	
	});
	
}

function fetchTweets(recs)
{	
	var count = 0;
	$.each(recs, function(index, value) {
		_twitter.fetch(value.tweet_id, 
						function(result){
							count++;
							$("#info").append(result.html);
							$("#info").append("<br>");
							$("#info").append("<br>");
							if (count == recs.length) {
								$("#info").slideDown();
							}
						}, 
						function(event){
							count++;
							if (count == recs.length) {
								$("#info").slideDown();
							}							
						}
						);
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
		graphic.setSymbol(Common.createSymbol(Config.SYMBOL_BASE_SIZE*graphic.attributes.getCount()+3, Config.SYMBOL_COLOR, 0.35));
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
	graphic.setSymbol(Common.createSymbol(Config.SYMBOL_BASE_SIZE*graphic.attributes.getCount(), Config.SYMBOL_COLOR, 0.25));
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

function writeTable(list)
{
	$("#table").empty();
	var li;
	$.each(list, function(index, value){
		li = "<li>"+value.short_name+"<div class='hiddenData'>"+value.standardized_name+"</div></li>";
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