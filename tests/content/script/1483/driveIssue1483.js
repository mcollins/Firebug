function defineIssue1483()
{
    window.issue1483 = new FBTest.Firebug.TestHandlers("issue1483");

    // Actual test operations
    issue1483.add( function onNewPage(event)
    {
        // Open Firebug UI, enable Script panel, reload and start first test.
        FBTestFirebug.openFirebug();
        FBTestFirebug.clearCache();
        FBTestFirebug.selectPanel("script");
        FBTestFirebug.enableScriptPanel(function callbackOnReload(testWindow) {
            win = testWindow;
            issue1483.selectFile();
        });
    });

    issue1483.fileName = "index.js";
    issue1483.lineNo = 5;

    issue1483.selectFile = function()
    {
     // Select proper JS file.
        var panel = FW.FirebugContext.chrome.getSelectedPanel();

        var found = FBTest.Firebug.selectPanelLocationByName(panel, issue1483.fileName);
        FBTest.compare(found, true, "The "+issue1483.fileName+" should be found");
        if (found)
        {
            FBTest.Firebug.selectSourceLine(panel.location.href, issue1483.lineNo, "js");
            issue1483.setBreakpoint();
        }
        else
            issue1483.done();
    };

    issue1483.setBreakpoint = function(event)
    {
        var panel = FW.FirebugContext.chrome.getSelectedPanel();
        panel.toggleBreakpoint(issue1483.lineNo);

        // use chromebug to see the elements that make up the row
        var row = FBTestFirebug.getSourceLineNode(issue1483.lineNo);
        FBTest.compare("true", row.getAttribute('breakpoint'), "Line "+issue1483.lineNo+" should have a breakpoint set");

        issue1483.secondReload(panel);
    };


    issue1483.secondReload = function(panel)
    {
        FBTest.progress("Listen for exeline true, meaning the breakpoint hit");

        var doc = panel.panelNode.ownerDocument; // panel.html
        function waitForBreakpoint(event)
        {
            if (event.attrName == "exeline" && event.newValue == "true")
            {
                doc.removeEventListener("DOMAttrModified", waitForBreakpoint, waitForBreakpoint.capturing);
                FBTest.progress("Hit BP, exeline set, check breakpoint");
                var panel = FW.FirebugContext.chrome.getSelectedPanel();
                FBTest.compare("script", panel.name, "The script panel should be selected");


                var row = FBTestFirebug.getSourceLineNode(issue1483.lineNo);
                if (!row)
                {
                    FBTest.ok(false, "Row "+issue1483.lineNo+" must be found");
                    return;
                }

                var bp = row.getAttribute('breakpoint');
                FBTest.compare("true", bp, "Line "+issue1483.lineNo+" should have a breakpoint set");

                FBTest.progress("Remove breakpoint");
                var panel = FW.FirebugContext.chrome.getSelectedPanel();
                panel.toggleBreakpoint(issue1483.lineNo);

                var row = FBTestFirebug.getSourceLineNode(issue1483.lineNo);
                FBTest.compare("false", row.getAttribute('breakpoint'), "Line "+issue1483.lineNo+" should NOT have a breakpoint set");

                var canContinue = FBTestFirebug.clickContinueButton();
                FBTest.ok(canContinue, "The continue button is pushable");

                FBTestFirebug.testDone("issue1483.DONE");
            }
        }
        waitForBreakpoint.capturing = false;
        doc.addEventListener("DOMAttrModified", waitForBreakpoint, waitForBreakpoint.capturing);

        FBTestFirebug.reload( function noOP() {});
    }
}

//------------------------------------------------------------------------
// Auto-run test

function runTest()
{
    FBTest.sysout("1483 runTest starts");

    if (FBTest.FirebugWindow)
        FBTest.ok(true, "We have the Firebug Window: "+FBTest.FirebugWindow.location);
    else
        FBTest.ok(false, "No Firebug Window");

    // Auto run sequence
    defineIssue1483();
    var issue1483URL = FBTest.getHTTPURLBase()+"script/1483/issue1483.html";
    issue1483.fireOnNewPage("onNewPage", issue1483URL, null);
}