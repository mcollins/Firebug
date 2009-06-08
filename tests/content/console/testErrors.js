function runTest()
{
    FBTest.sysout("testErrors.START");
    FBTestFirebug.openNewTab(basePath + "console/testErrors.html", function(win)
    {
        FBTestFirebug.selectPanel("console");
        FBTestFirebug.enableConsolePanel(function(win) // causes reload
        {
           fireTest(win, 0);
        });
    });
}


function fireTest(win, ith)
{
    var buttons = ["syntaxError", "shallowError", "deepError", "throw"];
    var titles = ["missing ; before statement", "foops is not defined",
                  "B3 is not defined", "uncaught exception: hi"];
    var sources = ["2BeOrNot2Be(40)", "", "/*foo*/                    B3();\\r\\n", ""];

    if (ith >= buttons.length)
    {
        FBTest.testDone("testErrors.done");
        return;
    }

    var panelDoc = FBTestFirebug.getPanelDocument();

    var lookForLogRow = new MutationRecognizer(panelDoc.defaultView, 'div', {class: "logRow-errorMessage"});

    lookForLogRow.onRecognize(function sawLogRow(elt)
    {
        FBTest.progress("matched logRow-errorMessage with "+ith, elt);
        checkConsoleLogMessage(elt, titles[ith], sources[ith]);
        setTimeout(function bindArgs() { return fireTest(win, ith+1); });
    });

    var button = win.document.getElementById(buttons[ith]);
    FBTest.progress("testing "+button.getAttribute('id'));
    FBTest.click(button);
}

function checkConsoleLogMessage(log, expectedTitle, expectedSource)
{
    var title = FW.FBL.getElementByClass(log, "errorTitle");
    var source = FW.FBL.getElementByClass(log, "errorSource");

    FBTest.compare(expectedTitle, title.textContent, "The error message must be correct.");
    if (expectedSource)
        FBTest.compare(expectedSource, source.textContent, "The error source must be correct.");
}
