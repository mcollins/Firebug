const BP_BREAKONATTRCHANGE = 1;
const BP_BREAKONCHILDCHANGE = 2;
const BP_BREAKONREMOVE = 3;

function runTest()
{
    FBTest.sysout("html.breakpoints.CB; START");
    FBTest.setPref("service.filterSystemURLs", false);

    var doNotFilter = FBTest.getPref("service.filterSystemURLs");

    FBTest.compare(false, doNotFilter, "Pref service.filterSystemURLs must not be set true");
    FBTest.compare(false, FW.Firebug.filterSystemURLs, "Pref Firebug.filterSystemURLs must not be set true");


    FBTestFirebug.openNewTab(basePath + "html/breakpoints/breakOnElement.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableAllPanels();

        // A suite of asynchronous tests.
        var testSuite = [];
        testSuite.push(function(callback) {
            breakOnMutation(win, BP_BREAKONATTRCHANGE, "breakOnAttrModified", 2, callback);
        });
        testSuite.push(function(callback) {
            breakOnMutation(win, BP_BREAKONCHILDCHANGE, "breakOnNodeInserted", 2, callback);
        });
        testSuite.push(function(callback) {
            breakOnMutation(win, BP_BREAKONREMOVE, "breakOnNodeRemoved", 2, callback);
        });

        // Reload window to activate debugger and run all tests.
        FBTestFirebug.reload(function(win) {
            FBTestFirebug.runTestSuite(testSuite, function() {
                FBTestFirebug.testDone("html.breakpoints.CB; DONE");
            });
        })
    });
}

function breakOnMutation(win, type, buttonId, lineNo, callback)
{
    var chrome = FW.Firebug.chrome;
    var content = win.document.getElementById("content");
    var context = chrome.window.FirebugContext;

    FBTestFirebug.selectPanel("html");

    // Set breakpoint.
    FW.Firebug.HTMLModule.MutationBreakpoints.onModifyBreakpoint(context,
        content, type);

    FBTestFirebug.waitForBreakInDebugger(chrome, lineNo, false, function(sourceRow)
    {
        FBTest.sysout("html.breakpoints.CB; " + buttonId);
        FBTestFirebug.clickContinueButton(chrome);
        FBTest.progress("The continue button is pushed");
        callback();
    });

    FBTest.click(win.document.getElementById(buttonId));
    FBTest.sysout("html.breakpoints.CB; " + buttonId + " button clicked");
}
