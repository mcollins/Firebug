function runTest()
{
    FBTest.sysout("issue601.START");

    // must be set to false in this test, but the original value is reverted.
    var prefOrigValue = FBTestFirebug.getPref("showXMLHttpRequests");
    FBTestFirebug.setPref("showXMLHttpRequests", false);

    // Server side handler.
    FBTest.registerPathHandler("/net/601/issue601.php", function (metadata, response)
    {
        response.setHeader("Content-type", "text/plain", false);
        var postData = FW.FBL.readFromStream(metadata.bodyInputStream);
        response.write(postData);
    });

    FBTestFirebug.openNewTab(basePath + "net/601/issue601.html", function(win)
    {
        FBTestFirebug.enableNetPanel(function(win)
        {
            var date = (new Date()).toUTCString();
            var postData = "date=" + date;

            win.wrappedJSObject.postRequest(postData, function(request)
            {
                // Expand Net's panel UI so, it's populated with data.
                var panelNode = FBTestFirebug.selectPanel("net").panelNode;
                FBTestFirebug.expandElements(panelNode, "netRow", "category-xhr");
                FBTestFirebug.expandElements(panelNode, "netInfoResponseTab");

                var responseBody = FW.FBL.getElementByClass(panelNode, "netInfoResponseText", "netInfoText");
                FBTest.ok(responseBody, "Response tab must exist.");
                if (responseBody)
                    FBTest.compare(postData, responseBody.textContent, "Test response must match.");

                FBTestFirebug.setPref("showXMLHttpRequests", prefOrigValue);
                FBTestFirebug.testDone("issue601.DONE");
            });
        });
    });
}
