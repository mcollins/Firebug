var imc = new Class({
	request : function () {
		var jsonRequest = new Request.JSON({
			noCache: true,
			url: 'firebug.php',
			onSuccess: function(answer){

				  if(answer.success == true) {
					
  					console.log('there are still products, let us match agian');
  
  					jsonRequest.send();
  
  				} else {
  					console.log('Matchin complete');
  
  				}
		    },
		    onFailure: function(xhr) {
          console.log(xht);
        }
    
    });
		jsonRequest.send();
	}
});