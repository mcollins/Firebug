function runTest()
{
    FBTest.sysout("issue2462.START");

    var prefOrigValue = FBTestFirebug.getPref("showXMLHttpRequests");
    FBTestFirebug.setPref("showXMLHttpRequests", true);

    FBTestFirebug.openNewTab(basePath + "console/spy/2462/issue2462.html", function(win)
    {
        FBTestFirebug.enableConsolePanel(function()
        {
            var panel = FW.FirebugChrome.selectPanel("console");
            win.onExecuteTest(function(request)
            {
                var rows = FW.FBL.getElementsByClass(panel.panelNode,
                    "logRow", "logRow-spy", "error", "loaded");

                FBTest.compare(1, rows.length,
                    "There must be one aborted and finished XHR.");

                // Finish test
                FBTestFirebug.setPref("showXMLHttpRequests", prefOrigValue);
                FBTestFirebug.testDone("issue2462.DONE");
            });
        });
    });
}
