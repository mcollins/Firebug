// Test entry point.
/***************************************************************************
* The use of the dijit.MenuItem widget involve an access to the __parent__ 
* property that generate an error, so a fix must be applied to avoid it.
***************************************************************************/
function runTest()
{	
	
	setPreferences();
	
	FBTest.sysout("menu_item test START");
	
	FBTest.openURL(basePath + "menu_item.html", function(win) {
		FBTest.openFirebug();
	    FBTest.enableAllPanels();
	    enableDojoPanel();
	    
		FBTest.reload(function(win){
			win = FBTest.FirebugWindow.FBL.unwrapObject(win);
			var panel = FW.FirebugChrome.selectPanel("dojofirebugextension"); //get our panel
			var context = FW.Firebug.currentContext; //context!
			
			try {
		    	var api = context.connectionsAPI;
		    	var conns = api.getConnections();
		    	
		    	// compare number of registered connections
		        FBTest.compare(18, conns.length, "number of connections made should be 18");

			} catch (err) {
		        FBTest.exception("Test: ", err);
		    } finally {
		        FBTest.testDone();
		    }	
		});
	});
}
