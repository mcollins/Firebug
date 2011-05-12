function runTest()
{
    FBTest.sysout("issue1862.START");
    FBTestFirebug.openNewTab(basePath + "net/1862/issue1862.html", function()
    {
        // Open Firebug UI and enable Net panel.
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableConsolePanel();
        FBTestFirebug.clearCache();

        // Enable XHR spy.
        var prefOrigValue = FBTestFirebug.getPref("showXMLHttpRequests");
        FBTestFirebug.setPref("showXMLHttpRequests", true);

        FW.Firebug.chrome.selectPanel("net");

        // Reload test page.
        FBTestFirebug.enableNetPanel(function(win)
        {
            onRequestDisplayed(function()
            {
                // Verify Net panel response
                var panel = FBTestFirebug.getPanel("net");
                FBTestFirebug.expandElements(panel.panelNode, "netRow", "category-xhr", "hasHeaders", "loaded");
                verifyResponse(panel);

                // Verify Console panel response
                panel = FBTestFirebug.selectPanel("console");
                var spyLogRow = FW.FBL.getElementByClass(panel.panelNode, "logRow", "logRow-spy", "loaded");
                var xhr = FW.FBL.getElementByClass(spyLogRow, "spyTitleCol", "spyCol");
                FBTest.click(xhr);
                verifyResponse(panel);

                // Finish test
                FBTestFirebug.setPref("showXMLHttpRequests", prefOrigValue);
                FBTestFirebug.testDone("issue1862.DONE");
            });

            FBTestFirebug.click(win.document.getElementById("testButton"));
        });
    })
}

function onRequestDisplayed(callback)
{
    // Create listener for mutation events.
    var doc = FBTestFirebug.getPanelDocument();
    var recognizer = new MutationRecognizer(doc.defaultView, "tr",
        {"class": "netRow category-xhr loaded"});

    // Wait for a XHR log to appear in the Net panel.
    recognizer.onRecognizeAsync(callback);
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
