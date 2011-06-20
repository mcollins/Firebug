// FIXME: This constants should be loaded from the dojofirebugextension.js file, not redefined.
var CONNECTIONS_BP_OPTION = "connections_bp_option";
var SUBSCRIPTIONS_BP_OPTION = "subscriptions_bp_option";
var DOCUMENTATION_OPTION = "documentation_option";
var WIDGET_OPTION = "widget_option";

/**
 * Test : options listed on right click over some reps.
 * 
 *  FIXME we cannot test based on labels with i18n !
 */
function runTest()
{	
	setPreferences();
	
	FBTest.sysout("Options menu for dojo objects test START");
	
	FBTest.openURL(basePath + "objects_panel_support.html", function(win) {
		FBTest.openFirebug();
	    FBTest.enableAllPanels();
	    enableDojoPanel();
	    
		FBTest.reload(function(win){
			win = FBTest.FirebugWindow.FBL.unwrapObject(win);
			try {
				var panel = FW.FirebugChrome.selectPanel("dojofirebugextension"); //get our panel
				var context = FW.Firebug.currentContext; //context!
				
				// Show the connections table.
				panel.showConnectionsInTable(context);
				
				// Html Connections reps
				var htmlConnections = panel.panelNode.getElementsByClassName("dojo-connection");
				
				// Check connection
				var dojoConnectionHtmlNode = htmlConnections.item(0);
				var options = panel.getContextMenuItems(dojoConnectionHtmlNode['referencedObject'], dojoConnectionHtmlNode, context);
				FBTest.compare(3, options.length, "There should be 3 options for a connection.");
				FBTest.compare(3, getCountOfOptionsForType(options, CONNECTIONS_BP_OPTION), "There should be 3 'Break on' options for a connection.");
				
				// Check widget with connections
				var widgetWithConnectionHtmlNode = panel.panelNode.getElementsByClassName("dojo-widget")[0];
				options = panel.getContextMenuItems(widgetWithConnectionHtmlNode['referencedObject'], widgetWithConnectionHtmlNode, context);
				FBTest.compare(9, options.length, "There should be 9 options for a widget part of a connection."); //we need to count "-" menuitems
				FBTest.compare(3, getCountOfOptionsForType(options, CONNECTIONS_BP_OPTION), "There should be 3 'Break on' options for a widget within a connection.");
				FBTest.compare(2, getCountOfOptionsForType(options, DOCUMENTATION_OPTION), "There should be 2 'Documentation' options for a widget within a connection.");
				FBTest.compare(1, getCountOfOptionsForType(options, WIDGET_OPTION), "There should be 1 widget options for a widget within a connection.");
				
				// FIXME: Get a real widget without connections representation. There should be 2 widgets options.
				// Check widget without connections
				options = panel.getContextMenuItems(widgetWithConnectionHtmlNode['referencedObject'], panel.panelNode, context);
				FBTest.compare(4, options.length, "There should be 4 options for a plain widget."); //we need to count "-" menuitems
				FBTest.compare(2, getCountOfOptionsForType(options, DOCUMENTATION_OPTION), "There should be 2 'Documentation' options for a plain widget.");
				
				// Show the subscriptions tree.
				panel.showSubscriptions(context);
				
				// Check subscription
				var dojoSubscriptionHtmlNode = panel.panelNode.getElementsByClassName("dojo-subscription").item(0);
				options = panel.getContextMenuItems(dojoSubscriptionHtmlNode['referencedObject'], dojoSubscriptionHtmlNode, context);
				FBTest.compare(2, options.length, "There should be 2 options for a subscription.");
				FBTest.compare(2, getCountOfOptionsForType(options, SUBSCRIPTIONS_BP_OPTION), "There should be 2 'Break on' options for a subscription.");
			} catch (err) {
				FBTest.exception("Test: ", err);
		    } finally {
		        FBTest.testDone();
		    }	

		});
	});
}

/**
 * This method is used to count the number of options of a certain type in the options list.
 * @param options the option list
 * @param type the option type
 * @return return the number of option for the type
 */
/*int*/ var getCountOfOptionsForType = function(options, type){
	var realCount = 0;
	for (var i = 0; i < options.length ; i++) {
		if ((options[i]['optionType']) == type){
			realCount ++;
		}
	} 
	return realCount;
};
