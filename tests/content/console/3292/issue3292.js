function runTest()
{
    FBTest.sysout("issue3292.START");

    FBTest.openNewTab(basePath + "console/3292/issue3292.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var panelNode = FW.FirebugChrome.selectPanel("console").panelNode;

            var errorNode = panelNode.querySelector(".objectBox.objectBox-errorMessage");
            var titleNode = errorNode.querySelector(".errorTitle");

            // Verify the error message
            FBTest.compare(titleNode.textContent, "iframe log",
                "An log message must be displayed");

            FBTest.testDone("issue3292.DONE");
        });
    });
}
