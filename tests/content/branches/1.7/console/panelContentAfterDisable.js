/**
 * 1) Open a new tab and Firebug on it.
 * 2) Disable Console panel
 * 3) Verify visibility of the command line (must be collapsed).
 */
function runTest()
{
    FBTest.sysout("panelContentAfterDisable.START");
    FBTestFirebug.openNewTab(basePath + "firebug/OpenFirebugOnThisPage.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.selectPanel("console");
        FW.Firebug.Console.setDefaultState(true);
        FW.Firebug.Console.setDefaultState(false);

        var cmdBox = FW.document.getElementById("fbCommandBox");
        var splitter = FW.document.getElementById("fbPanelSplitter");
        var sidePanel = FW.document.getElementById("fbSidePanelDeck");

        FBTest.ok(cmdBox.collapsed, "Command line must be hidden");
        FBTest.ok(splitter.collapsed, "Splitter must be hidden");
        FBTest.ok(sidePanel.collapsed, "Large command line must be hidden");

        FBTestFirebug.testDone("panelContentAfterDisable.DONE");
    });
}
