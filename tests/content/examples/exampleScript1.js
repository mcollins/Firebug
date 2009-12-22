function runTest()
{
    FBTest.sysout("exampleScript1.START");

    // 1) Load test case page
    FBTestFirebug.openNewTab(basePath + "examples/exampleScript1.html", function(win)
    {
        // 2) Open Firebug and enable the Script panel.
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableScriptPanel(function(win)
        {
            // 3) Select the Script panel
            var panel = FW.FirebugChrome.selectPanel("script");

            // Asynchronously wait for break in debugger.
            var chrome = FW.Firebug.chrome;
            FBTestFirebug.waitForBreakInDebugger(chrome, 21, false, function(row)
            {
                // TODO: test code, verify UI, etc.

                // Resume debugger.
                FBTestFirebug.clickContinueButton();

                // 5) Finish test.
                FBTestFirebug.testDone("exampleScript1.DONE");
            });

            // 4) Execute test by clicking on the 'Execute Test' button.
            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}
