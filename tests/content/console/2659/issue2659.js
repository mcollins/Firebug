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
            FW.FirebugChrome.selectPanel("console");
            FBTestFirebug.reload(function()
            {
                verifyNumberOfLogs(1);
                clickPersistButton();
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
    FBTest.compare(expectedCount, logs.length, "There must be " + expectedCount +
        "log(s) in the Console panel");
}

function clickPersistButton(chrome)
{
    if (!chrome)
        chrome = FW.FirebugChrome;

    var doc = chrome.window.document;
    var button = doc.getElementById("fbConsolePersist");

    // Do not use FBTest.click, toolbar buttons need to use sendMouseEvent.
    FBTestFirebug.synthesizeMouse(button);
}
