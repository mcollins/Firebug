// Test entry point (executed by FBTest) 
function runTest()
{
    // Load helper script for net panel tests.
    FBTest.loadScript("net/env.js", this);

    // Open a manual test page.
    openNewTab(basePath + "examples/exampleNetTest.html", function(win)
    {
        // TODO: prepare FBUI (open, select net panel, etc.). 

        // Run asynchronous test on the page.
        win.wrappedJSObject.runTest(function(request)
        {
            // TODO: verify FB UI 

            // Log test results.
            FBTest.ok(true, "Test OK");

            // Finish test
            FBTest.testDone();
        })
    })
}
