
/**
 * Test for Browser#getBrowserContext(id)
 * 
 * A browser context can be retrieved via its identifier.
 */

function runTest()
{
	var browser = new FW.Browser(); // TODO 
    var url = FBTest.getHTTPURLBase()+"bti/browser/testGetContexts.html";
    FBTest.progress("getContext(id), open test page "+url);
    FBTestFirebug.openNewTab(url, function(win)
    {
        var contexts = browser.getBrowserContexts();
        FBTest.ok(contexts.length > 0, "Should be at least one context");
        for ( var i = 0; i < contexts.length; i++) {
			var context = contexts[i];
			var candidate = browser.getContext(context.getId());
			FBTest.ok(candidate == context, "Contexts should be identical");
		}
        FBTest.testDone("done test #getContext(id)");
    });
}
