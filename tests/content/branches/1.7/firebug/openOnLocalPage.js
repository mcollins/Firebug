// Test entry point.
function runTest()
{
    FBTest.sysout("openOnLocalPage.START");
    FBTestFirebug.openNewTab(basePath + "firebug/openOnLocalPage.html", function(win)
    {
        // Open Firebug UI and realod the page.
        FBTestFirebug.openFirebug(); 
        FBTest.sysout("openOnLocalPage reloading");
        FBTestFirebug.reload(function(win) 
        {
            FBTest.ok(FBTestFirebug.isFirebugOpen(), "Firebug UI must be opened now.");
            FBTestFirebug.testDone("openOnLocalPage.DONE");
        });
    });
}
