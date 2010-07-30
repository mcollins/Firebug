function runTest()
{
    FBTest.sysout("issue1299.START");

    var pageURI = basePath + "net/1299/issue1299.html";
    var scriptURI = basePath + "net/1299/issue1299.js";

    FBTestFirebug.clearCache();
    FBTestFirebug.openNewTab(pageURI, function(win)
    {
        FBTestFirebug.enableScriptPanel(function(win)
        {
            // Remove issue1299.js from Firebug cache.
            FW.FirebugContext.sourceCache.invalidate(scriptURI);

            // Let's load the issue1299.js file again. It's already
            // included within the test page so, it must be in 
            // Firefox cache now.
            win.runTest(function(request)
            {
                // OK, the script file must be in Firebug cache again.
                var text = FW.FirebugContext.sourceCache.loadText(scriptURI);

                FBTest.compare(request.responseText, text,
                    "Firebug should cache even files coming directly from Firefox cache.");

                FBTestFirebug.testDone("issue1299.DONE");
            });
        });
    });
}
