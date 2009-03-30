function openNotOpenClose()
{
    var openNotOpenCloseURL = FBTest.getHTTPURLBase()+"firebug/NeverOpenFirebugOnThisPage.html";


    var openNotOpenClose = new FBTest.Firebug.TestHandlers("openNotOpenClose");

    // Actual test operations
    openNotOpenClose.add( function onNewPage(event)
    {
        FBTest.sysout("onNewPage starts", event);
        FBTest.ok(!FBTest.Firebug.isFirebugOpen(), "Firebug should be closed");
        openNotOpenClose.done();
    });

    openNotOpenClose.wasFirebugOpen = FBTest.Firebug.isFirebugOpen();
    openNotOpenClose.fireOnNewPage("onNewPage", openNotOpenCloseURL);
}

//------------------------------------------------------------------------
// Auto-run test

function runTest()
{
    if (FBTest.FirebugWindow)
        FBTest.ok(true, "We have the Firebug Window: "+FBTest.FirebugWindow.location);
    else
        FBTest.ok(false, "No Firebug Window");

    // Auto run sequence
    openNotOpenClose();
}