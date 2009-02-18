


function openOpenCloseClose()
{
    var openOpenCloseCloseURL = FBTest.getHTTPURLBase()+"firebug/OpenFirebugOnThisPage.html";

    var openOpenCloseClose = new FBTest.Firebug.TestHandlers("openOpenCloseClose");

    // Actual test operations
    openOpenCloseClose.add( function onNewPage(event)
    {
        FBTrace.sysout("onNewPage starts", event);
        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(!isFirebugOpen, "Firebug starts closed");

        this.next = "onShowUI";
        FBTest.Firebug.pressToggleFirebug();

    });

    openOpenCloseClose.add( function onShowUI()
    {
        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(isFirebugOpen, "Firebug now open");

        FBTest.ok(this.next == "onShowUI", "showUI followed toggleFirebug");

        if (FBTest.FirebugWindow.FirebugContext)
        {
            var contextName = FBTest.FirebugWindow.FirebugContext.getName();
            FBTest.ok(true, "chromeWindow.FirebugContext "+contextName);
            FBTest.ok(contextName == openOpenCloseCloseURL, "FirebugContext set to "+openOpenCloseCloseURL);
        }
        else
            FBTest.ok(false, "no FirebugContext");
        // now close it
        this.next = "onHideUI";
        FBTest.Firebug.pressToggleFirebug();

    });

    openOpenCloseClose.add( function onHideUI()
    {
        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(!isFirebugOpen, "Firebug now closed");

        FBTest.ok(this.next == "onHideUI", "hideUI followed toggleFirebug");
        openOpenCloseClose.done();
    });

    var testListener =
    {
        uiListener:
        {
            showUI: function(browser, context) // called when the Firebug UI comes up in browser or detached
            {
                openOpenCloseClose.fire("onShowUI");
            },

            hideUI: function(brower, context)  // called when the Firebug UI comes down
            {
                openOpenCloseClose.fire("onHideUI");
            },
        }
    };

    // Now start the test.
    FBTest.Firebug.setToKnownState();
    openOpenCloseClose.fireOnNewPage("onNewPage", openOpenCloseCloseURL, testListener);
}



//------------------------------------------------------------------------
// Auto-run test

function runTest()
{
    FBTest.sysout("Activation.started");
    initialize();
    FBTrace.sysout("activation.js FBTest", FBTest);

    if (FBTest.FirebugWindow)
        FBTest.ok(true, "We have the Firebug Window: "+FBTest.FirebugWindow.location);
    else
        FBTest.ok(false, "No Firebug Window");

    // Auto run sequence
    openOpenCloseClose();
}
