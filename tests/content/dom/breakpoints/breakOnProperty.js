function runTest()
{
    FBTest.sysout("dom.breakpoints; START");
    FBTest.setPref("service.filterSystemURLs", true);

    FBTestFirebug.openNewTab(basePath + "dom/breakpoints/breakOnProperty.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableAllPanels();

        FBTestFirebug.selectPanel("dom");

        // Reload window to activate debugger and run breakOnTest.
        FBTestFirebug.reload(function(win)
        {
            var panel = FBTestFirebug.getPanel("dom");
            var row = getPropertyRow(panel, "anObject");
            onPropertyDisplayed(row, "anObject", function(row)
            {
                // Wait till _testProperty row in the UI is available. This row displays
                // the _testProperty and we need to created a breakpoint on it.
                onPropertyDisplayed(null, "_testProperty", function(element)
                {
                    // Set breakpoint.
                    panel.breakOnProperty(element);

                    var doc = element.ownerDocument;
                    var testSuite = [];
                    testSuite.push(function(callback) {
                        FBTest.progress("4 " + win);
                        breakOnMutation(win, "changeProperty", 43, callback);
                    });
                    testSuite.push(function(callback) {
                        FBTest.click(win.document.getElementById("removeProperty"));
                        callback();
                    });
                    testSuite.push(function(callback) {
                        breakOnMutation(win, "addProperty", 38, callback);
                    });
                    testSuite.push(function(callback) {
                        breakOnMutation(win, "changeProperty", 43, callback);
                    });

                    FBTestFirebug.runTestSuite(testSuite, function() {
                        FBTestFirebug.testDone("dom.breakpoints; DONE");
                    });
                });

                // Click to expand object's properties.
                var label = row.getElementsByClassName("memberLabel").item(0);
                FBTest.click(label);
            });
        });
    });
}

function onPropertyDisplayed(element, propName, callback)
{
    if (element)
        return callback(element);

    var panel = FBTestFirebug.getPanel("dom");
    var recognizer = new MutationRecognizer(panel.document.defaultView,
        "Text", {}, propName);
    recognizer.onRecognizeAsync(callback);
}

function breakOnMutation(win, buttonId, lineNo, callback)
{
    FBTest.progress("breakOnMutation; " + buttonId);

    FBTestFirebug.selectPanel("dom");

    var chrome = FW.Firebug.chrome;
    FBTestFirebug.waitForBreakInDebugger(chrome, lineNo, false, function(sourceRow)
    {
        FBTestFirebug.clickContinueButton(chrome);
        FBTest.progress("The continue button is pushed");
        callback();
    });

    FBTest.click(win.document.getElementById(buttonId));
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
