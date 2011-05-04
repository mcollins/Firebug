function runTest()
{
    FBTest.sysout("issue4087.START");
    FBTest.openNewTab(basePath + "commandLine/4087/issue4087.htm", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var panel = FW.FirebugChrome.selectPanel("console");
            var doc = FW.FirebugChrome.window.document;
            var cmdLine = doc.getElementById("fbCommandLine");

            // Test Command Line
            cmdLine.value = ''; //xxxsz: Clear Command Line before typing the command - should probably be done inside typeCommand()
            FBTest.typeCommand("var test = 'Hello';");
  
            FBTest.synthesizeKey("VK_F5", win);

            FBTest.compare("var test = 'Hello';", cmdLine.value,
                "Content of Command Line must be: var test = 'Hello';");

            // Test Command Editor
            FBTestFirebug.setPref("largeCommandLine", true);
            cmdLine = doc.getElementById("fbLargeCommandLine");
            cmdLine.value = '';
            FBTest.typeCommand("var test = 'World';", true);
  
            FBTest.synthesizeKey("VK_F5", win);

            FBTest.compare("var test = 'World';", cmdLine.value,
            "Content of Command Editor must be: var test = 'World';");

            FBTest.testDone("issue4087.DONE");
        });
    });
}