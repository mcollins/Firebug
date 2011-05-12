window.FBTestTimeout = 15000;

function runTest()
{
    FBTest.sysout("issue846.START");

    FBTestFirebug.openNewTab(basePath + "net/846/Issue846.htm", function(win)
    {
        // Disable XHR spy.
        var prefOrigValue = FBTestFirebug.getPref("showXMLHttpRequests");
        FBTestFirebug.setPref("showXMLHttpRequests", false);

        // Open Firebug UI and enable Net panel.
        FBTestFirebug.enableNetPanel(function(win)
        {
            win.runTest(function(responses)
            {
                FBTest.sysout("issue846.onRunTest", responses);

                // Expand all requests and select respnose bodies.
                var panel = FW.Firebug.chrome.selectPanel("net");
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
