function runTest()
{
    FBTest.sysout("issue3709.START");
    FBTest.openNewTab(basePath + "commandLine/3709/issue3709.htm", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var panel = FW.Firebug.chrome.selectPanel("console");
            var doc = FW.Firebug.chrome.window.document;
            var cmdLine = doc.getElementById("fbCommandLine");

            // Test Command Line
            cmdLine.value = ''; //xxxsz: Clear Command Line before typing the command - should probably be done inside typeCommand()
            FBTest.typeCommand("document.getElementById()");
            FBTest.synthesizeKey("VK_LEFT", win);
            FBTest.typeCommand("ab");

            FBTest.compare("document.getElementById(ab)", cmdLine.value,
                "Content of Command Line must be: document.getElementById(ab)");

            FBTest.testDone("issue3709.DONE");
        });
    });
}