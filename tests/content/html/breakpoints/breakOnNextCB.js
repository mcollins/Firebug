function runTest()
{
    FBTest.sysout("html.breakpoints.CB; START");
    FBTest.setPref("service.filterSystemURLs", false);

    FBTestFirebug.openNewTab(basePath + "html/breakpoints/breakOnNext.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableAllPanels();

        // A suite of asynchronous tests.
        var testSuite = [];
        testSuite.push(function(callback) {
            breakOnMutation(win, "breakOnAttrModified", 2, callback);
        });
        testSuite.push(function(callback) {
            breakOnMutation(win, "breakOnNodeInserted", 2, callback);
        });
        testSuite.push(function(callback) {
            breakOnMutation(win, "breakOnNodeRemoved", 2, callback);
        });
        testSuite.push(function(callback) {
            breakOnMutation(win, "breakOnTextModified", 2, callback);
        });

        // Realod window to activate debugger and run all tests.
        FBTestFirebug.reload(function(win) {
            FBTestFirebug.runTestSuite(testSuite, function() {
                FBTestFirebug.testDone("html.breakpoints.CB; DONE");
            });
        })
    });
}

function breakOnMutation(win, buttonId, lineNo, callback)
{
    FBTestFirebug.selectPanel("html");

    var chrome = FW.Firebug.chrome;
    FBTestFirebug.clickBreakOnNextButton(chrome);

    FBTestFirebug.waitForBreakInDebugger(chrome, lineNo, false, function(sourceRow)
    {
        FBTest.sysout("html.breakpoints.CB; "+ buttonId);
        FBTestFirebug.clickContinueButton(chrome),
        FBTest.progress("The continue button is pushed");
        callback();
    });

    FBTest.click(win.document.getElementById(buttonId));
    FBTest.sysout("html.breakpoints.CB; " + buttonId + " button clicked");
}
