function runTest()
{
    FBTest.sysout("issue2934.START");
    FBTest.openNewTab(basePath + "commandLine/2934/issue2934.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.selectPanel("console");
        FBTest.enableConsolePanel(function(win)
        {
            var doc = FW.Firebug.chrome.window.document;
            var cmdLine = doc.getElementById("fbCommandLine");

            // Make sure the console is focused and command line API loaded.
            FBTest.focus(cmdLine);

            // Set command line expression and press Tab key.
            FBTest.typeCommand("doc");
            FBTest.synthesizeKey("VK_TAB", win);
            FBTest.compare("document", cmdLine.value,"The command line must display 'document' after tab key completion.");

            FBTest.typeCommand(".");
            FBTest.synthesizeKey("VK_BACK_SPACE", win);
            FBTest.compare("document", cmdLine.value,"The command line must display 'document' after backspace on 'document.'.");

            FBTest.pressKey(13, "fbCommandLine");  // execute 'document' command
            FBTest.compare("", cmdLine.value,"The command line must display nothing after enter on 'document'.");

            FBTest.pressKey(38, "fbCommandLine");  // up arrow
            FBTest.compare("document", cmdLine.value, "The command line must display 'document' after uparrow following 'document' command");

            FBTest.pressKey(40, "fbCommandLine");  // down arrow
            FBTest.compare("", cmdLine.value, "The command line must display nothing following down arrow");

            FBTest.pressKey(38, "fbCommandLine");  // up arrow
            FBTest.compare("document", cmdLine.value, "The command line must display 'document' after uparrow following 'document' command");

            FBTest.pressKey(27, "fbCommandLine");  // escape
            FBTest.compare("", cmdLine.value, "The command line must display nothing after escape key");

            FBTest.typeCommand("document.id.");
            FBTest.synthesizeKey("VK_TAB", win);
            FBTest.compare("document.id.", cmdLine.value,"The command line must display 'document.id.' after tab key completion.");

            FBTest.pressKey(13, "fbCommandLine"); // clear by executing the junk

            checkUncompleted("[{w", win, cmdLine); // issue 3598
            checkUncompleted("a = [{w", win, cmdLine);
            checkUncompleted("a = [{w", win, cmdLine);
            checkUncompleted('a = "w', win, cmdLine);
            checkUncompleted('"w', win, cmdLine);

            checkUncompleted('window.alert("w', win, cmdLine);  // issue 3591
            checkUncompleted('window.alert("whoops").', win, cmdLine);

            checkUncompleted('/hi', win, cmdLine); // issue 3592
            checkUncompleted('/hi/i', win, cmdLine);

            // Issue 3600
            FBTest.executeCommand("aaaaaaaaaaaaaaaaBBBBBBBBBBBBBBBBB = 1; aaaaaaaaaaaaaaaaKKKKKKKKKKKKKKKKKKKKKK = 2; aaaaaaaaaaaaaaaaZZTop = 3;");
            FBTest.typeCommand('a');
            FBTest.typeCommand('a');
            FBTest.synthesizeKey("VK_TAB", win);
            FBTest.compare("aaaaaaaaaaaaaaaaZZTop", cmdLine.value,"The command line must display 'aaaaaaaaaaaaaaaaZZTop' after tab key completion.");

            FBTest.pressKey(27, "fbCommandLine");  // escape
            FBTest.compare("aa", cmdLine.value, "The command line must display 'aa', the original typing, after escape key");
            FBTest.pressKey(27, "fbCommandLine");  //  clear by escape

            FBTest.typeCommand('a');
            FBTest.typeCommand('a');
            FBTest.pressKey(38, "fbCommandLine");  // up arrow
            FBTest.synthesizeKey("VK_TAB", win);
            FBTest.compare("aaaaaaaaaaaaaaaaKKKKKKKKKKKKKKKKKKKKKK", cmdLine.value, "The command line must display 'aaaaaaaaaaaaaaaaKKKKKKKKKKKKKKKKKKKKKK' after up arrow key");
            FBTest.pressKey(27, "fbCommandLine");  //  clear by escape

            FBTest.typeCommand('a');
            FBTest.typeCommand('a');
            FBTest.pressKey(40, "fbCommandLine");  // down arrow
            FBTest.synthesizeKey("VK_TAB", win);
            FBTest.compare("aaaaaaaaaaaaaaaaBBBBBBBBBBBBBBBBB", cmdLine.value, "The command line must display 'aaaaaaaaaaaaaaaaBBBBBBBBBBBBBBBBB' after up arrow key");
            FBTest.pressKey(27, "fbCommandLine");  //  clear by escape

            FBTest.typeCommand('aa');
            FBTest.pressKey(39, "fbCommandLine"); // right arrow
            FBTest.compare("aaaaaaaaaaaaaaaaZZTop", cmdLine.value,"The command line must display 'aaaaaaaaaaaaaaaaZZTop' after right arrow completion.");
            FBTest.pressKey(27, "fbCommandLine");  //  clear by escape

            FBTest.testDone("issue2934.DONE");
        });
    });
}

function checkUncompleted(uncompleted, win, cmdLine)
{
    FBTest.typeCommand(uncompleted);
    FBTest.synthesizeKey("VK_TAB", win);
    FBTest.compare(uncompleted, cmdLine.value,"The command line must display "+uncompleted+" after tab key completion.");
    FBTest.pressKey(13, "fbCommandLine"); // clear by executing the junk
}