function runTest()
{
    FBTest.sysout("issue2914.START");

    FBTest.openNewTab(basePath + "console/2914/issue2914.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var panel = FW.FirebugChrome.selectPanel("console");
            var errorMessage = getErrorMessage(panel.panelNode);

            FBTest.compare(errorMessage, "iframe error",
                "An error message must be displayed");

            FBTest.testDone("issue2914.DONE");
        });
    });
}

function getErrorMessage(panelNode)
{
    var errorNode = panelNode.getElementsByClassName(
        "objectBox objectBox-errorMessage");

    if (errorNode.length != 1)
        return null;

    var errorTitleNode = errorNode[0].getElementsByClassName("errorTitle");
    if (errorTitleNode.length != 1)
        return null;

    return errorTitleNode[0].textContent;
}
