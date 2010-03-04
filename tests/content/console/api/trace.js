function runTest()
{
    FBTest.sysout("console.trace.START");
    FBTest.openNewTab(basePath + "console/api/trace.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var config = {tagName: "div", classes: "logRow logRow-stackTrace"};
            FBTest.waitForDisplayedElement("console", config, function(row)
            {
                var stackFrames = row.getElementsByClassName("objectBox-stackFrame");
                FBTest.compare(2, stackFrames.length, "There must be 2 stack frames.");

                var reStack1 = /function onclick(event) {\s*onExecuteTest\(\);\s*}\s*(Object { name="event"})\s*1\s*\(line 2\)/;
                FBTest.compare(reStack1, stackFrames[0], "The first stack frame text must match.");

                var reStack2 = /onExecuteTest\(\)\s*trace.htmls*\(line 34\)/;
                FBTest.compare(reStack2, stackFrames[1], "The second stack frame text must match.");

                FBTest.testDone("console.trace.DONE");
            });

            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}
