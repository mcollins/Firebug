function issue1483()
{
    var issue1483URL = FBTest.getHTTPURLBase()+"script/1483/issue1483.html";


    var issue1483 = new FBTest.Firebug.TestHandlers("issue1483");

    // Actual test operations
    issue1483.add( function onNewPage(event)
    {
        FBTrace.sysout("onNewPage starts", event);
        FBTest.ok(!FBTest.Firebug.isFirebugOpen(), "Firebug should be closed");
        issue1483.done();
    });

    var testListener =
    {
        uiListener:
        {
            showUI: function(browser, context) // called when the Firebug UI comes up in browser or detached
            {
                FBTest.ok(false, "showUI should not be called on this page");
            },

            hideUI: function(broswer, context)  // called when the Firebug UI comes down
            {
                FBTest.ok(issue1483.wasFirebugOpen, "hideUI can be called only if Firebug was open");
            },
        },
        moduleListener:
        {
            showContext: function(browser, context)
            {
                    FBTest.ok( !(context), "showContext should be called with null context");
                    FBTrace.sysout("issue1483 showContext "+(!context), context);
            },
        }
    };
    issue1483.wasFirebugOpen = FBTest.Firebug.isFirebugOpen();
    issue1483.fireOnNewPage("onNewPage", issue1483URL, testListener);
}

//------------------------------------------------------------------------
// Auto-run test

function runTest()
{
	FBTrace.sysout("1483 runTest starts");

    if (FBTest.FirebugWindow)
        FBTest.ok(true, "We have the Firebug Window: "+FBTest.FirebugWindow.location);
    else
        FBTest.ok(false, "No Firebug Window");

    // Auto run sequence
    issue1483();
}