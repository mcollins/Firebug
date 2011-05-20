// 1) Open Firebug UI
// 2) Enabel all panels
// 3) Select the Console panel
// 4) Register mutation recognizer
// 5) Handle error log in the console panel
// 6) Verify the error.
// 7) Verify status bar error text.

function runTest()
{
    FBTest.sysout("issue2297.START");

    // Enable showing network errors, the original value is reverted.
    var prefOrigValue = FBTestFirebug.getPref("showNetworkErrors");
    FBTestFirebug.setPref("showNetworkErrors", true);

    FBTestFirebug.openNewTab(basePath + "net/2297/issue2297.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableAllPanels();
        FBTestFirebug.selectPanel("console");

        // Create listener for mutation events.
        var doc = FBTestFirebug.getPanelDocument();
        var recognizer = new MutationRecognizer(doc.defaultView, "div",
            {"class": "logRow logRow-error"});

        // Wait for an error log in the Console panel.
        recognizer.onRecognize(function (element)
        {
            // Verify error log in the console.
            var expectedResult = "\"NetworkError: 404 Not Found - " + basePath +
                "net/2297/" + "non-existing-script.js\"";
            var message = element.getElementsByClassName("objectBox")[0];
            FBTest.compare(expectedResult, message.textContent,
                "There must be a Network Error with proper URL");

            // Verify status bar text
            var statusText = FW.top.document.getElementById("fbStatusText");
            FBTest.compare(FW.FBL.$STRP("plural.Error_Count2", [1]), statusText.value,
                "There must be 1 Error displayed in the status bar");

            FBTestFirebug.setPref("showNetworkErrors", prefOrigValue);
            FBTestFirebug.testDone("issue2297; end");
        });

        // Reload the page to get an error in the console.
        FBTestFirebug.reload();
    });
}

