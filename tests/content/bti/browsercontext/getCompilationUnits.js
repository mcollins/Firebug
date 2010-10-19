
/**
 * Test for BrowserContext#getCompilationUnits() and #getCompilationUnit(url)
 * 
 * A HTML file with two scripts (one internal, one external).
 */

function runTest()
{
	var browser = new FW.Browser(); // TODO 
    var url = FBTest.getHTTPURLBase()+"bti/browsercontext/testScripts.html";
    browser.addEventListener("onContextCreated", function(context) {
    	FBTest.progress("getCompilationUnits, context created");
		FBTest.compare(context.getURL(), url, "URL of newly created context should be " +url);
		FBTest.progress("getCompilationUnits, retrieving compilation units");
		context.getCompilationUnits(function(units){
			FBTest.progress("getCompilationUnits, compilation units retrieved");
			FBTest.compare(2, units.length, "Should be two compilation units");
			var unit = context.getCompilationUnit(url);
			FBTest.ok(unit, "compilation unit does not exist: " + url);
			var other = FBTest.getHTTPURLBase()+"bti/browsercontext/simpleExternal.js";
			unit = context.getCompilationUnit(other);
			FBTest.ok(unit, "compilation unit does not exist:" + other);
			FBTest.testDone("done test #getCompilationUnits()");
		});
		
	});
    FBTest.progress("getCompilationUnits, open test page "+url);
    FBTestFirebug.openNewTab(url, function(win)
    {
    	FBTest.progress("getCompilationUnits, new tab opened "+url);
    });
}
