/**
 * 1) Open a new tab and Firebug on it.
 * 2) Select e.g. Net panel
 * 3) Reload the page.
 * 4) Verify that the context associated with the page exists and is active.

 */

function runTest()
{
    FBTest.sysout("activeContextAfterReload.START");
    var url =
    FBTestFirebug.openNewTab(basePath + "firebug/OpenFirebugOnThisPage.html", function(win)
    {
        FBTest.progress(win.location+"page is open");
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableNetPanel();

        FBTestFirebug.reload(function()
        {
            FBTest.progress("reloaded");
            FBTest.ok(FW.FirebugContext, "The current context must not be null");
            FBTest.ok(isContextActive(FW.FirebugContext), "The current context must be active");
            FBTestFirebug.testDone("activeContextAfterReload.DONE");
        });
    });
}

function isContextActive(context)
{
    var active = false;
    FW.Firebug.eachActiveContext(function(ctx) {
        if (context == ctx)
            active = true;
    });
    return active;
}
