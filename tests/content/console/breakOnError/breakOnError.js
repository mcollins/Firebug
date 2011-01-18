function runTest()
{
    FBTest.sysout("breakOnError.START");
    FBTest.openNewTab(basePath + "console/breakOnError/breakOnError.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableScriptPanel()
        FBTest.enableConsolePanel(function(win)
        {
            var panel = FBTest.selectPanel("console");

            FBTest.waitForBreakInDebugger(null, 27, false, function(row)
            {
                // Resume debugger.
                FBTest.clickContinueButton();

                // 5) Finish test.
                FBTest.testDone("breakOnNext.DONE");
            });

            FBTest.clickBreakOnNextButton();
            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}
