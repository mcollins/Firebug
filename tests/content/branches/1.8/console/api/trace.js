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

                var reStack1 = /onExecuteTest\(\)\s*trace.html\s*\(line 34\)/;
                FBTest.compare(reStack1, stackFrames[0].textContent, "The first stack frame text must match.");

                FBTest.progress("Found stack frame "+stackFrames[1].textContent);
                var reStack2 = /onclick\(Object\s*{\s*name=\"event\"}\)1\s*\(line\s*2\)/;  // before R5281
                var reStack2 = /onclick\(event=click\s*clientX=0,\s*clientY=0\)1\s*\(line\s*2\)/; // after R7281
                var reStack3 = /onclick\(event=click\s*clientX=0,\s*clientY=0\)onclick\s*\(line\s*2\)/; // after R10542
                FBTest.compare(reStack3, stackFrames[1].textContent, "The second stack frame text must match.");

                FBTest.testDone("console.trace.DONE");
            });

            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}
