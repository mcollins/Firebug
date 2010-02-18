window.FBTestTimeout = 17000; // override the default test timeout [ms].

function runTest()
{
    FBTest.sysout("issue1693.START");

    FBTestFirebug.openNewTab(basePath + "console/1693/issue1693.html", function(win)
    {
        FBTestFirebug.enableConsolePanel(function(win)
        {
            FBTest.progress("issue1693.Select the Console panel and execute large request.");

            var panelNode = FBTestFirebug.selectPanel("console").panelNode;
            win.wrappedJSObject.executeRequest(function(request)
            {
                FBTest.progress("Request call back called");

                // Expand XHR entry within the Console panel. The browser must not freeze
                // and the response body must be properly displayed.
                FBTestFirebug.expandElements(panelNode, "spyTitleCol", "spyCol");

                // Get response body element and check its content. Note that the displayed text
                // is limited in case of large responses.
                var limit = FBTestFirebug.getPref("netDisplayedResponseLimit");
                var responseBody = FW.FBL.getElementsByClass(panelNode,
                    "netInfoResponseText", "netInfoText");

                // Compare expected and actuall (displayed) response text.
                var text1 = request.responseText.substr(0, limit);
                var text2 = responseBody[0].textContent.substr(0, limit);
                FBTest.compare(text1, text2, "The response text must be properly displayed");

                FBTestFirebug.testDone("issue1693.DONE");
            });
        });
    });
}
