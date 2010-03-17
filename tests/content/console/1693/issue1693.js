window.FBTestTimeout = 17000; // override the default test timeout [ms].

function runTest()
{
    FBTest.sysout("issue1693.START");

    FBTestFirebug.openNewTab(basePath + "console/1693/issue1693.html", function(win)
    {
        FBTestFirebug.enableConsolePanel(function(win)
        {
            FBTest.progress("issue1693.Select the Console panel and execute large request.");
            FBTestFirebug.selectPanel("console").panelNode;

            onRequestDisplayed(function(row)
            {
                FBTest.progress("Request call back called");

                // Expand XHR entry within the Console panel. The browser must not freeze
                // and the response body must be properly displayed.
                FBTestFirebug.expandElements(row, "spyTitleCol", "spyCol");

                // Get response body element and check its content. Note that the displayed text
                // is limited in case of large responses.
                var limit = FBTestFirebug.getPref("netDisplayedResponseLimit");
                var responseBody = FW.FBL.getElementsByClass(row,
                    "netInfoResponseText", "netInfoText");

                // Generate response text (the same as the PHP file).
                var responseText = "";
                for (var i=0; i<80000; i++)
                    responseText += i + " ";

                // It takes some time to display huge response so, wait for the last message
                // saying: a limit has been reached...
                onResponseDisplayed(function()
                {
                    // Compare expected and actuall (displayed) response text.
                    var text1 = responseText.substr(0, limit);
                    var text2 = responseBody[0].textContent.substr(0, limit);
                    FBTest.compare(text1, text2, "The response text must be properly displayed");
                    FBTestFirebug.testDone("issue1693.DONE");
                });
            });

            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}

function onRequestDisplayed(callback)
{
    // Create listener for mutation events.
    var doc = FBTestFirebug.getPanelDocument();
    var recognizer = new MutationRecognizer(doc.defaultView, "div",
        {"class": "logRow logRow-spy loaded"});

    // Wait for a XHR log to appear in the Net panel.
    recognizer.onRecognizeAsync(callback);
}

function onResponseDisplayed(callback, text)
{
    // Create listener for mutation events.
    var doc = FBTestFirebug.getPanelDocument();
    var recognizer = new MutationRecognizer(doc.defaultView, "div",
        {"class": "netInfoResponseSizeLimit"});

    // Wait for a XHR log to appear in the Net panel.
    recognizer.onRecognizeAsync(callback);
}
