// Test entry point.
function runTest()
{	
	
	setPreferences();
	
	FBTest.sysout("Objects panel supprot test START");
	
	FBTest.openURL(basePath + "objects_panel_support.html", function(win) {
		FBTest.openFirebug();
	    FBTest.enableAllPanels();
	    enableDojoPanel();
	    
		FBTest.reload(function(win){
			win = FBTest.FirebugWindow.FBL.unwrapObject(win);
			try {
				// Test for non dojo object
				verifyPanelSupport(win.objC, false, false, false, "objC");
				
				// Test for widget
				verifyPanelSupport(win.widgetButton, true, true, false, "widgetButton");
				
				// Test for object with connections
				verifyPanelSupport(win.simpleButton, true, true, false, "simpleButton");
				
				// Test for object with subscriptions
				verifyPanelSupport(win.objB, true, false, true, "objB");
			
			} catch (err) {
				FBTest.exception("Test: ", err);
		    } finally {
		        FBTest.testDone();
		    }	

		});
	});
}

function verifyPanelSupport(object, mainPanelExpected, connectionsSidePanelExpected, subscriptionSidePanelExpected, objectMsg){
	var dojoMainPanel = FBTest.getPanel("dojofirebugextension");
	var dojoConnectionSidePanel = FBTest.getPanel("connectionsSidePanel");
	var dojoSubscriptionSidePanel = FBTest.getPanel("subscriptionsSidePanel");

	FBTest.compare(mainPanelExpected, dojoMainPanel.supportsObject(object) > 0,
		"The dojo main panel should " + (mainPanelExpected ? '' : 'not ') + "support the " + objectMsg + ".");
		
	FBTest.compare(connectionsSidePanelExpected, dojoConnectionSidePanel.supportsObject(object) > 0,
		"The connections side panel should " + (connectionsSidePanelExpected ? '' : 'not ') + "support the " + objectMsg + ".");
		
	FBTest.compare(subscriptionSidePanelExpected, dojoSubscriptionSidePanel.supportsObject(object) > 0,
		"The subscriptions side panel should " + (subscriptionSidePanelExpected ? '' : 'not ') + "support the " + objectMsg + ".");
	
}

function verifyResult(panelExpected, supportResult){
	return (panelExpected) ? supportResult : (supportResult == 0);
}
