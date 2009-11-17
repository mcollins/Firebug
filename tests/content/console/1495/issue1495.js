// Test entry point.
function runTest()
{
    FBTest.sysout("issue1495.START");

    var prefOrigValue = FBTestFirebug.getPref("showXMLHttpRequests");
    FBTestFirebug.setPref("showXMLHttpRequests", true);

    FBTestFirebug.openNewTab(basePath + "console/1495/issue1495.html", function(win)
    {
        FBTestFirebug.enableConsolePanel(function()
        {
            var panel = FW.FirebugChrome.selectPanel("console");

            // Run test implemented on the page.
            win.wrappedJSObject.runTest(function(request)
            {
                // Expand all XHR logs in the Console panel.
                var rows = FW.FBL.getElementsByClass(panel.panelNode, "logRow", "logRow-spy", "loaded");
                for (var i = 0; i < rows.length; i++) 
                {
                    var logRow = rows[i];
                    var clickTarget = FW.FBL.getElementByClass(logRow, "spyTitleCol", "spyCol");
                    FBTest.click(clickTarget);
                    FBTestFirebug.expandElements(clickTarget, "netInfoResponseTab");

                    var responseBody = FW.FBL.getElementByClass(logRow, "netInfoResponseText", "netInfoText");
                    FBTest.ok(responseBody, "Response tab must exist in");
                    if (responseBody)
                        FBTest.ok(responseBody.textContent, "Response tab must not be empty"); 
                }

                // Finish test
                FBTestFirebug.setPref("showXMLHttpRequests", prefOrigValue);
                FBTestFirebug.testDone("issue1495.DONE");
            });
        });
    });
}
