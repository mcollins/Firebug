function runTest()
{
    FBTest.sysout("issue3327.START");
    FBTest.openNewTab(basePath + "console/3327/issue3327.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function()
        {
            var panelNode = FBTest.getPanel("console").panelNode;
            var rows = panelNode.querySelectorAll(".logRow.logRow-log")
            FBTest.compare(1, rows.length, "There must be one log");

            var config = {tagName: "div", classes: "logRow logRow-log"};
            FBTest.waitForDisplayedElement("console", config, function(row)
            {
                var rows = panelNode.querySelectorAll(".logRow.logRow-log")
                FBTest.compare(2, rows.length, "There must be two logs");

                // No firebug console token change log!
                rows = panelNode.querySelectorAll(".logRow.logRow-info")
                FBTest.compare(0, rows.length, "There must not be console token change log!");

                FBTest.testDone("issue3327.DONE");
            });

            var iframe = win.document.getElementById("iframe");
            iframe.contentWindow.location.reload();
        });
    });
}
