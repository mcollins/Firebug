// Test entry point (executed by FBTest) 
function runTest()
{
    // Load helper script for net panel tests.
    FBTest.loadScript("net/env.js", this);

   
    // Open a manual test page.
    openNewTab(FBTest.getHTTPURLBase() + "examples/exampleNetTest.html", function(win)
    {
        // Open FB UI and enable Net panel.
        enableNetPanel(function() 
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
                FBTest.testDone();
            })
        });
    })
}
