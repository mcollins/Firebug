// Test entry point.
function runTest()
{
    FBTest.sysout("issue1461.START");
    FBTestFirebug.openNewTab(basePath + "net/1461/issue1461.html", function(win)
    {
        // Open Firebug UI and enable Net panel.
        FBTestFirebug.enableNetPanel(function(win)
        {
            var panel = FW.Firebug.chrome.selectPanel("net");

            var panelNode = FW.Firebug.currentContext.getPanel("net").panelNode;
            FBTestFirebug.expandElements(panelNode, "netRow", "category-html", "hasHeaders", "loaded");
            FBTestFirebug.expandElements(panelNode, "netInfoResponseTab");

            var responseBody = FW.FBL.getElementByClass(panelNode, "netInfoResponseText", 
                "netInfoText");

            // The response must be displayed.
            FBTest.ok(responseBody, "Response tab must exist.");
            if (!responseBody)
                return FBTestFirebug.testDone(win);

            var partOfThePageSource = "<h1>Test for Issue #1461</h1>";
            var index = responseBody.textContent.indexOf(partOfThePageSource);
            FBTest.ok(index != -1, "The proper response is there.");

            FBTestFirebug.testDone("issue1461.DONE");
        });
    });
}
