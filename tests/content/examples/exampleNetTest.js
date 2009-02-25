// Test entry point (executed by FBTest) 
function runTest()
{
    // Open a manual test page.
    var urlBase = FBTest.getHTTPURLBase();
    FBTestFirebug.openNewTab(urlBase + "examples/exampleNetTest.html", function(win)
    {
        // Open FB UI and enable Net panel.
        FBTestFirebug.enableNetPanel(function() 
        {
            // Run asynchronous test on the page.
            win.wrappedJSObject.runTest(function(request)
            {
                // TODO: verify FB UI 

                // Log test results.
                FBTest.ok(true, "Test OK");
                FBTest.progress("Example progress message");

                // Finish test
                //cleanUpTestTabs();
                FBTestFirebug.testDone("Example Test DONE");
            })
        });
    })
}
