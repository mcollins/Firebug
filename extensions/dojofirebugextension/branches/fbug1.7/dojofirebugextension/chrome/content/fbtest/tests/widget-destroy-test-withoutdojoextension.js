
// Test entry point.
function runTest() {
		
	setPreferences();
	
	FBTest.sysout("widget-destroy-test START");
	FBTest.openURL(basePath + "widget-destroy-test.html", function(win) {

		FBTest.openFirebug();
		disableDojoPanel();
		
	    FBTest.reload(function(win) {
	    	with (FBTest.FirebugWindow.FBL) {
		    try {
		    	win = unwrapObject(win);
		    	var dijit = win.dijit;
		    	var pageInitialNumberOfConnections = win.connCounter;
		    	var pageInitialNumberOfSubscriptions = win.subsCounter;
		    	var pageInitialNumberOfWidgets = _toArray(dijit.registry).length;
		    	if(pageInitialNumberOfWidgets == NaN) {
		    		pageInitialNumberOfWidgets = 0;
		    	}

		    	FBTest.progress("pageInitialNumberOfConnections: " + pageInitialNumberOfConnections);
		    	FBTest.progress("pageInitialNumberOfSubscriptions: " + pageInitialNumberOfSubscriptions);
		    	FBTest.progress("pageInitialNumberOfWidgets: " + pageInitialNumberOfWidgets);
		    					
				testButtonWidget(win, dijit, pageInitialNumberOfWidgets, pageInitialNumberOfConnections, pageInitialNumberOfSubscriptions);

		    	//A DIALOG NOW...
				/* 
				 * Important note: dijit.Dialog also initializes the DialogUnderlay widget wich remains in registry.
				 * That's valid. So we need to increment the number of originalWidget + from now on...
				 */
//				pageInitialNumberOfWidgets++;
//				testWithDialog(win, dijit, pageInitialNumberOfWidgets, pageInitialNumberOfConnections, pageInitialNumberOfSubscriptions);

				
		    	//a TabContainer now (it adds subscriptions)...
				testWithTabContainerWidget(win, dijit, pageInitialNumberOfWidgets, pageInitialNumberOfConnections, pageInitialNumberOfSubscriptions);
				
				verifyEverythingWasCleanedUp(win, dijit, pageInitialNumberOfWidgets, pageInitialNumberOfConnections, pageInitialNumberOfSubscriptions);
								
				FBTest.compare(pageInitialNumberOfConnections, win.connCounter, "Comparison between page actual connections and page initial number of connections");
				FBTest.compare(pageInitialNumberOfSubscriptions, win.subsCounter, "Comparison between page actual subscriptions and page initial number of subscriptions");
				
		    } catch (err) {
		        FBTest.exception("Test: ", err);
		    } finally {
		    	//FW.Firebug.currentContext.connectionsAPI.destroy();
		        FBTest.testDone();
		    }
	    }});
	});
    
}

function testButtonWidget(win, dijit, originalWidgets, originalConnections, originalSubscriptions) {
	FBTest.progress("START OF tests with dijit.Button");
	for ( var i = 0; i < 2; i++) {

		//create button3 widget and check registry
    	win.createButton3();
    	var wid = dijit.byId("button3");
    	FBTest.ok(wid != null, "Button3 widget exists on registry");		    	
    	var conns = win.connCounter;
    	FBTest.ok(conns > originalConnections, "New number of connections is greater than at the beginning. New number: " +  conns + ". Original: " + originalConnections);    		    
    	FBTest.compare(originalWidgets + 1, _toArray(dijit.registry).length, "There should be 1 more widget in the registry");
    	
    	//now, try to create it again. we should get "widget already in registry" error... 
    	try {
    		win.createButton3();
    		FBTest.ok(false, "button3 was already on the registry!");
    	} catch (alreadyExist) {
    		FBTest.ok(true, "OK: button3 is already on the registry, so it cannot be created again");
    	}
    	
    	wid = dijit.byId("button3");
    	FBTest.ok(wid != null,"Button3 widget exists on registry");
    	win.destroyButton3();
    	FBTest.compare(null, win.button3, "button3 created and destroyed");
    	wid = dijit.byId("button3");
    	FBTest.compare(null, wid, "Button3 widget doesn't exist on registry");    	

    	verifyEverythingWasCleanedUp(win, dijit, originalWidgets, originalConnections, originalSubscriptions);
    }
}

function testWithTabContainerWidget(win, dijit, originalWidgets, originalConnections, originalSubscriptions) {
	FBTest.progress("START OF tests with TabContainer");
	for ( var i = 0; i < 2; i++) {
    	//create and destroy a tabContainer
    	FBTest.progress("creating TabContainer");
    	win.createTabContainer();
    	var conns = win.connCounter;
    	var subs = win.subsCounter;
    	FBTest.ok(conns > originalConnections, "New number of connections is greater than at the beginning. New number: " +  conns + ". Original: " + originalConnections);
    	FBTest.ok(subs > originalSubscriptions, "New number of subscriptions is greater than at the beginning. New number: " + subs + ". Original: " + originalSubscriptions);		    	

    	//destroy the dialog...
    	FBTest.progress("about to destroy TabContainer");
    	win.destroyTabContainer();	    	

    	verifyEverythingWasCleanedUp(win, dijit, originalWidgets, originalConnections, originalSubscriptions);
	}
}

function testWithDialog(win, dijit, originalWidgets, originalConnections, originalSubscriptions) {
	FBTest.progress("START OF tests with Dialog");
	for ( var i = 0; i < 2; i++) {

    	//create and destroy a dialog
    	FBTest.progress("creating dialog");
    	win.createAndShowDialog();
    	var conns = win.connCounter;
    	var subs = win.subsCounter;
    	FBTest.ok(conns > originalConnections, "New number of connections is greater than at the beginning. New number: " +  conns + ". Original: " + originalConnections);
    	FBTest.ok(subs > originalSubscriptions, "New number of subscriptions is greater than at the beginning. New number: " + subs + ". Original: " + originalSubscriptions);		    	

    	//destroy the dialog...
    	FBTest.progress("about to destroy dialog");
    	win.destroyDialog();	    	

    	verifyEverythingWasCleanedUp(win, dijit, originalWidgets, originalConnections, originalSubscriptions);
	}	
}

function verifyEverythingWasCleanedUp(win, dijit, originalWidgets, originalConnections, originalSubscriptions) {
	//connections and subscriptions should be the same as when we started
	var conns = win.connCounter;
	var subs = win.subsCounter;
	FBTest.compare(originalConnections, conns, "Number of connections remained the same as the beginning. Actual number is: " + conns);
	FBTest.compare(originalSubscriptions, subs, "Number of subscriptions remained the same as the beginning. Actual number is: " + subs);
	FBTest.compare(originalWidgets, _toArray(dijit.registry).length, "registry should contain same number of widgets as in the beginning");	
}


//function _toArray(/*WidgetSet*/ registry) {
//	var ar = [];
//	var clientFn = function(elem) {
//		ar.push(elem);
//	};
//	FBTest._addMozillaExecutionGrants(clientFn);
//	registry.forEach(clientFn);
//	return ar;
//}
