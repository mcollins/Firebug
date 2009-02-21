// Test entry point.
function runTest()
{
    FBTest.loadScript("net/env.js", this);
    FBTest.sysout("openOnLocalPage.START");

    var localBaseUrl = FBTest.getLocalURLBase(); 
    openNewTab(localBaseUrl + "firebug/openOnLocalPage.html", function(win)
    {
        // Open Firebug UI and realod the page.
        openFirebug();
        reload(function(win) 
        {
            FBTest.ok(isFirebugOpen(), "Firebug UI must be opened now.");
            testDone("openOnLocalPage.DONE");
        });
    });
}
