/**
 * 1) Open a new tab and Firebug on it.
 * 2) Select Net panel
 * 3) Reopen Firebug
 * 4) Verify that the Net panel is still selected (BUG).
 */
function runTest()
{
    FBTest.sysout("selectedPanelAfterReopen.START");
    FBTestFirebug.openNewTab(basePath + "firebug/OpenFirebugOnThisPage.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.selectPanel("net");
        FBTestFirebug.closeFirebug();
        FBTestFirebug.openFirebug();
        var panel = FBTestFirebug.getSelectedPanel();
        FBTest.compare("net", panel.name, "Net panel must be selected now");
        FBTestFirebug.testDone("selectedPanelAfterReopen.DONE");
    });
}
