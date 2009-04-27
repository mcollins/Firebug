


function allOpenAllClose()
{
    FBTest.progress("All Close");
    FW.Firebug.toggleAll("off");

    window.allOpenAllCloseURL = FBTest.getHTTPURLBase()+"firebug/OpenFirebugOnThisPage.html";

    FBTestFirebug.openNewTab(allOpenAllCloseURL, function openFirebug(win)
    {
        FBTest.progress("opened tab for "+win.location);

        var isFirebugOpen = FBTestFirebug.isFirebugOpen();
        FBTest.ok(!isFirebugOpen, "Firebug starts closed");

        FBTest.progress("All Open");
        FW.Firebug.toggleAll("on");

        allOpened();  // allow UI to come up then check it
    });
}

function allOpened()
{
    var isFirebugOpen = FBTestFirebug.isFirebugOpen();
    FBTest.ok(isFirebugOpen, "Firebug now open");

    if (FBTest.FirebugWindow.FirebugContext)
    {
        var contextName = FBTest.FirebugWindow.FirebugContext.getName();
        FBTest.ok(true, "chromeWindow.FirebugContext "+contextName);
        FBTest.ok(contextName == allOpenAllCloseURL, "FirebugContext set to "+allOpenAllCloseURL);
    }
    else
        FBTest.ok(false, "no FirebugContext");

    FBTestFirebug.openNewTab(basePath + "firebug/AlsoOpenFirebugOnThisPage.html", alsoOpened);
}

function alsoOpened(win)
{
    FBTest.progress("Opened "+win.location);

    var isFirebugOpen = FBTestFirebug.isFirebugOpen();
    FBTest.ok(!isFirebugOpen, "Firebug opened because of all open");

    FBTest.ok(FW.FirebugContext.minimized, "Firebug is minimized");

    var statusbarIcon = FW.document.getElementById('fbStatusIcon');

    var toolTip = statusbarIcon.getAttribute("tooltiptext");
    var number = /^(\d).*Firebugs/.exec(toolTip);
    if (number)
        FBTest.compare("2", number[1], "Should be 2 Firebugs now");

    FW.Firebug.toggleAll("off");

    var isFirebugOpen = FBTestFirebug.isFirebugOpen();
    FBTest.ok(!isFirebugOpen, "Firebug closed by all off");

    var toolTip = statusbarIcon.getAttribute("tooltiptext");
    var number = /^(\d).*Firebugs/.exec(toolTip);
    FBTest.ok(!number, "Should be no Firebugs now");

    FW.Firebug.toggleAll("none");

    var toolTip = statusbarIcon.getAttribute("tooltiptext");
    var number = /all pages/.exec(toolTip);
    FBTest.ok(!number, "Should be All pages info");


    FBTestFirebug.testDone("allOpenAllClose.DONE");
}

//------------------------------------------------------------------------
// Auto-run test

function runTest()
{
    FBTest.sysout("allOpenAllClose.started");

    if (FBTest.FirebugWindow)
        FBTest.ok(true, "We have the Firebug Window: "+FBTest.FirebugWindow.location);
    else
        FBTest.ok(false, "No Firebug Window");

    // Auto run sequence
    allOpenAllClose();
}
