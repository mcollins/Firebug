function runTest()
{
    FBTest.sysout("issue2914.START");

    FBTest.openNewTab(basePath + "console/2914/issue2914.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var panelNode = FW.FirebugChrome.selectPanel("console").panelNode;

            var errorNode = panelNode.querySelector(".objectBox.objectBox-errorMessage");
            var titleNode = errorNode.querySelector(".errorTitle");

            // Verify the error message
            FBTest.compare(titleNode.textContent, "iframe error",
                "An error message must be displayed");

            // The expandlabel button must be displayed.
            FBTest.ok(FW.FBL.hasClass(errorNode, "hasTwisty"),
                "The error must be expandable.");

            // Open stack trace info.
            FBTest.click(titleNode);

            // Verify stack trace.
            var traceNode = errorNode.querySelector(".errorTrace");
            FBTest.compare(
                /logError\(\)\s*issue2...me.html\s*\(line 10\)\s*error\(\)\s*issue2914.html \(line 30\)/,
                traceNode.textContent,
                "The stack trace must be properly displayed.");

            FBTest.testDone("issue2914.DONE");
        });
    });
}
