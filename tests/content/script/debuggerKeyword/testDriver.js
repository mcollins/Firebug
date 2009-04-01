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
        FBTestFirebug.enableScriptPanel(function(testWindow) {
            win = testWindow;
            testSuite.fire("debuggerSimple");
        });
    });

    // Test 1: debugger simple
    testSuite.add(function debuggerSimple(event)
    {
        executeTestAsync(win.wrappedJSObject.debuggerSimple, "@debuggerSimpleRow", "debuggerShallow");
    });

    // Test 2: debugger shallow
    testSuite.add(function debuggerShallow(event)
    {
        executeTestAsync(win.wrappedJSObject.debuggerShallow, "@debuggerShallowRow", "debuggerDeep");
    });

    // Test 3: debugger deep
    testSuite.add(function debuggerDeep(event)
    {
        executeTestAsync(win.wrappedJSObject.debuggerDeep, "@debuggerDeepRow", "debuggerInXHR");
    });

    // Test 4: debugger in XHR
    testSuite.add(function debuggerInXHR(event)
    {
        win.wrappedJSObject.setTimeout(function()
        {
            // Execute XHR and eval the response, there is debugger; keyword in it.
            win.wrappedJSObject.loadXHRDebugger(function(request)
            {
                FW.Firebug.Debugger.addListener(new DebuggerListener("@debuggerXHRRow", "debuggerInScript"));
            });
        }, 1);
    });

    // Test 5: debugger in script
    testSuite.add(function debuggerInScript(event)
    {
        win.wrappedJSObject.setTimeout(function()
        {
            win.wrappedJSObject.loadScriptDebugger(function()
            {
                FW.Firebug.Debugger.addListener(new DebuggerListener("@debuggerScriptRow"));
            });
        }, 1);
    });

    // Start all test cases.
    testSuite.fireOnNewPage("onNewPage", basePath + "script/debuggerKeyword/testPage.html");
}

function executeTestAsync(testMethod, debuggerKeywordId, nextTest)
{
    FW.Firebug.Debugger.addListener(new DebuggerListener(debuggerKeywordId, nextTest));

    // Execute a method with debuggger; keyword in it. This is done
    // asynchronously since it stops the execution context.
    win.wrappedJSObject.setTimeout(testMethod, 1);
}

function DebuggerListener(debuggerKeywordId, nextTest)
{
    this.onStop = function(context, frame, type, rv)
    {
        FBTest.sysout("debuggerKeyword.DebuggerListener.onStop " + debuggerKeywordId);

        FW.Firebug.Debugger.removeListener(this);
        window.setTimeout(function() {
            executeTest(debuggerKeywordId, nextTest)
        }, 400);
    }
}

function executeTest(debuggerKeywordId, nextTest)
{
    if (!verifyExeLine(debuggerKeywordId))
        return FBTestFirebug.testDone();

    if (nextTest)
        testSuite.fire(nextTest);
    else
        FBTestFirebug.testDone("debuggerKeyword.DONE");

    return true;
}

function verifyExeLine(rowId)
{
    var row = getScriptRow(rowId);
    FBTest.ok(row, "The row (" + rowId + ") must exist.");
    if (!row)
        return false;

    FBTest.sysout("debuggerKeyword.verifyExeLine", row);

    var exeline = row.getAttribute("exeline");
    FBTest.compare(exeline, "true", "The row must be marked as the execution line.");

    var panel = FBTestFirebug.getPanel("script");
    var sourceLine = FW.FBL.getChildByClass(row, "sourceLine");
    FBTest.compare(sourceLine.textContent, panel.executionLineNo,
        "The execution line must be correct");

    // Continue debugger
    FBTestFirebug.clickContinueButton();
    return true;
}

function getScriptRow(rowId)
{
    var panel = FBTestFirebug.getPanel("script");
    var sourceBox = panel.getSourceBoxByURL(panel.location.href);
    var sourceViewport = FW.FBL.getChildByClass(sourceBox, "sourceViewport");
    var rows = sourceViewport.childNodes;

    for (var i=0; i<rows.length; i++)
    {
        var source = FW.FBL.getChildByClass(rows[i], "sourceRowText");
        if (source.textContent.indexOf(rowId) > 0)
            return rows[i];
    }

    return null;
}
