function runTest()
{
    FBTest.loadScript("net/env.js", this);

    openNewTab(basePath + "net/1275/issue1275.htm", function(win)
    {
        FBTest.sysout("issue1275.START", win);

        // Open Firebug UI and activate Net panel.
        FW.Firebug.showBar(true);
        FW.FirebugChrome.selectPanel("net");

        win.wrappedJSObject.jsonRequest(function(request)
        {
            // Verify Net panel response
            var panel = FW.FirebugContext.getPanel("net");
            expandNetRows(panel.panelNode, "netRow", "category-xhr", "hasHeaders", "loaded");
            verifyResponse(panel);

            // Verify Console panel response
            panel = FW.FirebugChrome.selectPanel("console");
            var spyLogRow = FW.FBL.getElementByClass(panel.panelNode, "logRow", "logRow-spy", "loaded");
            var xhr = FW.FBL.getElementByClass(spyLogRow, "spyTitleCol", "spyCol");
            FBTest.click(xhr);
            verifyResponse(panel);

            // Finish test
            removeCurrentTab();
            FBTest.sysout("issue1275.DONE");
            FBTest.testDone();
        })
    })
}

function verifyResponse(panel)
{
    // The response must be displayed to be populated in the UI.
    expandNetTabs(panel.panelNode, "netInfoResponseTab");
    var responseBody = FW.FBL.getElementByClass(panel.panelNode, "netInfoResponseText", 
        "netInfoText");

    FBTest.ok(responseBody, "Response tab must exist in: " + panel.name);
    if (responseBody)
        FBTest.compare("{ data1: 'value1', data2: 'value2' }",
            responseBody.textContent, "Test JSON response must match in: " + panel.name);
}
