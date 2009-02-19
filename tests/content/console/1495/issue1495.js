// Test entry point.
function runTest()
{
    FBTest.sysout("issue1495.START");
    FBTest.loadScript("net/env.js", this);

    openNewTab(basePath + "console/1495/issue1495.html", function(win)
    {
        enableConsolePanel(function()
        {
            // Run test implemented on the page.
            win.wrappedJSObject.runTest(function(request)
            {
                var panel = FW.FirebugChrome.selectPanel("console");

                // Expand all XHR logs in the Console panel.
                var rows = FW.FBL.getElementsByClass(panel.panelNode, "logRow", "logRow-spy", "loaded");
                for (var i = 0; i < rows.length; i++) 
                {
                    var logRow = rows[i];
                    var clickTarget = FW.FBL.getElementByClass(logRow, "spyTitleCol", "spyCol");
                    FBTest.click(clickTarget);
                    expandNetTabs(clickTarget, "netInfoResponseTab");

                    var responseBody = FW.FBL.getElementByClass(logRow, "netInfoResponseText", "netInfoText");
                    FBTest.ok(responseBody, "Response tab must exist in");
                    if (responseBody)
                        FBTest.ok(responseBody.textContent, "Response tab must not be empty"); 
                }

                // Finish test
                cleanUpTestTabs();
                FBTest.sysout("issue1495.DONE");
                FBTest.testDone();
            });
        });
    });
}
