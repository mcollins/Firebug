// 1. Open the testcase, open Firebug, enable & select the Console panel.
// 2. Click the Execute Test button.
// 3. Scroll to top.
// 4. Switch to the HTML panel.
// 5. Click the Execute Test button.
// 6. Switch back to Console tab
// 7. The Console panel scroll position must be at the top.

var theWindow;
function runTest()
{
    FBTest.sysout("issue2122.START");

    FBTestFirebug.openNewTab(basePath + "console/2122/issue2122.html", function()
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableConsolePanel(function(win)
        {
            FBTestFirebug.selectPanel("console");

            theWindow = win;

            var tests = [];
            tests.push(test1);
            tests.push(test2);
            tests.push(test3);

            FBTestFirebug.runTestSuite(tests, function() {
                FBTestFirebug.testDone("issue2122; DONE");
            });
        });
    });
}

// ************************************************************************************************

function test1(callback)
{
    executeTest(theWindow, function()
    {
        scrollToTop();
        FBTestFirebug.selectPanel("html");
        callback();
    });
};

function test2(callback)
{
    executeTest(theWindow, function()
    {
        FBTestFirebug.selectPanel("console");
        callback();
    });
}

function test3(callback)
{
    FBTest.ok(isScrolledToTop(), "The Console panel must be scrolled to the top.");
    callback();
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

function isScrolledToTop()
{
    var panel = FBTestFirebug.getPanel("console");
    FBTest.progress("scrollTop: " + panel.panelNode.scrollTop);
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
