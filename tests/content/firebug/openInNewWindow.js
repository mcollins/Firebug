/**
 * 1) Open a new tab and Firebug UI on it, enable all
 * 2) Detach into new window.
 * 3) Check that some stuff is working
 * 4) Reload page and check all panels again (must be still enabled).
 */
function runTest()
{
    FBTest.sysout("openInNewWindow.START");
    FBTestFirebug.openNewTab(basePath + "firebug/OpenFirebugOnThisPage.html", function(win)
    {
        FBTest.progress("opened tab for "+win.location);
        FBTestFirebug.openFirebug();

        FBTest.progress("Enable all panels");
        FBTestFirebug.enableAllPanels();

        FBTest.progress("Detach");
        var detachedFW = FW.Firebug.detachBar();

        // check some stuff

        FBTest.progress("detachedFW "+detachedFW.location);

        FBTest.progress("Now reload");

        FBTestFirebug.reload(function ()
        {
            FBTest.progress("reloaded, check detachedFW "+detachedFW.location);

            FBTest.progress("close detached window");
            detachedFW.close();

            FBTestFirebug.testDone("openInNewWindow.DONE");
        });
    });
}

