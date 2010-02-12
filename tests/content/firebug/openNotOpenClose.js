function runTest()
{
    if (FBTest.FirebugWindow)
        FBTest.ok(true, "We have the Firebug Window: "+FBTest.FirebugWindow.location);
    else
        FBTest.ok(false, "No Firebug Window");

    FBTest.sysout("openNotOpenClose; START");
    FBTestFirebug.openNewTab(basePath + "firebug/NeverOpenFirebugOnThisPage.html", function(win)
    {
        FBTest.sysout("onNewPage starts");
        FBTest.ok(!FBTest.Firebug.isFirebugOpen(), "Firebug should be closed");
        FBTestFirebug.testDone("openNotOpenClose.DONE");
    });
}
