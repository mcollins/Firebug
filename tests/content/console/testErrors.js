function runTest()
{
    FBTest.sysout("testErrors.START");
    FBTestFirebug.openNewTab(basePath + "console/testErrors.html", function(win)
    {
        FBTestFirebug.selectPanel("console");
        FBTestFirebug.enableConsolePanel(function(win) 
        {
            FW.Firebug.Console.addListener(consoleListener);

            // Click on buttons.
            var buttons = ["syntaxError", "shallowError", "deepError", "throw"];
            for (var i=0; i<buttons.length; i++)
            {
                var button = win.document.getElementById(buttons[i]);
                function click(button) {
                    setTimeout(function() { FBTest.click(button); }, 10);
                }
                click(button);
            }
        });
    });
}

var counter = 0;
var consoleListener = 
{
    log: function(object, context, className, rep, noThrottle, sourceLink)
    {
        if (++counter < 4)
            return;

        var panelNode = FBTestFirebug.getPanel("console").panelNode;
        FW.Firebug.Console.removeListener(consoleListener);

        // Check console panel.
        setTimeout(function()
        {
            var titles = ["missing ; before statement", "foops is not defined", 
                "B3 is not defined", "uncaught exception: hi"];
            var sources = ["2BeOrNot2Be(40)", "", "/*foo*/                    B3();", ""];

            var logs = FW.FBL.getElementsByClass(panelNode, "logRow", "logRow-errorMessage");
            FBTest.compare(4, logs.length, "There must be four error logs in the Console panel.");
            if (logs.length != 4)
                return FBTestFirebug.testDone();

            for (var i=0; i<logs.length; i++)
            {
                var log = logs[i];
                var title = FW.FBL.getElementByClass(log, "errorTitle");
                var source = FW.FBL.getElementByClass(log, "errorSource");

                FBTest.compare(titles[i], title.textContent, "The error message must be correct.");
                if (sources[i])
                    FBTest.compare(sources[i], source.textContent, "The error source must be correct.");
            }

            FBTestFirebug.testDone("testErrors.DONE");
        }, 400);
    }
}
