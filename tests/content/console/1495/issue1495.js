// Test entry point.
function runTest()
{
    FBTest.loadScript("net/env.js", this);
    FBTest.sysout("issue1495.START");

    openNewTab(basePath + "console/1495/issue1495.html", function(win)
    {
        // Open Firebug UI and activate Net panel.
        FW.Firebug.showBar(true);
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
                expandNetTabs(clickTarget, "netInfoResponseTab");

                var responseBody = FW.FBL.getElementByClass(logRow, "netInfoResponseText", "netInfoText");
                FBTest.ok(responseBody, "Response tab must exist in");
                if (responseBody)
                    FBTest.ok(responseBody.textContent, "Response tab must not be empty"); 
            }

            // Finish test
            removeCurrentTab();
            FBTest.sysout("issue1495.DONE");
            FBTest.testDone();
        });
    });
}
