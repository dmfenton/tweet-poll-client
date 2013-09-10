function AGOLService()
{

	var FEATURE_SERVICE_URL = "http://services.arcgis.com/nzS0F0zdNLvs7nc8/arcgis/rest/services/Lyrical_Places/FeatureServer/0";

	var SPREADSHEET_FIELDNAME_PLACENAME = "Place_name";
	var SPREADSHEET_FIELDNAME_SONG = "Song";
	var SPREADSHEET_FIELDNAME_ARTIST = "Artist";
	var SPREADSHEET_FIELDNAME_HANDLE = "Handle";
	var SPREADSHEET_FIELDNAME_LYRICS = "Lyrics";
	var SPREADSHEET_FIELDNAME_X = "X";
	var SPREADSHEET_FIELDNAME_Y = "Y";
	var SPREADSHEET_FIELDNAME_STANDARDIZEDNAME = "Standardized_Name";
	
	var ADDITIONAL_FIELDNAME_COUNT = "Count";
		
	this.getLocations = function(callBack) 
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
						value.attributes[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME].split(",")[0],
						value.attributes[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME],
						value.attributes[ADDITIONAL_FIELDNAME_COUNT]
					);
					if ($.trim(value.attributes[SPREADSHEET_FIELDNAME_X]) != "") {
						pt = new esri.geometry.Point(value.attributes[SPREADSHEET_FIELDNAME_X], value.attributes[SPREADSHEET_FIELDNAME_Y]);
						locations.push(new esri.Graphic(pt, createSymbol(att.getCount()*SYMBOL_BASE_SIZE,0.25), att));
					}
			  });
			// sort unique locations in descending order of count
			locations.sort(function(a,b){return b.attributes.getCount() - a.attributes.getCount()});
			callBack(locations);	
		  }
		});		
	}
	
	this.queryRecsByCity = function(name,callBack)
	{
		
		var query = new esri.tasks.Query();
		query.where = SPREADSHEET_FIELDNAME_STANDARDIZEDNAME + " = '" + name+"'";
		query.returnGeometry = false;
		query.outFields = ["*"];
		
		var queryTask = new esri.tasks.QueryTask(FEATURE_SERVICE_URL);
		queryTask.execute(query, function(result){
			var recs = [];
			$.each(result.features, function(index, value){
				recs.push(new TableRec(
					value.attributes[SPREADSHEET_FIELDNAME_PLACENAME],
					value.attributes[SPREADSHEET_FIELDNAME_SONG],
					value.attributes[SPREADSHEET_FIELDNAME_ARTIST],
					value.attributes[SPREADSHEET_FIELDNAME_LYRICS],
					value.attributes[SPREADSHEET_FIELDNAME_X],
					value.attributes[SPREADSHEET_FIELDNAME_Y],
					value.attributes[SPREADSHEET_FIELDNAME_STANDARDIZEDNAME]
				));
			});
			callBack(recs);
		});	
	}
	
	
}