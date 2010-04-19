var win = null;             // Reference to the target window.
var testSuite = null;       // List of tests within this test.

function runTest()
{
    FBTest.sysout("debuggerKeyword.START");

    // List of handlers for entire asynchronous test.
    var testSuite = [];

    // Test 1: debugger simple
    testSuite.push(function debuggerSimple(callback)
    {
        executeTest("debuggerSimple", 29, callback);
    });

    // Test 2: debugger shallow
    testSuite.push(function debuggerShallow(callback)
    {
        executeTest("debuggerShallow", 35, callback);
    });

    // Test 3: debugger deep
    testSuite.push(function debuggerDeep(callback)
    {
        executeTest("debuggerDeep", 61, callback);
    });

    // Test 4: debugger in XHR
    testSuite.push(function debuggerInXHR(callback)
    {
        executeTest("debuggerInXHR", 14, callback);
    });

    // Test 5: debugger in script
    testSuite.push(function debuggerInScript(callback)
    {
        executeTest("debuggerInScript", 16, callback);
    });

    // Load test case page
    FBTestFirebug.openNewTab(basePath +
        "script/debuggerKeyword/testPage.html", function(testWindow)
    {
        // Open Firebug UI, enable Script panel, reload and start tests.
        FBTestFirebug.openFirebug();
        FBTestFirebug.clearCache();
        FBTestFirebug.selectPanel("script");

        FBTestFirebug.enableScriptPanel(function(testWindow)
        {
            win = testWindow;

            // Start all async tests.
            FBTestFirebug.runTestSuite(testSuite, function() {
                FBTestFirebug.testDone("debuggerKeyword.DONE");
            });
        });
    });
}

function executeTest(testId, lineNo, callback)
{
    FBTest.progress(testId +" should stop on "+lineNo);
    var chrome = FW.Firebug.chrome;

    // xxxHonza: TODO there shouldn't be a 100 ms timeout (see below), but rather
    // an async wait till the "stopped" attribute is really set to "false".
    var stopped = chrome.getGlobalAttribute("fbDebuggerButtons", "stopped");
    if (!FBTest.compare(stopped, "false", "The debugger must be resumed by now"))
    {
        FBTestFirebug.testDone("debuggerKeyword.FAIL");
        return;
    }

    FBTestFirebug.waitForBreakInDebugger(chrome, lineNo, false, function(sourceRow)
    {
        FBTestFirebug.clickContinueButton();
        callback();
    });

    // Execute a method with debuggger; keyword in it. This is done
    // asynchronously since it stops the execution context.
    FBTest.click(win.wrappedJSObject.document.getElementById(testId));
}
