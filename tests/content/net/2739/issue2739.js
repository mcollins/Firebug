// Test entry point.
function runTest()
{
    FBTest.sysout("issue2739.START");

    // Disable XHR spy for this test.
    FBTestFirebug.setPref("showXMLHttpRequests", false);

    // Load test case page
    FBTestFirebug.openNewTab(basePath + "net/2739/issue2739.html", function(win)
    {
        // Open Firebug and enable the Net panel.
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableNetPanel(function(win)
        {
            var panel = FW.FirebugChrome.selectPanel("net");

            var counter = 0;

            // Asynchronously wait for two requests beeing displayed.
            onRequestDisplayed(function(netRow)
            {
                FBTest.progress("onRequestDisplayed " + counter+1);
                if (++counter == 2)
                    onVerifyResponses(netRow);
            });

            onRequestDisplayed(function(netRow)
            {
                FBTest.progress("onRequestDisplayed " + counter+1);
                if (++counter == 2)
                    onVerifyResponses(netRow);
            });

            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}

function onVerifyResponses(netRow)
{
    verifyResponses(netRow);
    FBTestFirebug.testDone("issue2696.DONE");
}

function verifyResponses(netRow)
{
    var panel = FW.FirebugChrome.selectPanel("net");
    var netRows = panel.panelNode.getElementsByClassName("netRow category-xhr hasHeaders loaded");
    if (!FBTest.compare(2, netRows.length, "There must be two xhr requests."))
        return;

    FBTestFirebug.expandElements(panel.panelNode, "category-xhr");
    FBTestFirebug.expandElements(panel.panelNode, "netInfoResponseTab");

    var responses = panel.panelNode.getElementsByClassName("netInfoResponseText");
    if (!FBTest.compare(2, responses.length, "There must be two xhr responses."))
        return;

    FBTest.compare("Response for test 2739:start", responses[0].textContent, "Test response #1 must match.");
    FBTest.compare("Response for test 2739:link", responses[1].textContent, "Test response #2 must match.");
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
