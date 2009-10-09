
function defineSingleStepping()
{
    window.singleStepping = new FBTest.Firebug.TestHandlers("singleStepping");

    // Actual test operations
    singleStepping.add( function onNewPage(event)
    {
        // Open Firebug UI, enable Script panel, reload and start first test.
        FBTestFirebug.openFirebug();
        FBTestFirebug.clearCache();
        FBTestFirebug.selectPanel("script");
        FBTestFirebug.enableScriptPanel(function callbackOnReload(testWindow) {
            singleStepping.window = testWindow;
            singleStepping.selectFile();
        });
    });

    singleStepping.fileName = "index.html";
    singleStepping.breakOnNextLineNo = 2;

    singleStepping.selectFile = function()
    {
     // Select proper JS file.
        var panel = FBTestFirebug.getSelectedPanel();

        var found = FBTestFirebug.selectPanelLocationByName(panel, singleStepping.fileName);
        FBTest.compare(found, true, "The "+singleStepping.fileName+" should be found");
        if (found)
        {
            singleStepping.breakOnNext(panel);
        }
        else
            singleStepping.done();
    };

    singleStepping.breakOnNext = function(panel)
    {
        var canBreakOnNext = FBTestFirebug.clickContinueButton(true);
        FBTest.ok(canBreakOnNext, "The breakOnNext button was pushable");

        var doc = FW.document;
        var button = doc.getElementById("fbContinueButton");
        FBTest.compare("false", button.getAttribute("breakable"), "The button is armed for break")

        FBTest.progress("Listen for exeline true, meaning the breakOnNext hit");

        FBTestFirebug.waitForBreakInDebugger(FW.Firebug.chrome,
            singleStepping.breakOnNextLineNo, false,
            singleStepping.checkBreakOnNext);

        var testPageButton = singleStepping.window.document.getElementById("clicker");
        FBTest.click(testPageButton);
    }

    singleStepping.checkBreakOnNext = function()
    {
        singleStepping.stepInto();
    };

    singleStepping.stepInto = function()
    {
        FBTestFirebug.waitForBreakInDebugger(FW.Firebug.chrome,
            singleStepping.stepIntoLineNo, false,
            singleStepping.checkStepInto);

        FBTest.progress("Press single step button");
        var singleStepButton = FW.document.getElementById("fbStepIntoButton");
        FBTest.click(singleStepButton);  // WHY doesn't this work???

        FW.Firebug.Debugger.stepInto(FW.FirebugContext);
    };

    singleStepping.stepIntoLineNo = 13;
    singleStepping.stepIntoFileName = "index.html";
    singleStepping.checkStepInto = function()
    {
        var panel = FBTestFirebug.getSelectedPanel();
        var name = panel.location.getObjectDescription().name;
        FBTest.compare(singleStepping.stepIntoFileName, name, "StepInto should land in " +
            singleStepping.stepIntoFileName);

        singleStepping.stepOver();
    };

    singleStepping.stepOver = function()
    {
        FBTestFirebug.waitForBreakInDebugger(FW.Firebug.chrome,
            singleStepping.stepOverLineNo, false,
            singleStepping.checkStepOver);

        FBTest.progress("Press single over button");
        var singleStepButton = FW.document.getElementById("fbStepOverButton");
        FBTest.click(singleStepButton);  // WHY doesn't this work???

        FW.Firebug.Debugger.stepOver(FW.FirebugContext);
    };

    singleStepping.stepOverLineNo = 14;
    singleStepping.stepOverFileName = "index.html";
    singleStepping.checkStepOver = function()
    {
        var panel = FBTestFirebug.getSelectedPanel();
        var name = panel.location.getObjectDescription().name;
        FBTest.compare(singleStepping.stepOverFileName, name, "StepOver should land in " +
            singleStepping.stepOverFileName);

        singleStepping.stepOut();
    };

    singleStepping.stepOut = function()
    {
        FBTestFirebug.waitForBreakInDebugger(FW.Firebug.chrome,
            singleStepping.stepOutLineNo, false,
            singleStepping.checkstepOut);

        FBTest.progress("Press single StepOut button");
        var stepOutButton = FW.document.getElementById("fbStepOutButton");
        FBTest.click(stepOutButton);  // WHY doesn't this work???

        FW.Firebug.Debugger.stepOut(FW.FirebugContext);
    };

    singleStepping.stepOutLineNo = 2;
    singleStepping.stepOutFileName = "index.html";
    singleStepping.checkstepOut = function()
    {
        var panel = FBTestFirebug.getSelectedPanel();
        var name = panel.location.getObjectDescription().name.split('/')[0];
        FBTest.sysout("panel.location.getObjectDescription().name: " +
            panel.location.getObjectDescription().name, panel.location.getObjectDescription());
        FBTest.compare(singleStepping.stepOutFileName, name, "StepOut should land in " +
            singleStepping.stepOutFileName);

        var row = FBTestFirebug.getSourceLineNode(singleStepping.stepOutLineNo);
        if (!row)
            FBTest.sysout("Failing row is "+row.parentNode.innerHTML, row);

        var canContinue = FBTestFirebug.clickContinueButton(false);
        FBTest.ok(canContinue, "The continue button was pushable");

        FBTestFirebug.testDone("singleStepping.DONE");
    };
}

// ************************************************************************************************
// Auto-run test

function runTest()
{
    FBTest.sysout("1603 runTest starts");

    if (FBTest.FirebugWindow)
        FBTest.ok(true, "We have the Firebug Window: "+FBTest.FirebugWindow.location);
    else
        FBTest.ok(false, "No Firebug Window");

    // Auto run sequence
    defineSingleStepping();
    var singleSteppingURL = FBTest.getHTTPURLBase()+"script/singleStepping/index.html";
    singleStepping.fireOnNewPage("onNewPage", singleSteppingURL, null);
}