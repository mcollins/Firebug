function runTest()
{
    FBTest.sysout("issue2114.START");

    FBTestFirebug.openNewTab(basePath + "script/2114/issue2114.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.selectPanel("script");

        FBTestFirebug.enableScriptPanel(function(win)
        {
            // Set a breakpoint
            var lineNo = 31;
            FBTestFirebug.setBreakpoint(null, null, lineNo, function(row)
            {
                FBTest.compare("true", row.getAttribute("breakpoint"), "Line "+lineNo+
                    " should have a breakpoint set");

                // Asynchronously wait for break in debugger.
                var chrome = FW.Firebug.chrome;
                FBTestFirebug.waitForBreakInDebugger(chrome, lineNo, true, function(row)
                {
                    FBTestFirebug.clickToolbarButton(chrome, "fbStepOverButton");

                    setTimeout(function() {
                        var stopped = chrome.getGlobalAttribute("fbDebuggerButtons", "stopped");
                        FBTest.compare("true", stopped, "The debugger must be stopped by now");
                        FBTestFirebug.clickContinueButton(chrome);
                        FBTestFirebug.clearAllBreakpoints();
                        FBTestFirebug.testDone("issue2114.DONE");
                    }, 200);
                });

                FBTestFirebug.reload();
            });
        });
    });
}
