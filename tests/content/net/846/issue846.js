function runTest()
{
    FBTest.sysout("issue846.START");

    // Cache with responses
    var responses = [];

    // Server side handler.
    FBTest.registerPathHandler("/net/846/issue846.php", function (metadata, response)
    {
        response.setHeader("Content-type", "text/plain", false);

        var responseText = "<div>" + (new Date()).getTime() + "</div>";
        responses.push(responseText);
        response.write(responseText);
    });

    FBTestFirebug.openNewTab(basePath + "net/846/issue846.htm", function(win)
    {
        // Disable XHR spy.
        var prefOrigValue = FBTestFirebug.getPref("showXMLHttpRequests");
        FBTestFirebug.setPref("showXMLHttpRequests", false);

        // Open Firebug UI and enable Net panel.
        FBTestFirebug.enableNetPanel(function(win)
        {
            win.wrappedJSObject.runTest(function(request)
            {
                FBTest.sysout("issue846.onRunTest", request);

                // Expand all requests and select respnose bodies.
                var panel = FW.FirebugChrome.selectPanel("net");
                FBTestFirebug.expandElements(panel.panelNode, "netRow", "category-xhr", "hasHeaders", "loaded");
                FBTestFirebug.expandElements(panel.panelNode, "netInfoResponseTab");

                var netRows = FW.FBL.getElementsByClass(panel.panelNode, "netRow", "category-xhr",
                    "hasHeaders", "loaded");
                FBTest.compare(responses.length, netRows.length,
                    "There must be correct number of XHRs");

                for (var i=0; i<netRows.length; i++)
                {
                    var row = netRows[i];
                    var responseBody = FW.FBL.getElementByClass(row.nextSibling, 
                        "netInfoResponseText", "netInfoText");
                    FBTest.compare(responses[i], responseBody.textContent, 
                        "Test response must match");
                }

                // Finish test
                FBTestFirebug.setPref("showXMLHttpRequests", prefOrigValue);
                FBTestFirebug.testDone("issue846.DONE");
            });
        });
    });
}
