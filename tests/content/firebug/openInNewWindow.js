var fileName = "index.js";
var lineNo = 5;
var testPageURL = basePath + "script/1483/issue1483.html";
var detachedWindow;

function runTest()
{
    FBTest.sysout("openInNewWindow.START");
    FBTest.openNewTab(testPageURL, function(win)
    {
        FBTest.openFirebug();
        FBTest.enableAllPanels();

        // Reload afeter enable panels.
        FBTest.reload(function()
        {
            var tasks = new FBTest.TaskList();
            tasks.push(waitForDetachedFirebug);
            tasks.push(setBreakpointReloadAndWaitForBreak);
            tasks.push(reloadAgainAndWaitForBreak);

            tasks.run(function() {
                FBTest.testDone("openInNewWindow.DONE");
            })
        });
    });
};

function waitForDetachedFirebug(callback)
{
    detachedWindow = detachFirebug();
    if (!FBTest.ok(detachedWindow, "Firebug is detaching..."))
    {
        FBTest.testDone("openInNewWindow.FAILED");
        return;
    }

    FBTest.OneShotHandler(detachedWindow, "load", function(event)
    {
        FBTest.progress("Firebug detached in a new window.");
        callback();
    });
}

function setBreakpointReloadAndWaitForBreak(callback)
{
    FBTest.waitForBreakInDebugger(null, lineNo, true, function()
    {
        FBTest.progress("The first break happened");
        callback();
    });

    FBTest.setBreakpoint(null, fileName, lineNo, function()
    {
        FBTest.reload();
    });
}

function reloadAgainAndWaitForBreak(callback)
{
    var hit = false;
    FBTest.waitForBreakInDebugger(null, lineNo, true, function()
    {
        hit = true;
        FBTest.progress("The second break on the breakpoint.");
        FBTest.clickContinueButton();
    });

    FBTest.reload(function()
    {
        FBTest.ok(hit, "The second break happened");
        closeDetachedFirebug();
        callback();
    });
}

// ********************************************************************************************* //
// xxxHonza: Remove as soon as this API is ported into FBTest 1.6

function closeDetachedFirebug()
{
    if (!FW.Firebug.isDetached())
        return false;

    // Better would be to look according to the window type, but it's not set in firebug.xul
    var result = FW.FBL.iterateBrowserWindows("", function(win)
    {
        if (win.location.href == "chrome://firebug/content/firebug.xul")
        {
            win.close();
            return true;
        }
    });

    return result;
}

function detachFirebug()
{
    if (FW.Firebug.isDetached())
        return null;

    return FW.Firebug.detachBar(FW.FirebugContext);
}
