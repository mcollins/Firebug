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
        var panel = FW.Firebug.chrome.getSelectedPanel();

        var found = FBTestFirebug.selectPanelLocationByName(panel, issue1483.fileName);
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
        var panel = FW.Firebug.chrome.getSelectedPanel();
        panel.toggleBreakpoint(issue1483.lineNo);

        // use chromebug to see the elements that make up the row
        var row = FBTestFirebug.getSourceLineNode(issue1483.lineNo);
        FBTest.compare("true", row.getAttribute('breakpoint'), "Line "+issue1483.lineNo+" should have a breakpoint set");

        issue1483.secondReload(FW.Firebug.chrome);
    };


    issue1483.secondReload = function(chrome)
    {
        FBTestFirebug.waitForBreakInDebugger(chrome, issue1483.lineNo, true, function wereDone()
        {
            FBTest.progress("Remove breakpoint");
            var panel = chrome.getSelectedPanel();

            panel.toggleBreakpoint(issue1483.lineNo);

            var row = FBTestFirebug.getSourceLineNode(issue1483.lineNo, chrome);
            if (!FBTest.compare("false", row.getAttribute('breakpoint'), "Line "+issue1483.lineNo+" should NOT have a breakpoint set"))
                FBTest.sysout("Failing row is "+row.parentNode.innerHTML, row);

            FBTestFirebug.clickContinueButton(chrome);

            FBTest.progress("The continue button is pused");

            FBTestFirebug.testDone("issue1483.DONE");

        });

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