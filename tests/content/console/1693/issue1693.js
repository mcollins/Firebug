window.FBTestTimeout = 17000; // override the default test timeout [ms].

function runTest()
{
    FBTest.sysout("issue1693.START");

    FBTestFirebug.openNewTab(basePath + "console/1693/issue1693.html", function(win)
    {
        FBTestFirebug.enableConsolePanel(function(win)
        {
            FBTest.progress("issue1693.Select the Console panel and execute large request.");

            FBTestFirebug.selectPanel("console");
            onRequestDisplayed(function(spyLogRow)
            {
                FBTest.progress("Request displayed");
                var panelNode = FBTestFirebug.getPanel("console").panelNode;

                // Expand XHR entry within the Console panel. The browser must not freeze
                // and the response body must be properly displayed.
                var spyTitle = panelNode.getElementsByClassName("spyTitleCol spyCol").item(0);
                FBTest.click(spyTitle);

                var spyHead = panelNode.getElementsByClassName("spyHead").item(0);
                var responseText = spyHead.repObject.xhrRequest.responseText;

                // Get response body element and check its content. Note that the displayed text
                // is limited in case of large responses.
                var responseBody = panelNode.getElementsByClassName(
                    "netInfoResponseText netInfoText").item(0);
                
                var limit = FBTestFirebug.getPref("netDisplayedResponseLimit");

                // Compare expected and actual (displayed) response text.
                var text1 = responseText.substr(0, limit);
                var text2 = responseBody.textContent.substr(0, limit);
                FBTest.compare(text1, text2, "The response text must be properly displayed");

                FBTestFirebug.testDone("issue1693.DONE");
            });

            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}

function onRequestDisplayed(callback)
{
    var doc = FBTestFirebug.getPanelDocument();
    var recognizer = new MutationRecognizer(doc.defaultView, "div",
        {"class": "logRow logRow-spy loaded"});
    recognizer.onRecognizeAsync(callback, 2000);
}
