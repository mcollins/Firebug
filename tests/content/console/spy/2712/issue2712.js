function runTest()
{
    FBTest.sysout("issue2712.START");
    FBTestFirebug.setPref("showXMLHttpRequests", true);

    FBTestFirebug.openNewTab(basePath + "console/spy/2712/issue2712.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableConsolePanel(function(win)
        {
            // Wait for request being displayed in the Console panel.
            FBTestFirebug.waitForDisplayedResponse("console", null, function(row)
            {
                FBTest.ok(!FW.FBL.hasClass(row, "error"),
                    "The request must not be marked as 'aborted'.");
                FBTestFirebug.testDone("issue2712.DONE");
            });

            // Execute test on the test page.
            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}
