function runTest()
{
    FBTest.sysout("issue3292.START");

    FBTest.openNewTab(basePath + "console/3292/issue3292.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var panelNode = FW.FirebugChrome.selectPanel("console").panelNode;

            var textNodes = panelNode.querySelectorAll(".objectBox.objectBox-text");
            if (FBTest.compare(textNodes.length, 4, "There must be 4 logs."))
            {
                // Verify the log content
                FBTest.compare(textNodes[0].textContent, "parent log",
                    "parent log must be displayed");

                FBTest.compare(textNodes[1].textContent, "included in iframe",
                    "included in iframe must be displayed");

                FBTest.compare(textNodes[2].textContent, "included in iframe",
                    "included in iframe must be displayed");

                FBTest.compare(textNodes[3].textContent, "iframe log",
                    "iframe log must be displayed");
            }

            FBTest.testDone("issue3292.DONE");
        });
    });
}
