function runTest()
{
    FBTest.sysout("issue2934.START");
    FBTest.openNewTab(basePath + "commandLine/2934/issue2934.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var doc = FW.FirebugChrome.window.document;
            var cmdLine = doc.getElementById("fbCommandLine");

            // Make sure the console is focused and command line API loaded.
            FBTest.focus(cmdLine);

            // Set command line expression and press Tab key.
            cmdLine.value = "docu";
            FBTest.pressKey(9, "fbCommandLine");

            FBTest.compare("document", cmdLine.value,
                "The command line must display 'document' after auto completion.");

            FBTest.testDone("issue2934.DONE");
        });
    });
}
