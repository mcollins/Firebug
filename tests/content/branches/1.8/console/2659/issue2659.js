// 1) Load test case page.
// 2) Open Firebug and enable the Console panel
// 3) Reload
// 4) Verify number of logs (must be == 1)
// 5) Click the Persist button.
// 6) Reload
// 7) Verify number of logs (must be == 2)
function runTest()
{
    FBTest.sysout("issue2659.START");

    FBTestFirebug.openNewTab(basePath + "console/2659/issue2659.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableConsolePanel(function(win)
        {
            FW.Firebug.chrome.selectPanel("console");
            FBTestFirebug.reload(function()
            {
                verifyNumberOfLogs(1);
                FBTestFirebug.clickToolbarButton(FW.Firebug.chrome, "fbConsolePersist");
                FBTestFirebug.reload(function()
                {
                    verifyNumberOfLogs(2);
                    FBTestFirebug.testDone("issue2659.DONE");
                })
            })
        });
    });
}

function verifyNumberOfLogs(expectedCount)
{
    var panel = FBTestFirebug.getPanel("console");
    var logs = panel.panelNode.getElementsByClassName("logRow logRow-log");

    var count = 0;
    for (var i=0; i<logs.length; i++)
    {
        if (logs[i].textContent == "Test log for issue2659")
            count++
    }

    FBTest.compare(expectedCount, count, "There must be " + expectedCount +
        "log(s) in the Console panel");
}
