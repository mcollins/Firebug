function runTest()
{
    FBTest.sysout("console.table.START");
    FBTest.openNewTab(basePath + "console/api/table.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var config = {tagName: "div", classes: "logRow logRow-table"};
            FBTest.waitForDisplayedElement("console", config, function(row)
            {
                FBTest.testDone("console.table.DONE");
            });

            // Execute test implemented on the test page.
            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}
