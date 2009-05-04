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

    window.currentLogHandler = getLogHandler(win, ith, titles[ith], sources[ith]);
    window.currentLogHandler.eventName = "DOMNodeInserted";
    window.currentLogHandler.capturing = false;

    var panelDoc = FBTestFirebug.getPanelDocument();
    panelDoc.addEventListener(window.currentLogHandler.eventName, window.currentLogHandler, window.currentLogHandler.capturing);

    window.addEventListener("unload", function cleanUp()
    {
        panelDoc.removeEventListener(window.currentLogHandler.eventName, window.currentLogHandler, window.currentLogHandler.capturing);
    }, true);


    var button = win.document.getElementById(buttons[ith]);
    FBTest.progress("testing "+button.getAttribute('id'));
    FBTest.click(button);
}

function getLogHandler(win, ith, expectedTitle, expectedSource)
{
    FBTest.sysout("getLogHandler "+ith+" on window "+win.location+" "+expectedTitle+" source: "+expectedSource);
    return function waitForLogEvent(event)
    {
        if (window.closed)
            throw "Window is closed!!!";

        FBTest.sysout("waitForLogEvent got event, new child is: "+event.target.tagName, event);
        var elt = event.target;
        if (FW.FBL.hasClass(elt, 'logRow'))
        {
            elt.ownerDocument.removeEventListener(window.currentLogHandler.eventName, window.currentLogHandler, window.currentLogHandler.capturing);
            checkConsoleLogMessage(elt, expectedTitle, expectedSource);
            fireTest(win, ith+1);
        }
    }
}

function checkConsoleLogMessage(log, expectedTitle, expectedSource)
{
    var title = FW.FBL.getElementByClass(log, "errorTitle");
    var source = FW.FBL.getElementByClass(log, "errorSource");

    FBTest.compare(expectedTitle, title.textContent, "The error message must be correct.");
    if (expectedSource)
        FBTest.compare(expectedSource, source.textContent, "The error source must be correct.");
}
