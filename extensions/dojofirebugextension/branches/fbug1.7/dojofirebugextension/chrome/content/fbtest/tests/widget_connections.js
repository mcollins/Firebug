window.FBTestTimeout = 60000; // override the default test timeout [ms].

// Test entry point.
function runTest()
{	
	setPreferences();
	
	FBTest.sysout("widget_connections test START");
	
	try {
		verifyWidgetConnections("widget_connections_Dojo1.5.html", 3, 7, function(){
			verifyWidgetConnections("widget_connections_Dojo1.4.html", 0, 2, function(){
				verifyWidgetConnections("widget_connections_Dojo1.3.2.html", 0, 5, function(){
					FBTest.testDone();
				});
			});
		});
	} catch (err) {
		FBTest.exception("Test: ", err);
		FBTest.testDone();
    }
}

function verifyWidgetConnections(testPageUrl, expectedIncomming, expectedOutgoing, callbackFunc){
	FBTest.openURL(basePath + testPageUrl, function(win) {
		FBTest.openFirebug();
		FBTest.enableAllPanels();
		enableDojoPanel();
		
	    FBTest.reload(function(win){
	    	win = FBTest.FirebugWindow.FBL.unwrapObject(win);
			try {
				var panel = FW.FirebugChrome.selectPanel("dojofirebugextension"); //get our panel
				var context = FW.Firebug.currentContext; //context!
				
				var api = context.connectionsAPI;
				var conns = api.getConnections();
				var dijit = win.dijit;
				
				var button = dijit.byId("button2");
				var connsForButton = api.getConnection(button);
				
				FBTest.ok((connsForButton != null) , "There are connections for button.");
				
				// Number of incoming connections
				testNumberOfIncommingConnection(expectedIncomming, connsForButton);
			
				// Number of outgoing connections
				testNumberOfOutgoingConnection(expectedOutgoing, connsForButton);
				
				// Check widget.connect
//				button.connect(win.objA, 'funcTest', 'newMethod');
//				var connsForObjA = api.getConnection(win.objA);
//				FBTest.ok((connsForObjA != null) , "There are connections for objA.");
				
				// Outgoing connection increase one for button.
				//testNumberOfOutgoingConnection(expected+1, connsForButton);
				
			} catch (err) {
				FBTest.exception("Test: ", err);
			}
		    
			callbackFunc();
		});
	});
};

function testNumberOfIncommingConnection(expected, connectionInfo){
	FBTest.compareHash(expected, connectionInfo.getIncommingConnectionsEvents().length, "Number of events with incoming connections: " + expected);
}

function testNumberOfOutgoingConnection(expected, connectionInfo){
	FBTest.compareHash(expected, connectionInfo.getOutgoingConnectionsMethods().length, "Number of functions with outgoing connections: " + expected);
}

function applyTests(context) {

}
