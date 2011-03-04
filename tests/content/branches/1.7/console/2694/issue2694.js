// 1. Open Firebug, enable & select the Console panel.
// 2. Enter anything (like '1+2') into the console several times, enough to
//    overflow the console space.
// 3. The Console panel scroll position must be at the bottom.
function runTest()
{
    FBTest.sysout("issue2694.START");

    // Step 1.
    FBTestFirebug.openNewTab(basePath + "console/2694/issue2694.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableConsolePanel(function()
        {
            executeSetOfCommands(40, function() {
                FBTest.ok(isScrolledToBottom(), "The Console panel must be scrolled to the bottom.");
                FBTestFirebug.testDone("issue2694; DONE");
            })
        });
    });
}

// ************************************************************************************************

function executeSetOfCommands(counter, callback)
{
    if (counter > 0)
    {
        FBTestFirebug.executeCommand("1+" + counter);
        setTimeout(function() {
            executeSetOfCommands(--counter, callback);
        }, 50);
    }
    else
    {
        callback();
    }
}

function isScrolledToBottom()
{
    var panel = FBTestFirebug.getPanel("console");
    return FW.FBL.isScrolledToBottom(panel.panelNode);
}
