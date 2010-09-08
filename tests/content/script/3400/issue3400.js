function runTest()
{
    FBTest.sysout("issue3400.START");
    FBTest.openNewTab(basePath + "script/3400/issue3400.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableScriptPanel(function(win)
        {
            var panel = FW.FirebugChrome.selectPanel("script");

            var chrome = FW.Firebug.chrome;
            FBTest.waitForBreakInDebugger(chrome, 20, false, function(row)
            {
                var doc = chrome.window.document;
                var button = doc.getElementById("fbStepOutButton");
                var toolbar = doc.getElementById("fbToolbar");
                var rect = button.getClientRects()[0];

                FBTest.progress("script panel toolbar width: " + toolbar.clientWidth +
                    ", step-out button right side: " + rect.right);
                FBTest.ok(toolbar.clientWidth > rect.right, "Debugger buttons must be visible");

                // Resume debugger and finish the test.
                FBTest.clickContinueButton();
                FBTest.testDone("issue3400.DONE");
            });

            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}
