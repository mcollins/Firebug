// 1) Load test page
// 2) Open Firebug UI and Enable all panels
// 3) Step by step reload the page with css, html and dom panel selected.
// 4) Verify content of each selected panel after reload.
function runTest()
{
    FBTest.sysout("issue2613.START");
    FBTestFirebug.openNewTab(basePath + "firebug/2613/issue2613.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableAllPanels();

        // The reload functions will be called three times. Once for each panel.
        var testSuite = [];
        testSuite.push(function(callback) {
            reload("css", callback);
        });
        testSuite.push(function(callback) {
            reload("html", callback);
        });
        testSuite.push(function(callback) {
            reload("dom", callback);
        });

        // Run test suite.
        runTestSuite(testSuite, function() {
            FBTestFirebug.testDone("issue2613; DONE");
        });
    });
}

function reload(panelName, callback)
{
    FBTestFirebug.clearCache();

    // Select specified panel.
    FBTestFirebug.selectPanel(panelName);

    // Reload with the panel selected (it takes 2 sec to get the
    // DOMContentLoaded event on this page)
    FBTestFirebug.reload(function()
    {
        var panel = FBTestFirebug.getPanel(panelName);
        FBTest.ok(panel.panelNode.firstChild, "The " + panelName + " panel must not be empty");
        callback();
    })
}
