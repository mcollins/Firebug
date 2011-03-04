function runTest()
{
    FBTest.sysout("net.breakpoints; START");
    FBTest.setPref("service.filterSystemURLs", true);

    FBTestFirebug.openNewTab(basePath + "net/breakpoints/breakOnXHR.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableAllPanels();

        var panel = FBTestFirebug.selectPanel("net");

        // A suite of asynchronous tests.
        var testSuite = [];
        testSuite.push(function(callback) {
            addBreakpoint(win, callback);
        });
        testSuite.push(function(callback) {
            breakOnXHR(win, 44, callback);
        });
        testSuite.push(function(callback) {
            setCondition(win, callback);
        });
        testSuite.push(function(callback) {
            breakOnXHR(win, 44, callback);
        });
        testSuite.push(function(callback) {
            removeBreakpoint(win, callback);
        });

        // Reload window to activate debugger and run all tests.
        FBTestFirebug.reload(function(win) {
            FBTestFirebug.runTestSuite(testSuite, function() {
                FBTestFirebug.testDone("dom.breakpoints; DONE");
            });
        })
    });
}

// ************************************************************************************************
// Asynchronous Tests

function addBreakpoint(win, callback)
{
    FBTest.sysout("net.breakpoints; addBreakpoint");

    var panel = FBTestFirebug.selectPanel("net");

    panel.context.netProgress.breakpoints.breakpoints = [];

    // Create listener for mutation events.
    var doc = FBTestFirebug.getPanelDocument();
    var recognizer = new MutationRecognizer(doc.defaultView, "tr",
        {"class": "netRow category-xhr hasHeaders loaded"});

    // Wait till the XHR request is visible
    recognizer.onRecognize(function(row)
    {
        FBTest.sysout("net.breakpoints; XHR visible");

        if (row.repObject)
        {
            createBreakpoint(panel, row.repObject, callback);
        }
        else
        {
            // Wait till the repObject is set.
            row.watch("repObject", function(prop, oldVal, newVal)
            {
                row.unwatch("repObject");
                createBreakpoint(panel, newVal, callback);
                return newVal;
            });
        }
    });

    pushButton(win, "executeRequest1");

    FBTest.sysout("net.breakpoints; XHR executed");
}

function createBreakpoint(panel, repObject, callback)
{
    FBTest.sysout("net.breakpoints; createBreakpoint", repObject);

    var bpUrl = basePath + "net/breakpoints/process1.php";
    var breakpoints = panel.context.netProgress.breakpoints;

    var bp = breakpoints.findBreakpoint(bpUrl);
    FBTest.ok(!bp, "XHR breakpoint for 'process1.php' must not exist.");

    // Create a new breakpoint.
    panel.breakOnRequest(repObject);

    bp = breakpoints.findBreakpoint(bpUrl);
    FBTest.ok(bp, "XHR breakpoint for 'process1.php' must exist.");

    callback();
}

function breakOnXHR(win, lineNo, callback)
{
    FBTest.sysout("net.breakpoints; breakOnXHR");

    FBTestFirebug.selectPanel("script");

    // Wait for break.
    var chrome = FW.Firebug.chrome;
    FBTestFirebug.waitForBreakInDebugger(chrome, lineNo, false, function(sourceRow)
    {
        FBTest.sysout("net.breakpoints; Break on XHR OK");
        FBTestFirebug.clickContinueButton(chrome);
        FBTest.progress("The continue button is pushed");
        callback();
    });

    pushButton(win, "executeRequest1");
}

function setCondition(win, callback)
{
    FBTest.progress("net.breakpoints; setCondition");

    var panel = FBTestFirebug.selectPanel("net");
    var bpUrl = basePath + "net/breakpoints/process1.php";
    var bp = panel.context.netProgress.breakpoints.findBreakpoint(bpUrl);

    // The breakpoint must exist now, set condition.
    if (FBTest.ok(bp, "XHR breakpoint for 'process1.php' must exist."))
        bp.condition = "param == 1";

    callback();
}

function removeBreakpoint(win, callback)
{
    FBTest.progress("net.breakpoints; removeBreakpoint");

    var panel = FBTestFirebug.selectPanel("net");

    var row = FW.FBL.getElementByClass(panel.panelNode, "netRow",
        "category-xhr", "hasHeaders", "loaded");
    FBTest.sysout("net.breakpoints; removeBreakpoint, row", row.repObject);

    // Remove breakpoint
    panel.breakOnRequest(row.repObject);

    var bpUrl = basePath + "net/breakpoints/process1.php";
    var bp = panel.context.netProgress.breakpoints.findBreakpoint(bpUrl);
    FBTest.ok(!bp, "XHR breakpoint for 'process1.php' must not exist.");

    callback();
}

// ************************************************************************************************
// Helpers

function pushButton(win, buttonId)
{
    FBTest.click(win.document.getElementById(buttonId));
}
