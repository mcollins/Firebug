function defineSingleStepping()
{
    window.singleStepping = new FBTest.Firebug.TestHandlers("singleStepping");

    // Actual test operations
    singleStepping.add( function onNewPage(event)
    {
        // Open Firebug UI, enable Script panel, reload and start first test.
        FBTestFirebug.openFirebug();
        FBTestFirebug.clearCache();
        FBTestFirebug.selectPanel("script");
        FBTestFirebug.enableScriptPanel(function callbackOnReload(testWindow) {
            singleStepping.window = testWindow;
            singleStepping.selectFile();
        });
    });

    singleStepping.fileName = "index.html";
    singleStepping.breakOnNextLineNo = 2;

    singleStepping.selectFile = function()
    {
     // Select proper JS file.
        var panel = FBTestFirebug.getSelectedPanel();

        var found = FBTest.Firebug.selectPanelLocationByName(panel, singleStepping.fileName);
        FBTest.compare(found, true, "The "+singleStepping.fileName+" should be found");
        if (found)
        {
            singleStepping.breakOnNext(panel);
        }
        else
            singleStepping.done();
    };

    singleStepping.breakOnNext = function(panel)
    {
        var canBreakOnNext = FBTestFirebug.clickContinueButton(true);
        FBTest.ok(canBreakOnNext, "The breakOnNext button was pushable");

        var doc = FW.document;
        var button = doc.getElementById("fbContinueButton");
        FBTest.compare("false", button.getAttribute("breakable"), "The button is armed for break")

        FBTest.progress("Listen for exeline true, meaning the breakOnNext hit");

        var doc = panel.panelNode.ownerDocument; // panel.html
        function waitForBreakpoint(event)
        {
            if (event.attrName == "exeline" && event.newValue == "true")
            {
                doc.removeEventListener("DOMAttrModified", waitForBreakpoint, waitForBreakpoint.capturing);
                FBTest.progress("Hit BP, exeline set, check exeline");
                var panel = FW.FirebugContext.chrome.getSelectedPanel();
                FBTest.compare("script", panel.name, "The script panel should be selected");


                var row = FBTestFirebug.getSourceLineNode(singleStepping.breakOnNextLineNo);
                FBTest.ok(row, "Row "+singleStepping.breakOnNextLineNo+" must be found");

                FBTestFirebug.testDone("singleStepping.DONE");
            }
        }
        waitForBreakpoint.capturing = false;
        doc.addEventListener("DOMAttrModified", waitForBreakpoint, waitForBreakpoint.capturing);

        var testPageButton = singleStepping.window.document.getElementById("clicker");
        FBTest.click(testPageButton);
    }
}

//------------------------------------------------------------------------
// Auto-run test

function runTest()
{
    FBTest.sysout("1603 runTest starts");

    if (FBTest.FirebugWindow)
        FBTest.ok(true, "We have the Firebug Window: "+FBTest.FirebugWindow.location);
    else
        FBTest.ok(false, "No Firebug Window");

    // Auto run sequence
    defineSingleStepping();
    var singleSteppingURL = FBTest.getHTTPURLBase()+"script/singleStepping/index.html";
    singleStepping.fireOnNewPage("onNewPage", singleSteppingURL, null);
}