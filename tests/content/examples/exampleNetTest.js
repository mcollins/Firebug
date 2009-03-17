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
            FBTest.progress("Example progress message inside enableNetPanel, before runTest");

            var button = win.document.getElementById("runTestButton");
            FBTest.sysout("runTestButton", button);

            // test case fires this back to us.
            button.addEventListener("ReadyState4x200", logTestResult, true);

            var event = document.createEvent("MouseEvents");
            event.initMouseEvent("click", true, false, window,
                    0, 0, 0, 0, 0, false, false, false, false, 0, null);
            button.dispatchEvent(event);
        });
    })
}

function logTestResult(event)
{
    // TODO: verify FB UI

    // Log test results.
    FBTest.ok(true, "Net Test OK");
    FBTest.progress("Example progress message");

    // Finish test

    FBTestFirebug.testDone("Example Net Test DONE");
}