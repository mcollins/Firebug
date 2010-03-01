function runTest()
{
    FBTest.sysout("exampleNet1.START");

    // 1) Load test case page
    FBTest.openNewTab(basePath + "examples/exampleNet1.html", function(win)
    {
        // 2) Open Firebug and enable the Net panel.
        FBTest.openFirebug();
        FBTest.enableNetPanel(function(win)
        {
            // 3) Select Net panel
            var panel = FW.FirebugChrome.selectPanel("net");

            // Asynchronously wait for the request beeing displayed.
            onRequestDisplayed(function(netRow)
            {
                // TODO: test code, verify UI, etc.
                
                // 5) Finish test
                FBTest.testDone("exampleNet1.DONE");
            });

            // 4) Execute test by clicking on the 'Execute Test' button.
            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}

function onRequestDisplayed(callback)
{
    // Create listener for mutation events.
    var doc = FBTest.getPanelDocument();
    var recognizer = new MutationRecognizer(doc.defaultView, "tr",
        {"class": "netRow category-xhr loaded"});

    // Wait for a XHR log to appear in the Net panel.
    recognizer.onRecognizeAsync(callback);
}
