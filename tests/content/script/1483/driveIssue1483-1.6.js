function runTest()
{
    var fileName = "index.js";
    var lineNo = 5;

    FBTest.sysout("issue1483.START");
    FBTest.openNewTab(basePath + "script/1483/issue1483.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.clearCache();

        // Enable the Console and Script panel
        FBTest.enableConsolePanel();
        FBTest.enableScriptPanel(function ()
        {
            FBTest.selectPanel("script");
            FBTest.progress("issue1483.script panel enabled");

            // Set breakpoint in index.js file at line 5
            FBTest.setBreakpoint(null, fileName, lineNo, function()
            {
                FBTest.progress("issue1483.a breakpoint is set");

                var hit = false; // a flag indicating that a break happened.
                var chrome = FW.Firebug.chrome;

                FBTest.waitForBreakInDebugger(chrome, lineNo, true, function()
                {
                    hit = true;
                    FBTest.progress("issue1483.break on the breakpoint");
                    removeBreakpoint(chrome, fileName, lineNo, function()
                    {
                        FBTest.clickContinueButton(chrome);
                        FBTest.progress("issue1483.the continue button is pused");
                    });
                });

                // Reload the page, the breakpoint should hit during the reload.
                FBTest.reload(function()
                {
                    FBTest.progress("issue1483.page reloaded");
                    FBTest.ok(hit, "The break happened");

                    // Check the Console panel
                    var panelNode = FBTest.selectPanel("console").panelNode;
                    var log = panelNode.querySelector(".objectBox.objectBox-text");
                    FBTest.compare("init", (log ? log.textContent : ""),
                        "there must be one log in the console.");

                    FBTest.testDone("issue1483.DONE");
                });
            });
        });
    });
}

// ************************************************************************************************

// xxxHonza: the one from FBTest 1.6a21 should be used.
function removeBreakpoint(chrome, url, lineNo, callback)
{
    if (!chrome)
        chrome = FW.Firebug.chrome;

    var panel = FBTestFirebug.getPanel("script");
    if (!url)
        url = panel.location.href;

    FBTestFirebug.selectSourceLine(url, lineNo, "js", chrome, function(row)
    {
        if (row.getAttribute("breakpoint") == "true")
            panel.toggleBreakpoint(lineNo);
        callback(row);
    });
}
