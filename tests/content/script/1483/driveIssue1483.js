function issue1483()
{
    var issue1483URL = FBTest.getHTTPURLBase()+"script/1483/issue1483.html";


    var issue1483 = new FBTest.Firebug.TestHandlers("issue1483");

    // Actual test operations
    issue1483.add( function onNewPage(event)
    {
        // Open Firebug UI, enable Script panel, reload and start first test.
        FBTestFirebug.openFirebug();
        FBTestFirebug.clearCache();
        FBTestFirebug.selectPanel("script");
        FBTestFirebug.enableScriptPanel(function callbackOnReload(testWindow) {
            win = testWindow;
            issue1483.fire("selectFile");
        });
    });

    issue1483.fileName = "index.js";
    issue1483.lineNo = 5;

    issue1483.add( function selectFile(event)
    {
     // Select proper JS file.
        var panel = FW.FirebugContext.chrome.getSelectedPanel();

        var found = FBTest.Firebug.selectPanelLocationByName(panel, issue1483.fileName);
        FBTest.compare(found, true, "The "+issue1483.fileName+" should be found");
        if (found)
        {
            FBTest.Firebug.selectSourceLine(panel.location.href, issue1483.lineNo, "js");
            issue1483.fire("setBreakpoint");
        }
        else
            issue1483.done();
    });

    issue1483.add( function setBreakpoint(event)
    {
        var panel = FW.FirebugContext.chrome.getSelectedPanel();
        panel.toggleBreakpoint(issue1483.lineNo);

        // use chromebug to see the elements that make up the row
        var row = FBTestFirebug.getSourceLineNode(issue1483.lineNo);
        FBTest.compare("true", row.getAttribute('breakpoint'), "Line "+issue1483.lineNo+" should have a breakpoint set");

        nowSecondReload();
    });


    issue1483.wasFirebugOpen = FBTest.Firebug.isFirebugOpen();
    issue1483.fireOnNewPage("onNewPage", issue1483URL, null);
}

function nowSecondReload(event)
{
    FBTest.progress("Second reload event fired");

    FBTestFirebug.reload(function secondReloadHandler(window)
            {
                FBTest.progress("second reload complete, check breakpoint");
                var row = FBTestFirebug.getSourceLineNode(issue1483.lineNo);
                FBTest.compare("true", row.getAttribute('breakpoint'), "Line "+issue1483.lineNo+" should have a breakpoint set");

                FBTest.progress("remove breakpoint");
                var panel = FW.FirebugContext.chrome.getSelectedPanel();
                panel.toggleBreakpoint(issue1483.lineNo);

                var row = FBTestFirebug.getSourceLineNode(issue1483.lineNo);
                FBTest.compare("false", row.getAttribute('breakpoint'), "Line "+issue1483.lineNo+" should NOT have a breakpoint set");

                var canContinue = FBTestFirebug.clickContinueButton();
                FBTest.ok(canContinue, "The continue button is pushable");

                FBTestFirebug.testDone("issue1483.DONE");
            });
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
    issue1483();
}