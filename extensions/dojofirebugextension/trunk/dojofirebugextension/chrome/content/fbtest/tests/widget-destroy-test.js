
// Test entry point.
function runTest() {
	
	setPreferences();
	
	FBTest.sysout("widget-destroy-test START");
	FBTest.openURL(basePath + "widget-destroy-test.html", function(win) {

		FBTest.openFirebug();
		FBTest.disableAllPanels();
		FBTest.enableAllPanels();
		enableDojoPanel();
		
	    FBTest.reload(function(win) {
	    	win = FBTest.FirebugWindow.FBL.unwrapObject(win);
		    try {
		    	var pageInitialNumberOfConnections = win.connCounter;
		    	var pageInitialNumberOfSubscriptions = win.subsCounter;
		    	FBTest.progress("pageInitialNumberOfConnections: " + pageInitialNumberOfConnections);
		    	FBTest.progress("pageInitialNumberOfSubscriptions: " + pageInitialNumberOfSubscriptions);
		    	
				var panel = FW.FirebugChrome.selectPanel("dojofirebugextension"); //get our panel
				var context = FW.Firebug.currentContext; //context!
				var dijit = win.dijit;
				
				var api = context.connectionsAPI;
				var originalConnections = api.getConnections().length; //array
				var originalSubscriptions = api.getSubscriptionsList().length; //array
				var originalWidgets = panel.getWidgets(context).length;
				
				//check current number of connections and subscriptions
				FBTest.ok(originalSubscriptions > 0, "Number of subscriptions is greater than 0. It is: " + originalSubscriptions);
				FBTest.ok(originalConnections > 0, "Number of connections is greater than 0. It is: " + originalConnections);
				FBTest.ok(originalWidgets > 0, "Number of widgets in registry is greater than 0. It is: " + originalWidgets);				
				
				testButtonWidget(win, panel, api, context, dijit, originalWidgets, originalConnections, originalSubscriptions);

		    	//A DIALOG NOW...
				/* 
				 * Important note: dijit.Dialog also initializes the DialogUnderlay widget wich remains in registry.
				 * That's valid. So we need to increment the number of originalWidget + from now on...
				 */
//				originalWidgets++;
//				testWithDialog(win, panel, api, context, dijit, originalWidgets, originalConnections, originalSubscriptions);

		    	//a TabContainer now (it adds subscriptions)...
				testWithTabContainerWidget(win, panel, api, context, dijit, originalWidgets, originalConnections, originalSubscriptions);

				
				verifyEverythingWasCleanedUp(win, panel, api, context, dijit, originalWidgets, originalConnections, originalSubscriptions);
				
				FBTest.compare(api.getConnections().length, win.connCounter + (originalConnections - pageInitialNumberOfConnections), "Comparison between page connections and our number of connections");
				FBTest.compare(api.getSubscriptionsList().length, win.subsCounter + (originalSubscriptions - pageInitialNumberOfSubscriptions), "Comparison between page subscriptions and our number of subscriptions");
				
				FBTest.compare(pageInitialNumberOfConnections, win.connCounter, "Comparison between page actual connections and page initial number of connections");
				FBTest.compare(pageInitialNumberOfSubscriptions, win.subsCounter, "Comparison between page actual subscriptions and page initial number of subscriptions");
				
		    } catch (err) {
		        FBTest.exception("Test: ", err);
		    } finally {
		    	//FW.Firebug.currentContext.connectionsAPI.destroy();
		        FBTest.testDone();
		    }
	    });
	});
    
}

function testButtonWidget(win, panel, api, context, dijit, originalWidgets, originalConnections, originalSubscriptions) {
	FBTest.progress("START OF tests with dijit.Button");
	for ( var i = 0; i < 2; i++) {

		//create button3 widget and check registry
    	win.createButton3();
    	var wid = dijit.byId("button3");
    	FBTest.ok(wid != null, "Button3 widget exists on registry");		    	
    	var conns = api.getConnections().length;
    	FBTest.ok(conns > originalConnections, "New number of connections is greater than at the beginning. New number: " +  conns + ". Original: " + originalConnections);    		    
    	FBTest.compare(originalWidgets + 1, panel.getWidgets(context).length, "There should be 1 more widget in the registry");
    	
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

    	verifyEverythingWasCleanedUp(win, panel, api, context, dijit, originalWidgets, originalConnections, originalSubscriptions);	}	
}

function testWithTabContainerWidget(win, panel, api, context, dijit, originalWidgets, originalConnections, originalSubscriptions) {
	FBTest.progress("START OF tests with TabContainer");
	for ( var i = 0; i < 2; i++) {
    	//create and destroy a tabContainer
    	FBTest.progress("creating TabContainer");
    	win.createTabContainer();
    	var conns = api.getConnections().length;
    	var subs = api.getSubscriptionsList().length;
    	FBTest.ok(conns > originalConnections, "New number of connections is greater than at the beginning. New number: " +  conns + ". Original: " + originalConnections);
    	FBTest.ok(subs > originalSubscriptions, "New number of subscriptions is greater than at the beginning. New number: " + subs + ". Original: " + originalSubscriptions);		    	

    	//destroy the dialog...
    	FBTest.progress("about to destroy TabContainer");
    	win.destroyTabContainer();	    	

    	verifyEverythingWasCleanedUp(win, panel, api, context, dijit, originalWidgets, originalConnections, originalSubscriptions);	}	
}

function testWithDialog(win, panel, api, context, dijit, originalWidgets, originalConnections, originalSubscriptions) {
	FBTest.progress("START OF tests with Dialog");
	for ( var i = 0; i < 2; i++) {

    	//create and destroy a dialog
    	FBTest.progress("creating dialog");
    	win.createAndShowDialog();
    	var conns = api.getConnections().length;
    	var subs = api.getSubscriptionsList().length;			    	
    	FBTest.ok(conns > originalConnections, "New number of connections is greater than at the beginning. New number: " +  conns + ". Original: " + originalConnections);
    	FBTest.ok(subs > originalSubscriptions, "New number of subscriptions is greater than at the beginning. New number: " + subs + ". Original: " + originalSubscriptions);		    	

    	//destroy the dialog...
    	FBTest.progress("about to destroy dialog");
    	win.destroyDialog();	    	

    	verifyEverythingWasCleanedUp(win, panel, api, context, dijit, originalWidgets, originalConnections, originalSubscriptions);
	}	
}

function verifyEverythingWasCleanedUp(win, panel, api, context, dijit, originalWidgets, originalConnections, originalSubscriptions) {
	//connections and subscriptions should be the same as when we started
	var conns = api.getConnections().length;
	var subs = api.getSubscriptionsList().length;  	
	FBTest.compare(originalConnections, conns, "Number of connections remained the same as the beginning. Actual number is: " + conns);
	FBTest.compare(originalSubscriptions, subs, "Number of subscriptions remained the same as the beginning. Actual number is: " + subs);
	FBTest.compare(originalWidgets, panel.getWidgets(context).length, "registry should contain same number of widgets as in the beginning");	
}

//function _toArray(/*WidgetSet*/ registry) {
//	//FIXME este puede estar metiendo problemas con el == 
//	var ar = [];
//	registry.forEach(function(elem) {
//		ar.push(elem);
//	});
//	return ar;
//}
