function runTest()
{
    FBTest.sysout("console.debug.START");
    FBTest.openNewTab(basePath + "console/api/debug.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var config = {tagName: "div", classes: "logRow logRow-debug"};
            FBTest.waitForDisplayedElement("console", config, function(row)
            {
                FBTest.compare(/This is a debug message\s*Object\s*{\s*a=1\s*}debug.html\s*\(line 30\)/,
                    row.textContent, "The proper message must be displayed.");
                FBTest.testDone("console.debug.DONE");
            });

            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}
