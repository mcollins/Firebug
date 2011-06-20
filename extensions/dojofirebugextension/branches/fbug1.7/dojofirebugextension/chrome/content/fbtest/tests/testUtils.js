/* See license.txt for terms of usage */
(function() {

//DEFAULT TIMEOUT FOR DOJO TESTS: 20 secs	
window.FBTestTimeout = 20000;





//required as of FF 4
if(!window._addMozillaExecutionGrants) {
	window._addMozillaExecutionGrants = function(fn) {
		if(!fn.__exposedProps__) {
			fn.__exposedProps__ = {};
		}		
		fn.__exposedProps__.apply = "r";
		fn.__exposedProps__.call = "r";
	};
}

if(!window.enableDojoPanel) {
	window.enableDojoPanel = function(callback) {
	    FBTest.setPanelState(FBTest.FirebugWindow.Firebug.DojoExtension, "dojofirebugextension", callback, true);
	};
}

if(!window.disableDojoPanel) {
	window.disableDojoPanel = function(callback) {
		FBTest.setPanelState(FBTest.FirebugWindow.Firebug.DojoExtension, "dojofirebugextension", callback, false);
	};
}
	
window._toArray = function(/*WidgetSet*/ registry) {
	//FIXME este puede estar metiendo problemas con el == 
	var ar = [];
	var clientFn = function(elem) {
		ar.push(elem);
	};
	window._addMozillaExecutionGrants(clientFn);
	registry.forEach(clientFn);
	return ar;
};

/**
 * Verification method. Compares expected and actuall string (typially from the Firebug UI).
 * If <i>actuall</i> and <i>expected<i> parameters are equal the test passes, otherwise fails.
 * @param {String} expected Expected value
 * @param {String} actual Actual value
 * @param {String} msg A message to be displayed as a test result under the current test
 *      within the test console.
 */
FBTest.compareHash = function(expected, actual, msg)
{

	var DojoExtension = FBTest.FirebugWindow.Firebug.DojoExtension;
	var useHashCodes = DojoExtension._isHashCodeBasedDictionaryImplementationEnabled();
	if(!useHashCodes) {
		return FBTest.compare(expected, actual, msg);
	}
	
	//hashcodes are enabled...	

	FBTest.progress("FBTest.compareHash about to compare with useHashCodes == true");
	
	var result;
	result = DojoExtension.DojoModel.areEqual(expected, actual, useHashCodes);
	
    FBTest.sysout("compareHash "+(result?"passes":"**** FAILS ****")+" "+msg, {expected: expected, actual: actual});

    FBTestApp.TestRunner.appendResult(new FBTestApp.TestResult(window,
        result, msg, expected, actual));

    if (result)
        FBTest.resetTimeout();
    else
        FBTest.onFailure(msg);

    return result;
};

window.setPreferences = function() {

	//Note: default impl does nothing. It simply uses default prefs

	//sets preferences : function(pref, value)
//	FBTest.setPref("dojofirebugextension.useHashCodes", false);
//	FBTest.setPref("dojofirebugextension.breakPointPlaceDisabled", false);

};


})();