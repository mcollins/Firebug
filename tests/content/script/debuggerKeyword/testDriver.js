var win = null;             // Reference to the target window.
var testSuite = null;       // List of tests within this test.

function runTest()
{
    FBTest.sysout("debuggerKeyword.START");

    // List of handlers for entire asynchronous test.
    testSuite = new FBTest.Firebug.TestHandlers("debuggerKeyword");

    // Open new page.
    testSuite.add(function onNewPage(event)
    {
        // Open Firebug UI, enable Script panel, reload and start first test.
        FBTestFirebug.openFirebug();
        FBTestFirebug.clearCache();
        FBTestFirebug.selectPanel("script");

        FBTestFirebug.enableScriptPanel(function(testWindow)
        {
            win = testWindow;
            testSuite.fire("debuggerSimple");
        });
    });

    // Test 1: debugger simple
    testSuite.add(function debuggerSimple(event)
    {
        executeTest("debuggerSimple", 29, "debuggerShallow");
    });

    // Test 2: debugger shallow
    testSuite.add(function debuggerShallow(event)
    {
        executeTest("debuggerShallow", 35, "debuggerDeep");
    });

    // Test 3: debugger deep
    testSuite.add(function debuggerDeep(event)
    {
        executeTest("debuggerDeep", 61, "debuggerInXHR");
    });

    // Test 4: debugger in XHR
    testSuite.add(function debuggerInXHR(event)
    {
        executeTest("debuggerInXHR", 14, "debuggerInScript");
    });

    // Test 5: debugger in script
    testSuite.add(function debuggerInScript(event)
    {
        executeTest("debuggerInScript", 16);
    });

    // Start all test cases.
    testSuite.fireOnNewPage("onNewPage", basePath + "script/debuggerKeyword/testPage.html");
}

function executeTest(testId, lineNo, nextTest)
{
    var chrome = FW.Firebug.chrome;

    // xxxHonza: TODO there shouldn't be a 100 ms timeout (see below), but rather
    // an async wait till the "stopped" attribute is really set to "false".
    var stopped = chrome.getGlobalAttribute("fbDebuggerButtons", "stopped");
    if (!FBTest.ok(stopped == "false", "The debugger must be resumed by now"))
    {
        FBTestFirebug.testDone("debuggerKeyword.DONE");
        return;
    }

    FBTestFirebug.waitForBreakInDebugger(chrome, lineNo, false, function(sourceRow)
    {
        FBTestFirebug.clickContinueButton();

        if (nextTest) 
            setTimeout(function() { testSuite.fire(nextTest) }, 100);
        else 
            FBTestFirebug.testDone("debuggerKeyword.DONE");
    });

    // Execute a method with debuggger; keyword in it. This is done
    // asynchronously since it stops the execution context.
    FBTest.click(win.wrappedJSObject.document.getElementById(testId));
}
