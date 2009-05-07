/**
 * 1) Open a new tab and Firebug on it.
 * 2) Select Enable Console panel.
 * 3) Print simple log into the Console panel (test-page.runTest)
 * 4) Close and open Firebug UI.
 * 5) Verify that the Console panel log is still there.
 */
function runTest()
{
    FBTest.sysout("panelContentAfterReopen.START");
    FBTestFirebug.openNewTab(basePath + "console/panelContentAfterReopen.html", function(win)
    {
        // Open Firebug UI and enable console panel.
        FBTestFirebug.enableConsolePanel(function()
        {
            var panelNode = FBTestFirebug.selectPanel("console").panelNode;

            FBTest.focus(FW.document.getElementById("fbCommandLine"));
            win.wrappedJSObject.runTest();

            FBTest.progress("close Firebug");
            FBTestFirebug.closeFirebug();
            FBTest.progress("open Firebug");
            FBTestFirebug.openFirebug();

            var logRow = FW.FBL.getElementByClass(panelNode, "logRow logRow-log");
            var node = FW.FBL.getElementByClass(panelNode, "objectBox objectBox-text");
            FBTest.compare("Hello From Test!", (node?node.textContent:"null node"), "The log must be still there.");
            FBTestFirebug.testDone("panelContentAfterReopen.DONE");
        });
    });
}
