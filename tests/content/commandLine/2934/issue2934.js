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

            FBTest.typeCommand(".");
            FBTest.pressKey(8, "fbCommandLine");
            FBTest.compare("document", cmdLine.value,"The command line must display 'document' after backspace on 'document.'.");

            FBTest.pressKey(13, "fbCommandLine");  // execute 'document' command
            FBTest.compare("", cmdLine.value,"The command line must display nothing after enter on 'document'.");

            FBTest.pressKey(38, "fbCommandLine");  // up arrow
            FBTest.compare("document", cmdLine.value, "The command line must display 'document' after uparrow following 'document' command");

            FBTest.pressKey(40, "fbCommandLine");  // down arrow
            FBTest.compare("", cmdLine.value, "The command line must display nothing following down arrow");

            FBTest.pressKey(38, "fbCommandLine");  // up arrow
            FBTest.compare("document", cmdLine.value, "The command line must display 'document' after uparrow following 'document' command");

            FBTest.pressKey(27, "fbCommandLine");  // up arrow
            FBTest.compare("", cmdLine.value, "The command line must display nothing after escape key");

            FBTest.typeCommand("document.id.");
            FBTest.synthesizeKey("VK_TAB", win);
            FBTest.compare("document", cmdLine.value,"The command line must display 'document.id.' after tab key completion.");

            FBTest.testDone("issue2934.DONE");
        });
    });
}
