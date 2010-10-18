
/**
 * Test event listener call back for #onContextLoaded 
 * 
 * When a new tab is opened, a loaded call back should be triggered
 */

function runTest()
{
	var browser = new FW.Browser(); // TODO 
    var url = FBTest.getHTTPURLBase()+"bti/browser/testGetContexts.html";
    browser.addEventListener("onContextLoaded", function(context){
		FBTest.compare(context.getURL(), url, "URL of newly loaded context should be " +url);
		FBTest.testDone("done test #onContextLoaded()");
	});
    FBTest.progress("onContextLoaded, open test page "+url);
    FBTestFirebug.openNewTab(url, function(win)
    {
    	FBTest.progress("onContextLoaded, new tab opened "+url);
    });
}
