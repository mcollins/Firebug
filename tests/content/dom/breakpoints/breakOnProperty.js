function runTest()
{
    FBTest.sysout("dom.breakpoints; START");
    FBTestFirebug.openNewTab(basePath + "dom/breakpoints/breakOnProperty.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableScriptPanel(function(win)
        {
            var panel = FBTestFirebug.selectPanel("dom");

            var row = getPropertyRow(panel, "_testProperty");
            if (!FBTest.ok(row, "_testProperty must be available"))
            {
                FBTestFirebug.testDone("dom.breakpoints; DONE");
                return;
            }

            // Create breakpoint.
            panel.breakOnProperty(row);

            var testSuite = [];
            testSuite.push(function(callback) {
                breakOnMutation(win, "changeProperty", 44, callback);
            });
            testSuite.push(function(callback) {
                FBTest.click(win.wrappedJSObject.document.getElementById("removeProperty"));
                callback();
            });
            testSuite.push(function(callback) {
                breakOnMutation(win, "addProperty", 39, callback);
            });
            testSuite.push(function(callback) {
                breakOnMutation(win, "changeProperty", 44, callback);
            });

            runTestSuite(testSuite);
        });
    });
}

function breakOnMutation(win, buttonId, lineNo, callback)
{
    FBTestFirebug.selectPanel("dom");

    var chrome = FW.Firebug.chrome;
    FBTestFirebug.waitForBreakInDebugger(chrome, lineNo, false, function(sourceRow)
    {
        FBTest.ok(FBTestFirebug.clickContinueButton(false, chrome),
            "The continue button is pushed");
        callback();
    });

    FBTest.click(win.wrappedJSObject.document.getElementById(buttonId));
}

function getPropertyRow(panel, propName)
{
    var rows = FW.FBL.getElementsByClass(panel.panelNode, "memberRow", "userRow");
    for (var i=0; i<rows.length; i++)
    {
        var row = rows[i];
        var label = FW.FBL.getElementByClass(row, "memberLabel", "userLabel");
        if (label.textContent == propName)
            return row;
    }
    return null;
}

// ************************************************************************************************
// Helpers

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
                FBTestFirebug.testDone("dom.breakpoints; DONE");
        });
    }, 100);
}

