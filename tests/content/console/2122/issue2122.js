// 1. Open the testcase, open Firebug, enable & select the Console panel.
// 2. Click the Execute Test button.
// 3. Scroll to top.
// 4. Switch to the HTML panel.
// 5. Click the Execute Test button.
// 6. Switch back to Console tab
// 7. The Console panel scroll position must be at the top.
function runTest()
{
    FBTest.sysout("issue2122.START");

    // Step 1.
    FBTestFirebug.openNewTab(basePath + "console/2122/issue2122.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableConsolePanel(function()
        {
            FBTestFirebug.selectPanel("console");

            // Step 2.
            step2(win);
        });
    });
}

// ************************************************************************************************

function step2(win)
{
    executeTest(win, function()
    {
        // Step 3.
        scrollToTop();

        // Step 4.
        FBTestFirebug.selectPanel("html");

        // Step 5.
        step5(win);
    });
};

function step5(win)
{
    executeTest(win, function()
    {
        // Step 6.
        FBTestFirebug.selectPanel("console");

        // Step 7 - Verify.
        FBTest.ok(isScrolledToTop(), "The Console panel must be scrolled to the top.");

        // Done
        FBTestFirebug.testDone("issue2122; DONE");
    });
}

// ************************************************************************************************

function executeTest(win, callback)
{
    function listener(event)
    {
        testButton.removeEventListener("TestDone", listener, true);
        callback();
    };

    var testButton = win.document.getElementById("testButton");
    testButton.addEventListener("TestDone", listener, true);

    FBTest.click(testButton);
}

// ************************************************************************************************

function isScrolledToBottom()
{
    var panel = FBTestFirebug.getPanel("console");
    return FW.FBL.isScrolledToBottom(panel.panelNode);
}

function isScrolledToTop()
{
    var panel = FBTestFirebug.getPanel("console");
    return (panel.panelNode.scrollTop == 0);
}

function scrollToBottom()
{
    var panel = FBTestFirebug.getPanel("console");
    return FW.FBL.scrollToBottom(panel.panelNode);
}

function scrollToTop()
{
    var panel = FBTestFirebug.getPanel("console");
    return panel.panelNode.scrollTop = 0;
}
