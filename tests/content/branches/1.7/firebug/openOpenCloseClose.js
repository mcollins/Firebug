


function openOpenCloseClose()
{
    var openOpenCloseCloseURL = FBTest.getHTTPURLBase()+"firebug/OpenFirebugOnThisPage.html";

    FBTestFirebug.openNewTab(openOpenCloseCloseURL, function openFirebug(win)
    {
        FBTest.progress("opened tab for "+win.location);

        var open = FW.Firebug.chrome.isOpen();
        FBTest.ok(!open, "Firebug starts closed");

        FBTest.progress("Press the toggle Firebug");
        FBTest.Firebug.pressToggleFirebug();

        var placement = FBTest.FirebugWindow.Firebug.getPlacement();
        FBTest.compare("inBrowser", placement, "Firebug now open inBrowser");

        if (FBTest.FirebugWindow.Firebug.currentContext)
        {
            var contextName = FBTest.FirebugWindow.Firebug.currentContext.getName();
            FBTest.ok(true, "chromeWindow.Firebug.currentContext "+contextName);
            FBTest.ok(contextName == openOpenCloseCloseURL, "Firebug.currentContext set to "+openOpenCloseCloseURL);
        }
        else
            FBTest.ok(false, "no Firebug.currentContext");

        FBTest.progress("Press the toggle Firebug");
        FBTest.Firebug.pressToggleFirebug();

        var placement = FBTest.FirebugWindow.Firebug.getPlacement();
        FBTest.compare("minimized", placement, "Firebug minimizes");

        FBTest.progress("Press the toggle Firebug");
        FBTest.Firebug.pressToggleFirebug();

        placement = FBTest.FirebugWindow.Firebug.getPlacement();
        FBTest.compare("inBrowser", placement, "Firebug reopens inBrowser");

        FBTest.progress("Close Firebug");
        FBTest.Firebug.closeFirebug();

        var open = FW.Firebug.chrome.isOpen();
        FBTest.ok(!open, "Firebug closed");

        FBTestFirebug.testDone("openOpenCloseClose.DONE");
    });
}



//------------------------------------------------------------------------
// Auto-run test

function runTest()
{
    FBTest.sysout("Activation.started");
    FBTest.sysout("activation.js FBTest", FBTest);

    if (FBTest.FirebugWindow)
        FBTest.ok(true, "We have the Firebug Window: "+FBTest.FirebugWindow.location);
    else
        FBTest.ok(false, "No Firebug Window");

    // Auto run sequence
    openOpenCloseClose();
}
