function runTest()
{
    FBTestFirebug.openNewTab(basePath + "script/1575/issue1575.htm", function(win)
    {
        FBTest.sysout("issue1575.START", win);
        FBTestFirebug.enableScriptPanel(function()
        {
            var sourceRow = null;
            var DebuggerListener =
            {
                onStop: function(context, frame, type, rv)
                {
                    FBTest.sysout("issue1575.DebuggerListener.onStop");
                    FW.Firebug.Debugger.removeListener(this);

                    // Wait for the execution line to be marked.
                    //xxxHonza: Registering a "DOMAttrModified" listener would be perhaps better.
                    setTimeout(function()
                    {
                        var exeline = sourceRow.getAttribute("exeline");
                        FBTest.compare("true", exeline, "The row must be marked as the execution line.");
                        checkWatchPanel();
                        FBTestFirebug.testDone("issue1575.DONE");
                    }, 400);
                }
            }

            FW.Firebug.Debugger.addListener(DebuggerListener);
            sourceRow = setBreakpoint("issue1575.js", 3);

            // Execute test method and hit the breakpoint.
            win.wrappedJSObject.setTimeout(win.wrappedJSObject.runTest, 100);
        });
    })
}

function setBreakpoint(scriptFile, lineNo)
{
    var panel = FW.FirebugChrome.selectPanel("script");
    var found = FBTestFirebug.selectPanelLocationByName(panel, scriptFile);
    FBTest.compare(found, true, "The " + scriptFile + " should be found");

    var lineNode = FBTestFirebug.getSourceLineNode(lineNo);
    var sourceLine = lineNode.firstChild;

    if (!FW.FBL.hasClass(lineNode, "breakpoint"))
        FBTest.mouseDown(sourceLine);

    return lineNode;
}

function checkWatchPanel()
{
    var panel = FBTestFirebug.getPanel("watches");
    var panelNode = panel.panelNode;
    var watchNewRow = FW.FBL.getElementByClass(panelNode, "watchEditBox");

    // Click on the "New watch expression..." edit box to start editing.
    FBTest.mouseDown(watchNewRow);

    FBTest.ok(panel.editing, "The Watch panel must be in an 'editing' mode now.");
}
