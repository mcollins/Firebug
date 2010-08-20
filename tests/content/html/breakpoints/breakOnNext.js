function runTest()
{
    FBTest.sysout("html.breakpoints; START");
    FBTest.setPref("service.filterSystemURLs", true);

    var doNotFilter = FBTest.getPref("service.filterSystemURLs");

    FBTest.compare(true, doNotFilter, "Pref service.filterSystemURLs must be set true");
    FBTest.compare(true, FW.Firebug.filterSystemURLs, "Pref Firebug.filterSystemURLs must be set true");


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
            FBTestFirebug.runTestSuite(testSuite, function() {
                FBTestFirebug.testDone("html.breakpoints; DONE");
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
        FBTest.sysout("html.breakpoints; "+ buttonId);
        FBTestFirebug.clickContinueButton(chrome),
        FBTest.progress("The continue button is pushed");
        callback();
    });

    FBTest.click(win.document.getElementById(buttonId));
    FBTest.sysout("html.breakpoints; " + buttonId + " button clicked");
}
