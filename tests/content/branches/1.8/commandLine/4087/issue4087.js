function runTest()
{
    FBTest.sysout("issue4087.START");
    FBTest.openNewTab(basePath + "commandLine/4087/issue4087.htm", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            FW.Firebug.chrome.selectPanel("console");

            var doc = FW.Firebug.chrome.window.document;
            var cmdLine = doc.getElementById("fbCommandLine");

            // Test Command Line
            FBTest.clearAndTypeCommand("var test = 'Hello';");
  
            // Reload and check if the text persists.
            FBTest.reload(function()
            {
                FBTest.compare("var test = 'Hello';", cmdLine.value,
                    "Content of Command Line must be: var test = 'Hello';");

                // Click on the 'Command Editor' button to swich to multiline command line. 
                FBTest.clickToolbarButton(null, "fbCommandToggleSmall");

                FBTest.clearAndTypeCommand("var test = 'World';", true);

                // Reload again and check if the text persists even in the
                // multi line command line.
                FBTest.reload(function()
                {
                    var cmdLine = doc.getElementById("fbLargeCommandLine");
                    FBTest.compare("var test = 'World';", cmdLine.value,
                        "Content of Command Editor must be: var test = 'World';");
                    FBTest.clearCommand(true);

                    FBTest.testDone("issue4087.DONE");
                });
            });
        });
    });
}