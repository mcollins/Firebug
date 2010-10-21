function runTest()
{
    FBTest.sysout("issue2934.START");
    FBTest.openNewTab(basePath + "commandLine/2934/issue2934.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.selectPanel("console");
        FBTest.enableConsolePanel(function(win)
        {
            var doc = FW.FirebugChrome.window.document;
            var cmdLine = doc.getElementById("fbCommandLine");

            // Make sure the console is focused and command line API loaded.
            FBTest.focus(cmdLine);

            // Set command line expression and press Tab key.
            FBTest.typeCommand("doc");
            FBTest.synthesizeKey("VK_TAB", win);
            FBTest.compare("document", cmdLine.value,"The command line must display 'document' after tab key completion.");

            FBTest.testDone("issue2934.DONE");
        });
    });
}
