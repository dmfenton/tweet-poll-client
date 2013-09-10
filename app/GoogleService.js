function GoogleService()
{
	
	var SPREADSHEET_URL = "https://docs.google.com/spreadsheet/pub?key=0ApQt3h4b9AptdHdvUDd4NnRVOEhpcExwQldNN3BlZHc&output=csv";
	var PROXY_URL = window.location.href.toLowerCase().indexOf("storymaps.esri.com") >= 0 ? "http://storymaps.esri.com/proxy/proxy.ashx" : "http://localhost/proxy/proxy.ashx";

	var SPREADSHEET_FIELDNAME_PLACENAME = "Place name";
	var SPREADSHEET_FIELDNAME_SONG = "Song";
	var SPREADSHEET_FIELDNAME_ARTIST = "Artist";
	var SPREADSHEET_FIELDNAME_HANDLE = "Handle";
	var SPREADSHEET_FIELDNAME_LYRICS = "Lyrics";
	var SPREADSHEET_FIELDNAME_X = "X";
	var SPREADSHEET_FIELDNAME_Y = "Y";
	var SPREADSHEET_FIELDNAME_STANDARDIZEDNAME = "Standardized Name";
	
	esri.config.defaults.io.proxyUrl = PROXY_URL;
	
	var _recsSpreadSheet;
	
	this.getLocations = function(callBack)
	{
		var serviceCSV = new CSVService();
		$(serviceCSV).bind("complete", function() {	
			_recsSpreadSheet = parseSpreadsheet(serviceCSV.getLines());
			callBack(getLocations());
		});
		serviceCSV.process(SPREADSHEET_URL);
	}
	
	
	this.queryRecsByCity = function(name, callBack)
	{
		var temp = $.grep(_recsSpreadSheet, function(n,i){return n[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME] == name});
		var final = [];
		$.each(temp, function(index, value) {
			final.push(new TableRec(value[SPREADSHEET_FIELDNAME_PLACENAME],value[SPREADSHEET_FIELDNAME_SONG],value[SPREADSHEET_FIELDNAME_ARTIST],value[SPREADSHEET_FIELDNAME_LYRICS]));
		});
		callBack(final);
	}
	
	function getLocations()
	{
		var unique = [];
		var graphic;
		$.each(_recsSpreadSheet, function(index, value){
			if ($.inArray(value[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME], unique) == -1) {
				unique.push(value[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME]);
			}
		});
	
		locations = [];
		var recs;
		var rec;
		var sym;
		var pt;
		var atts;
		$.each(unique, function(index, value) {
			recs = $.grep(_recsSpreadSheet, function(n,i){return n[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME] == value});
			rec = recs[0];
			sym = createSymbol(recs.length*SYMBOL_BASE_SIZE,0.25);
			if ($.trim(rec[SPREADSHEET_FIELDNAME_X]) != "") {
				pt = new esri.geometry.Point(rec[SPREADSHEET_FIELDNAME_X], rec[SPREADSHEET_FIELDNAME_Y]);
				atts = new LocationRec(
					rec[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME].split(",")[0],
					rec[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME],
					recs.length
				);
				locations.push(new esri.Graphic(pt, sym, atts));
			}
		});
	
		// sort unique locations in descending order of count
		locations.sort(function(a,b){return b.attributes.count - a.attributes.count});	
		return locations;
	}

	function parseSpreadsheet(lines)
	{
		var parser = new ParserMain([
			SPREADSHEET_FIELDNAME_PLACENAME,
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
		
}