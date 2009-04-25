function runTest()
{
    FBTestFirebug.openNewTab(basePath + "script/1575/issue1575.htm", function(win)
    {
        FBTest.progress("issue1575 opens "+win.location);
        FBTestFirebug.selectPanel("script");
        FBTestFirebug.enableScriptPanel(function()
        {
            FBTestFirebug.selectPanel("script");
            FBTest.progress("reloaded, now set breakpoint");
            var panel = FW.FirebugContext.chrome.getSelectedPanel();

            FBTest.compare("script", panel.name, "Got selected panel "+panel.name);

            var lineNo = 3;
            panel.toggleBreakpoint(lineNo);

            FBTest.progress("toggled breakpoint on line "+lineNo);

            // use chromebug to see the elements that make up the row
            var sourceRow = FBTestFirebug.getSourceLineNode(lineNo);
            FBTest.compare("true", sourceRow.getAttribute('breakpoint'), "Line "+lineNo+" should have a breakpoint set");


            var chrome = FW.FirebugContext.chrome;
            FBTestFirebug.listenForBreakpoint(chrome, lineNo, function hitBP()
            {
                var exeline = sourceRow.getAttribute("exeline");
                FBTest.compare("true", exeline, "The row must be marked as the execution line.");
                checkWatchPanel();
                var canContinue = FBTestFirebug.clickContinueButton(false, chrome);
                FBTest.ok(canContinue, "The continue button is pushable");

            });

            FBTest.progress("Breakpoint Listener set, run the function");
            // Execute test method and hit the breakpoint.
            win.wrappedJSObject.setTimeout(win.wrappedJSObject.issue1575GlobalFunction);
        });
    })
}



function checkWatchPanel()
{
    var panel = FBTestFirebug.getPanel("watches");
    var panelNode = panel.panelNode;
    var watchNewRow = FW.FBL.getElementByClass(panelNode, "watchEditBox");

    FBTest.progress("now click on the box "+watchNewRow.innerHTML);
    // Click on the "New watch expression..." edit box to start editing.
    FBTest.mouseDown(watchNewRow);

    setTimeout(function checkEditing()
    {
        FBTest.ok(panel.editing, "The Watch panel must be in an 'editing' mode now.");
        FBTestFirebug.testDone("issue1575.DONE");
    }, 100);


}
