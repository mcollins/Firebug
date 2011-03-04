function runTest()
{
    // Enable XHR spy.
    var prefOrigValue = FBTestFirebug.getPref("showXMLHttpRequests");
    FBTestFirebug.setPref("showXMLHttpRequests", true);

    FBTestFirebug.openNewTab(basePath + "net/1275/issue1275.htm", function(win)
    {
        FBTest.sysout("issue1275.START");

        // Open Firebug UI and enable Net panel.
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableNetPanel();
        FBTestFirebug.enableConsolePanel();
        FBTestFirebug.clearCache();
        FBTestFirebug.selectPanel("net");

        // Reload test page.
        FBTestFirebug.reload(function()
        {
            onRequestDisplayed("tr", "netRow category-xhr hasHeaders loaded", function(row)
            {
                // Verify Net panel response
                var panel = FBTestFirebug.getPanel("net");
                FBTest.click(row);
                verifyResponse(panel);

                // Verify Console panel response
                panel = FBTestFirebug.getPanel("console");
                var spyLogRow = FW.FBL.getElementByClass(panel.panelNode, "logRow", "logRow-spy", "loaded");
                var xhr = FW.FBL.getElementByClass(spyLogRow, "spyTitleCol", "spyCol");
                FBTest.click(xhr);
                verifyResponse(panel);

                FBTestFirebug.setPref("showXMLHttpRequests", prefOrigValue);
                FBTestFirebug.testDone("issue1275.DONE");
            });

            FBTest.click(win.document.getElementById("testButton"));
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

function onRequestDisplayed(nodeName, classes, callback)
{
    var doc = FBTestFirebug.getPanelDocument();
    var recognizer = new MutationRecognizer(doc.defaultView, nodeName, {"class": classes});
    recognizer.onRecognizeAsync(callback);
}
