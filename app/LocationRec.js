function LocationRec(shortName, standardizedName, count) 
{
	this.getShortName = function() {
		return shortName;
	}
	
	this.getStandardizedName = function() {
		return standardizedName;
	}
	
	this.getCount = function() {
		return count;
	}
	
}