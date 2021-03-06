function runTest()
{
    FBTest.sysout("console_array.START");
    FBTestFirebug.openNewTab(basePath + "console/reps/console_array.html", function(win)
    {
        FBTestFirebug.selectPanel("console");
        FBTestFirebug.enableConsolePanel(function(win) // causes reload
        {
            fireTest(win, "runTests");
        });
    });
}


function waitForLogEvent(event)
{
    if (window.closed)
        throw "Window is closed!!!";

    FBTest.sysout("waitForLogEvent got event, new child is: "+event.target.tagName, event);

    var elt = event.target;
    if (FW.FBL.hasClass(elt, 'logRow'))
    {
        var shouldBe = elt.firstChild;

        if (shouldBe.innerHTML == "DONE")
            FBTestFirebug.testDone("console_array.done");

        var desc = shouldBe.nextSibling;

        while (desc.tagName != 'SPAN')  // skip text
            desc = desc.nextSibling;

        var arrayBox = FW.FBL.getElementByClass(elt, "objectBox-array");

        if (shouldBe.innerHTML == "array")
            FBTest.ok(arrayBox, desc.innerHTML+" has array display");
        else
            FBTest.ok(!arrayBox, desc.innerHTML+" has no array display");
    }
}


function fireTest(win, id)
{
    window.currentLogHandler = waitForLogEvent;
    window.currentLogHandler.eventName = "DOMNodeInserted";
    window.currentLogHandler.capturing = false;

    var panelDoc = FBTestFirebug.getPanelDocument();
    panelDoc.addEventListener(window.currentLogHandler.eventName, window.currentLogHandler, window.currentLogHandler.capturing);

    window.addEventListener("unload", function cleanUp()
    {
        panelDoc.removeEventListener(window.currentLogHandler.eventName, window.currentLogHandler, window.currentLogHandler.capturing);
    }, true);


    var button = win.document.getElementById(id);
    FBTest.click(button);
}
