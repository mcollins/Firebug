const BP_BREAKONATTRCHANGE = 1;
const BP_BREAKONCHILDCHANGE = 2;
const BP_BREAKONREMOVE = 3;

function runTest()
{
    FBTest.sysout("html.breakpoints; START");

    FBTestFirebug.openNewTab(basePath + "html/breakpoints/breakOnElement.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableAllPanels();

        // A suite of asynchronous tests.
        var testSuite = [];
        testSuite.push(function(callback) {
            breakOnMutation(win, BP_BREAKONATTRCHANGE, "breakOnAttrModified", 42, callback);
        });
        testSuite.push(function(callback) {
            breakOnMutation(win, BP_BREAKONCHILDCHANGE, "breakOnNodeInserted", 47, callback);
        });
        testSuite.push(function(callback) {
            breakOnMutation(win, BP_BREAKONREMOVE, "breakOnNodeRemoved", 53, callback);
        });

        // Reload window to activate debugger and run all tests.
        FBTestFirebug.reload(function(win) {
            FBTestFirebug.runTestSuite(testSuite, function() {
                FBTestFirebug.testDone("html.breakpoints; DONE");
            });
        })
    });
}

function breakOnMutation(win, type, buttonId, lineNo, callback)
{
    var chrome = FW.Firebug.chrome;
    var content = win.wrappedJSObject.document.getElementById("content");
    var context = chrome.window.FirebugContext;

    FBTestFirebug.selectPanel("html");

    // Set breakpoint.
    FW.Firebug.HTMLModule.MutationBreakpoints.onModifyBreakpoint(context,
        content, type);

    FBTestFirebug.waitForBreakInDebugger(chrome, lineNo, false, function(sourceRow)
    {
        FBTest.sysout("html.breakpoints; " + buttonId);
        FBTestFirebug.clickContinueButton(chrome);
        FBTest.progress("The continue button is pushed");
        callback();
    });

    FBTest.click(win.wrappedJSObject.document.getElementById(buttonId));
    FBTest.sysout("html.breakpoints; " + buttonId + " button clicked");
}
