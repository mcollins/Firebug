var win = null;             // Reference to the target window.
var testSuite = null;       // List of tests within this test.

function runTest()
{
    FBTest.sysout("breakpoints.START");

    // List of handlers for entire asynchronous test.
    testSuite = new FBTest.Firebug.TestHandlers("breakpoints");

    // Open new page.
    testSuite.add(function onNewPage(event)
    {
        // Open Firebug UI, enable Script panel, reload and start first test.
        FBTestFirebug.openFirebug();
        FBTestFirebug.clearCache();
        FBTestFirebug.enableScriptPanel(function(testWindow) {
            win = testWindow;
            testSuite.fire("breakSimple");
        });
    });

    // Test 1: break simple
    testSuite.add(function breakSimple(event)
    {
        executeTestAsync(win.wrappedJSObject.breakSimple, "@breakSimpleRow", "breakShallow");
    });

    // Test 2: break shallow
    testSuite.add(function breakShallow(event)
    {
        executeTestAsync(win.wrappedJSObject.breakShallow, "@breakShallowRow", "breakDeep");
    });

    // Test 3: break deep
    testSuite.add(function breakDeep(event)
    {
        executeTestAsync(win.wrappedJSObject.breakDeep, "@breakDeepRow", "breakInXHR");
    });

    // Test 4: break in XHR
    testSuite.add(function breakInXHR(event)
    {
        win.wrappedJSObject.setTimeout(function()
        {
            // Execute XHR and eval the response, there is debugger; keyword in it.
            win.wrappedJSObject.loadXHRDebugger(function(request)
            {
                FW.Firebug.Debugger.addListener(new DebuggerListener("@breakXHRRow", "breakInScript"));
            });
        }, 1);
    });

    // Test 5: break in script
    testSuite.add(function breakInScript(event)
    {
        win.wrappedJSObject.setTimeout(function()
        {
            win.wrappedJSObject.loadScriptDebugger(function()
            {
                FW.Firebug.Debugger.addListener(new DebuggerListener("@breakScriptRow"));
            });
        }, 1);
    });

    // Start all test cases.
    testSuite.fireOnNewPage("onNewPage", basePath + "script/breakpoints/testPage.html");
}

function executeTestAsync(testMethod, breakpointId, nextTest)
{
    FW.Firebug.Debugger.addListener(new DebuggerListener(breakpointId, nextTest));

    // Execute a method with debuggger; keyword in it. This is done
    // asynchronously since it stops the execution context.
    win.wrappedJSObject.setTimeout(testMethod, 1);
}

function DebuggerListener(breakpointId, nextTest)
{
    this.onStop = function(context, frame, type, rv)
    {
        FBTest.sysout("breakpoints.DebuggerListener.onStop " + breakpointId);

        FW.Firebug.Debugger.removeListener(this);
        window.setTimeout(function() {
            executeTest(breakpointId, nextTest) 
        }, 400);
    }
}

function executeTest(breakpointId, nextTest)
{
    if (!verifyExeLine(breakpointId))
        return FBTestFirebug.testDone();

    if (nextTest)
        testSuite.fire(nextTest);
    else
        FBTestFirebug.testDone("breakpoints.DONE");

    return true;
}

function verifyExeLine(rowId)
{
    var row = getScriptRow(rowId);
    FBTest.ok(row, "The row (" + rowId + ") must exist.");
    if (!row)
        return false;

    FBTest.sysout("breakpoints.verifyExeLine", row);

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
