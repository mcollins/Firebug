function runTest()
{
    FBTest.loadScript("net/env.js", this);

    openNewTab(basePath + "net/issue1275.htm", function(win)
    {
        FBTest.sysout("issue1275.START", win);

        var browser = FBTest.FirebugWindow;

        // Open Firebug UI and activate Net panel.
        browser.Firebug.showBar(true);
        browser.FirebugChrome.selectPanel("net");

        win.jsonRequest(function(request)
        {
            // Expand the test request with params
            var panelNode = browser.FirebugContext.getPanel("net").panelNode;
            FBTest.sysout("fbtest.panelNode", panelNode);
            expandNetRows(panelNode, "netRow", "category-xhr", "hasHeaders", "loaded");
            expandNetTabs(panelNode, "netInfoResponseTab");

            // The response must be displayed.
            var responseBody = browser.FBL.getElementByClass(panelNode, "netInfoResponseText", 
                "netInfoText");

            FBTest.ok(responseBody, "Response tab must exist.");
            if (responseBody)
                FBTest.compare("{ data1: 'value1', data2: 'value2' }",
                    responseBody.textContent, "Test JSON response must match.");

            // Finish test
            removeCurrentTab();
            FBTest.sysout("issue1275.DONE");
            FBTest.testDone();
        })
    })
}
