function runTest()
{
    FBTest.sysout("console.warn.START");
    FBTest.openNewTab(basePath + "console/api/warn.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var config = {tagName: "div", classes: "logRow logRow-warn"};
            FBTest.waitForDisplayedElement("console", config, function(row)
            {
                var reTextContent = /This is a test warning\s*warn.html\s*\(line\s*30\)/;
                FBTest.compare(reTextContent, row.textContent, "The proper message must be displayed.");
                FBTest.testDone("console.warn.DONE");
            });

            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}
