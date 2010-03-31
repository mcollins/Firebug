function runTest()
{
    FBTest.sysout("console.count.START");
    FBTest.openNewTab(basePath + "console/api/count.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            FBTest.clearConsole();

            var config = {tagName: "div", classes: "logRow", counter: 2};
            FBTest.waitForDisplayedElement("console", config, function(row)
            {
                var panelNode = FBTest.getPanel("console").panelNode;
                var rows = panelNode.getElementsByClassName("logRow");
                if (FBTest.compare(2, rows.length, "There must be 2 logs displayed."))
                {
                    FBTest.compare(/a\s*3count.html\s*\(line 30\)/,
                        rows[0].textContent,
                        "The proper message must be displayed.");

                    FBTest.compare(/b\s*2count.html\s*\(line 33\)/,
                        rows[1].textContent,
                        "The proper message must be displayed.");
                }
                FBTest.testDone("console.count.DONE");
            });

            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}
