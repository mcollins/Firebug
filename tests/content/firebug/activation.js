function runTest()
{
    FBTest.sysout("Activation.started");
 FBTrace.sysout("activation.js FBTest", FBTest);
    if (FBTest.FirebugWindow)
        FBTest.ok(true, "We have the Firebug Window: "+FBTest.FirebugWindow.wrappedJSObject);
    else
        FBTest.ok(false, "No Firebug Window");

    var win = FBTest.FirebugWindow;

    // ****************************************************************
    // Operations on Firebug
    FBTest.pressKey = function(keyCode)
    {
        var doc = win.document;
        var keyEvent = doc.createEvent("KeyboardEvent");
        keyEvent.initKeyEvent(
                "keypress",        //  in DOMString typeArg,
                true,             //  in boolean canBubbleArg,
                true,             //  in boolean cancelableArg,
                null,             //  in nsIDOMAbstractView viewArg,  Specifies UIEvent.view. This value may be null.
                false,            //  in boolean ctrlKeyArg,
                false,            //  in boolean altKeyArg,
                false,            //  in boolean shiftKeyArg,
                false,            //  in boolean metaKeyArg,
                 keyCode,               //  in unsigned long keyCodeArg,
                 0);              //  in unsigned long charCodeArg);

        doc.documentElement.dispatchEvent(keyEvent);
    },

    FBTest.pressToggleFirebug = function()
    {
        this.pressKey(123); // F12
    }

    FBTest.user = function(whenISee, iDoThis)
    {
        var intervalID = setInterval(function waiting()
        {
            if (whenISee())
            {
                clearInterval(intervalID);
                iDoThis();
            }
        }, 100);
    }
    // *******************************************************************

    var activationTestURL = "http://www.google.ca";

    // Actual test operations
    this.activationTest = function()
    {
        if (win.location.spec == activationTestURL)
        {
            FBTest.pressToggleFirebug();

            if (win.FirebugContext)
                FBTest.ok(true, "win.FirebugContext "+win.FirebugContext.getName());
            else
                FBTest.ok(false, "no FirebugContext");
        }
    }

    // Hook test to events in victim
    win.gBrowser.addEventListener("load", this.activationTest, true);

    // Fire up browser
    win.FBL.openNewTab(activationTestURL);

    FBTest.testDone();
}
