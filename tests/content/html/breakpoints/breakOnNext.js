function runTest()
{
    FBTest.sysout("html.breakpoints; START");

    FBTestFirebug.openNewTab(basePath + "html/breakpoints/breakOnNext.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableAllPanels();

        // A suite of asynchronous tests.
        var testSuite = [];
        testSuite.push(function(callback) {
            breakOnMutation(win, "breakOnAttrModified", 41, callback);
        });
        testSuite.push(function(callback) {
            breakOnMutation(win, "breakOnNodeInserted", 52, callback);
        });
        testSuite.push(function(callback) {
            breakOnMutation(win, "breakOnNodeRemoved", 58, callback);
        });
        testSuite.push(function(callback) {
            breakOnMutation(win, "breakOnTextModified", 47, callback);
        });

        // Realod window to activate debugger and run all tests.
        FBTestFirebug.reload(function(win) {
            runTestSuite(testSuite);
        })
    });
}

function runTestSuite(tests)
{
    setTimeout(function()
    {
        FBTestFirebug.selectPanel("html");

        var test = tests.shift();
        test.call(this, function() {
            if (tests.length > 0)
                runTestSuite(tests);
            else
                FBTestFirebug.testDone("html.breakpoints; DONE");
        });
    }, 100);
}

function breakOnMutation(win, buttonId, lineNo, callback)
{
    var chrome = FW.Firebug.chrome;
    chrome.resume(chrome.window.FirebugContext);

    FBTestFirebug.waitForBreakInDebugger(chrome, lineNo, false, function(sourceRow)
    {
        FBTest.sysout("html.breakpoints; "+ buttonId);
        FBTest.ok(FBTestFirebug.clickContinueButton(false, chrome),
            "The continue button is pushed");
        callback();
    });

    FBTest.click(win.wrappedJSObject.document.getElementById(buttonId));
    FBTest.sysout("html.breakpoints; " + buttonId + " button clicked");
}
