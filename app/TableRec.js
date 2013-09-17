function TableRec(placeName, song, artist, lyrics) 
{

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