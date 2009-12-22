function runTest()
{
    FBTest.sysout("dom.breakpoints; START");
    FBTestFirebug.openNewTab(basePath + "dom/breakpoints/breakOnProperty.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableScriptPanel(function(win)
        {
            var panel = FBTestFirebug.selectPanel("dom");
            var row = getPropertyRow(panel, "anObject");
            if (!FBTest.ok(row, "anObject must be available"))
            {
                FBTestFirebug.testDone("dom.breakpoints; FAILED");
                return;
            }

            var recognizer = new MutationRecognizer(panel.document.defaultView,
                "Text", {}, "_testProperty");

            // Wait till _testProperty row in the UI is available. This row displays
            // the _testProperty and we need to created a breakpoint on it.
            recognizer.onRecognize(function (element)
            {
                var row = getPropertyRow(panel, "_testProperty");
                if (!FBTest.ok(row, "_testProperty must be available"))
                {
                    FBTestFirebug.testDone("dom.breakpoints; DONE");
                    return;
                }

                // OK, the row exists, but we need to wait till the
                // domObject property is set. This is done by domplate just
                // after the row is inserted into the document.
                row.watch("domObject", function(prop, oldVal, newVal)
                {
                    row.unwatch("domObject");

                    row.domObject = newVal;
                    panel.breakOnProperty(row);

                    var testSuite = [];
                    testSuite.push(function(callback) {
                        breakOnMutation(win, "changeProperty", 45, callback);
                    });
                    testSuite.push(function(callback) {
                        FBTest.click(win.wrappedJSObject.document.getElementById("removeProperty"));
                        callback();
                    });
                    testSuite.push(function(callback) {
                        breakOnMutation(win, "addProperty", 40, callback);
                    });
                    testSuite.push(function(callback) {
                        breakOnMutation(win, "changeProperty", 45, callback);
                    });

                    runTestSuite(testSuite);
                })
            });

            // Click to expand object's properties.
            var label = row.getElementsByClassName("memberLabel").item(0);
            FBTest.click(label);
        });
    });
}

function breakOnMutation(win, buttonId, lineNo, callback)
{
    FBTestFirebug.selectPanel("dom");

    var chrome = FW.Firebug.chrome;
    FBTestFirebug.waitForBreakInDebugger(chrome, lineNo, false, function(sourceRow)
    {
        FBTestFirebug.clickContinueButton(chrome);
        FBTest.progress("The continue button is pushed");
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

