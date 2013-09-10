function TableRec(placeName, song, artist, lyrics, x, y, standardizedName) 
{
	console.log(placeName, song, artist, lyrics, x, y, standardizedName);
	this.getPlaceName = function() {
		return placeName;
	}
	
	this.getSong = function() {
		return song;
	}
	
	this.getArtist = function() {
		return artist;
	}
	
	this.getLyrics = function() {
		return lyrics;
	}
		
}