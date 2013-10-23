function TwitterService() 
{
	
	var PROXY_URL = window.location.href.toLowerCase().indexOf("storymaps.esri.com") >= 0 ? 
						"http://storymaps.esri.com/proxy/proxy.ashx" : 
						"http://localhost/proxy/proxy.ashx";
						
	var SERVICE_URL = PROXY_URL+"?https://api.twitter.com/1/statuses/oembed.json";
	
	this.fetch = function(tweet_id, callback_success, callback_error)
	{
		console.log(tweet_id);
		$.ajax({
			type: 'GET',
			url: SERVICE_URL+"?id="+tweet_id,
			cache: true,
			success: callback_success, 
			error: callback_error
		});		
	}
	
}