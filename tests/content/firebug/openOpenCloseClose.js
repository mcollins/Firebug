


function openOpenCloseClose()
{
    var openOpenCloseCloseURL = FBTest.getHTTPURLBase()+"firebug/OpenFirebugOnThisPage.html";

    FBTestFirebug.openNewTab(openOpenCloseCloseURL, function openFirebug(win)
    {
        FBTest.progress("opened tab for "+win.location);

        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(!isFirebugOpen, "Firebug starts closed");

        FBTestFirebug.openFirebug();

        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(isFirebugOpen, "Firebug now open");

        if (FBTest.FirebugWindow.FirebugContext)
        {
            var contextName = FBTest.FirebugWindow.FirebugContext.getName();
            FBTest.ok(true, "chromeWindow.FirebugContext "+contextName);
            FBTest.ok(contextName == openOpenCloseCloseURL, "FirebugContext set to "+openOpenCloseCloseURL);
        }
        else
            FBTest.ok(false, "no FirebugContext");

        FBTest.Firebug.pressToggleFirebug();

        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(!isFirebugOpen, "Firebug closed");

        FBTest.ok(FW.FirebugContext.minimized, "Firebug is minimized");

        FBTest.Firebug.pressToggleFirebug();

        isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(isFirebugOpen, "Firebug reopens");

        FBTest.Firebug.closeFirebug();

        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(!isFirebugOpen, "Firebug closed");

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
