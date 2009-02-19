// Test entry point.
function runTest()
{
    FBTest.sysout("issue1461.START");
    FBTest.loadScript("net/env.js", this);

    openNewTab(basePath + "net/1461/issue1461.html", function(win)
    {
        // Open Firebug UI and enable Net panel.
        enableNetPanel(function(win)
        {
            var panel = FW.FirebugChrome.selectPanel("net");

            var panelNode = FW.FirebugContext.getPanel("net").panelNode;
            expandNetRows(panelNode, "netRow", "category-html", "hasHeaders", "loaded");
            expandNetTabs(panelNode, "netInfoResponseTab");

            var responseBody = FW.FBL.getElementByClass(panelNode, "netInfoResponseText", 
                "netInfoText");

            // The response must be displayed.
            FBTest.ok(responseBody, "Response tab must exist.");
            if (!responseBody)
                return testDone(win);

            var partOfThePageSource = "<h1>Test for Issue #1461</h1>";
            var index = responseBody.textContent.indexOf(partOfThePageSource);
            FBTest.ok(index != -1, "The proper response is there.");

            testDone(win);
        });
    });
}

function testDone(win)
{
    // Finish test
    cleanUpTestTabs();
    FBTest.sysout("issue1461.DONE");
    FBTest.testDone();
}
