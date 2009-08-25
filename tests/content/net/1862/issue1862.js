function runTest()
{
    FBTestFirebug.openNewTab(basePath + "net/1862/issue1862.html", function(win)
    {
        FBTest.sysout("issue1862.START", win);

        // Open Firebug UI and enable Net panel.
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableNetPanel();
        FBTestFirebug.enableConsolePanel();
        FBTestFirebug.clearCache();

        // Enable XHR spy.
        var prefOrigValue = FBTestFirebug.getPref("showXMLHttpRequests");
        FBTestFirebug.setPref("showXMLHttpRequests", true);

        // Reload test page.
        FBTestFirebug.reload(function()
        {
            win.wrappedJSObject.getXMLResponse(function(request)
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
                FBTestFirebug.setPref("showXMLHttpRequests", prefOrigValue);
                FBTestFirebug.testDone("issue1862.DONE");
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
        FBTest.compare("<root><div>Simple XML document</div></root>",
            responseBody.textContent, "Test XML response must match in: " + panel.name);
}
