function runTest()
{
    FBTest.sysout("issue3078.START");
    FBTest.openNewTab(basePath + "console/3078/issue3078.html", function(win)
    {
        FBTest.openFirebug();
        
        FBTest.enableConsolePanel(function(win)
        {
        	var panel = FW.FirebugChrome.selectPanel("console");
        	FBTest.ok(panel && (panel.name === "console"), "The console panel must be selected");

        	FBTest.ok(FW.FBL.isScrolledToBottom(panel.panelNode),
                "The panel must be scrolled at the bottom.");

            FBTest.testDone("issue3078.DONE");
        });
    });
}
