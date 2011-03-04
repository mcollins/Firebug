// 1) Open test page.
// 2) Open Firebug and enable the Console panel.
// 3) Register UI mutation handler.
// 4) Execute test on the page.
// 5) Verify UI.

function runTest()
{
    FBTest.sysout("issue2328.START");

    var prefOrigValue = FBTestFirebug.getPref("showXMLHttpRequests");
    FBTestFirebug.setPref("showXMLHttpRequests", true);

    FBTestFirebug.enableConsolePanel();
    FBTestFirebug.openNewTab(basePath + "console/2328/issue2328.html", function(win)
    {
        FBTest.sysout("issue2328; Test page loaded.");

        FBTestFirebug.openFirebug();
        FBTestFirebug.selectPanel("console");

        // Create listener for mutation events.
        var doc = FBTestFirebug.getPanelDocument();
        var recognizer = new MutationRecognizer(doc.defaultView, "div",
            {"class": "logRow logRow-spy loaded"});

        // Wait for an error log in the Console panel.
        recognizer.onRecognize(function (element)
        {
            // Verify error log in the console.
            var expectedResult = "GET " + basePath + "console/2328/issue2328.php";
            var spyFullTitle = FW.FBL.getElementByClass(element, "spyFullTitle");
            FBTest.compare(expectedResult, spyFullTitle.textContent, "There must be a XHR log");

            FBTestFirebug.setPref("showXMLHttpRequests", prefOrigValue);
            FBTestFirebug.testDone("issue2328; DONE");
        });

        // Run test implemented on the page.
        FBTest.click(win.document.getElementById("testButton"));
    });
}
