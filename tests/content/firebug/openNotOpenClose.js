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
                FBTest.ok(openNotOpenClose.wasFirebugOpen, "hideUI can be called only if Firebug was open");
            },
        },
        moduleListener:
        {
            showContext: function(browser, context)
            {
                    FBTest.ok( !(context), "showContext should be called with null context");
                    FBTest.sysout("openNotOpenClose showContext "+(!context), context);
            },
        }
    };
    openNotOpenClose.wasFirebugOpen = FBTest.Firebug.isFirebugOpen();
    openNotOpenClose.fireOnNewPage("onNewPage", openNotOpenCloseURL, testListener);
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