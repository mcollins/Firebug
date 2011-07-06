// FIXME: This constant should be loaded from the dojofirebugextension.js file, not redefined.
var DOCUMENTATION_OPTION = "documentation_option";

// Test entry point.
function runTest()
{	
	
	setPreferences();
	
	FBTest.sysout("Documentation support test START");
	
	FBTest.openURL(basePath + "documentation_support.html", function(win) {
		FBTest.openFirebug();
	    FBTest.enableAllPanels();
	    enableDojoPanel();
	    
		FBTest.reload(function(win){
			try {
				win = FBTest.FirebugWindow.FBL.unwrapObject(win);
				var panel = FW.FirebugChrome.selectPanel("dojofirebugextension"); //get our panel
				var context = FW.Firebug.currentContext; //context!
	
				
				// Test for non dojo object
				var noDocMenuItems = panel.getContextMenuItems(win.simpleButton, context);
				FBTest.compare(0, getCountOfOptionsForType(noDocMenuItems, DOCUMENTATION_OPTION), "Menu must NOT INCLUDE documentation items");
								
				// Test for dijit widget
				var menuItemsWithDoc = panel.getContextMenuItems(win.dijitButton, context);
				FBTest.compare(2, getCountOfOptionsForType(menuItemsWithDoc, DOCUMENTATION_OPTION), "Menu must INCLUDE documentation items");
			
			} catch (err) {
				FBTest.exception("Test: ", err);
		    } finally {
		        FBTest.testDone();
		    }	
		});
	});
}

// FIXME: This method is already defined in the options_menu.js. Find how to load a js file with common functionality.
/**
 * This method is used to count the number of options of a certain type in the options list.
 * @param options the option list
 * @param type the option type
 * @return return the number of option for the type
 */
/*int*/var getCountOfOptionsForType = function(options, type){
	var realCount = 0;
	for (var i = 0; i < options.length ; i++) {
		if ((options[i]['optionType']) == type){
			realCount ++;
		}
	} 
	return realCount;
};