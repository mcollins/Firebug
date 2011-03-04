function runTest()
{
    FBTest.sysout("refreshHaltedDebugger.START");

    // 1) Open test page
    FBTestFirebug.openNewTab(basePath + "script/refreshHaltedDebugger.html", function(win)
    {
        // 2) Open Firebug and enable the Script panel.
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableScriptPanel(function()
        {
            FBTestFirebug.selectPanel("script");

            // Wait for break in debugger.
            var chrome = FW.Firebug.chrome;
            FBTestFirebug.waitForBreakInDebugger(chrome, 25, false, function(sourceRow)
            {
                FBTest.progress("refreshHaltedDebugger; Halted on debugger keyword I.");

                // Wait for another break.
                FBTestFirebug.waitForBreakInDebugger(chrome, 25, false, function(sourceRow)
                {
                    FBTest.progress("refreshHaltedDebugger; Halted on debugger keyword II.");
                    FBTestFirebug.clickContinueButton(chrome);
                    FBTest.testDone("refreshHaltedDebugger; DONE");
                });

                // If the debugger is resumed before refresh, the test passes. 
                //FBTestFirebug.clickContinueButton(chrome);

                // 4) Reload page and wait for another break.
                FBTestFirebug.reload(function(win) {
                    executeTest(win);
                });
            });

            // 3) Execute test on the page.
            executeTest(win);
        });
    });
}

function executeTest(win)
{
    FBTest.progress("refreshHaltedDebugger; Execute Test.");

    setTimeout(function() {
        FBTest.click(win.document.getElementById("testButton"));
    }, 10);
}
