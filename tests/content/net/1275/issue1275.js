function runTest()
{
    FBTestFirebug.openNewTab(basePath + "net/1275/issue1275.htm", function(win)
    {
        FBTest.sysout("issue1275.START", win);

        // Open Firebug UI and enable Net panel.
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableNetPanel();
        FBTestFirebug.enableConsolePanel();
        FBTestFirebug.clearCache();

        // Reload test page.
        FBTestFirebug.reload(function()
        {
            win.wrappedJSObject.jsonRequest(function(request)
            {
                // Verify Net panel response
                var panel = FW.FirebugChrome.selectPanel("net");
                FBTestFirebug.expandElements(panel.panelNode, "netRow", "category-xhr", "hasHeaders", "loaded");
                verifyResponse(panel);

                // Verify Console panel response
                panel = FW.FirebugChrome.selectPanel("console");
                var spyLogRow = FW.FBL.getElementByClass(panel.panelNode, "logRow", "logRow-spy", "loaded");
                var xhr = FW.FBL.getElementByClass(spyLogRow, "spyTitleCol", "spyCol");
                FBTest.click(xhr);
                verifyResponse(panel);

                // Finish test
                FBTestFirebug.testDone("issue1275.DONE");
            })
        });
    })
}

function verifyResponse(panel)
{
    // The response must be displayed to be populated in the UI.
    FBTestFirebug.expandElements(panel.panelNode, "netInfoResponseTab");
    var responseBody = FW.FBL.getElementByClass(panel.panelNode, "netInfoResponseText", 
        "netInfoText");

    FBTest.ok(responseBody, "Response tab must exist in: " + panel.name);
    if (responseBody)
        FBTest.compare("{ data1: 'value1', data2: 'value2' }",
            responseBody.textContent, "Test JSON response must match in: " + panel.name);
}
