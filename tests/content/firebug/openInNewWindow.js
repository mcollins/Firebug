/**
 * 1) Open a new tab and Firebug UI on it, enable all
 * 2) Detach into new window.
 * 3) Check that some stuff is working
 * 4) Reload page and check all panels again (must be still enabled).
 */

// Reuse material from test 1483
var issue1483 = {};
issue1483.fileName = "index.js";
issue1483.lineNo = 5;


function runTest()
{
    issue1483.URL = FBTest.getHTTPURLBase()+"script/1483/issue1483.html";
    FBTest.progress("openInNewWindow, open test page "+issue1483.URL);
    FBTestFirebug.openNewTab(issue1483.URL, function(win)
    {
        FBTest.progress("opened tab for "+win.location);
        FBTestFirebug.openFirebug();

        FBTest.progress("Enable all panels");
        FBTestFirebug.enableAllPanels();

        FBTest.sysout("FW.FirebugChrome.window.location: "+FW.FirebugChrome.window.location);

        var browser = FW.FirebugChrome.getCurrentBrowser();
        if (browser.detached)
        {
            FBTest.progress("Kill the detached window for browser "+browser.currentURI.spec);
            FBTest.sysout("Firebug.chrome.window.location: "+FW.Firebug.chrome.window.location);
            FW.Firebug.toggleDetachBar();
        }

        FBTestFirebug.reload(function reloadToEnsureSourceFilesLoaded()
        {
            FBTest.progress("reloaded page to ensure all source is available");
            FBTestFirebug.openFirebug();

            FBTest.sysout("ready to detach, browser "+browser.currentURI.spec+" Firebug.chrome:"+FW.Firebug.chrome.window.location);

            FBTest.progress("Detach");
            var detachedFW = FW.Firebug.detachBar(FW.FirebugContext);

            FBTest.ok(detachedFW, "We created a detached window");

            if (!detachedFW)
                 FBTestFirebug.testDone("openInNewWindow.FAILED");

            var oneLoad = new FBTestFirebug.OneShotHandler(detachedFW, 'load', function onLoadWindow(event)
            {
                var doc = event.target;
                FBTest.compare("chrome://firebug/content/firebug.xul", doc.location.toString(), "The detached window should be firebug.xul");

                FBTest.sysout("after to detach, browser "+browser.currentURI.spec+" Firebug.chrome:"+FW.Firebug.chrome.window.location);

                var callbacks = {};
                bindDetachedFW(detachedFW, callbacks);

                function runOnNewEvent()
                {
                    var mainBrowser = doc.getElementById('fbPanelBar1-browser');
                    var panelDocument = mainBrowser.contentDocument;
                    FBTest.sysout("onLoadWindow panelDocument "+panelDocument.location+":", panelDocument);

                    FBTest.progress("panel document "+panelDocument.location+" load event handler")
                    FBTestFirebug.selectPanelTab('script', doc);
                    var panel = detachedFW.FirebugChrome.getSelectedPanel();
                    FBTest.compare(panel.name, 'script', "The script panel should be selected");

                    var found = FBTestFirebug.selectPanelLocationByName(panel, issue1483.fileName);
                    FBTest.compare(found, true, "The "+issue1483.fileName+" should be found");
                    // Select proper JS file.
                    FBTest.Firebug.selectSourceLine(panel.location.href, issue1483.lineNo, "js");

                    var attributes = {"class": "sourceRow", breakpoint: "true"};
                    var lookForBP = new MutationRecognizer(detachedFW, 'div', attributes);

                    lookForBP.onRecognizeAsync(callbacks.onBreak);
                    FBTest.progress("Ready to toggleBreakpoint on "+issue1483.lineNo);
                    panel.toggleBreakpoint(issue1483.lineNo);
                }
                setTimeout(runOnNewEvent);
            } , true);

            FBTest.progress("Waiting for onLoadWindow event");
        });
    });
};

function bindDetachedFW(detachedFW, callbacks)
{
    callbacks.finalReload = function()
    {
        FBTest.progress("reloaded, check detachedFW "+detachedFW.location);
        var panel = detachedFW.FirebugChrome.getSelectedPanel();
        FBTest.compare(panel.name, 'script', "The script panel should be selected");

        FBTest.compare(panel.context.name, issue1483.URL, "The context should be "+issue1483.URL);
        FBTest.progress("close detached window");
        detachedFW.close();

        FBTestFirebug.testDone("openInNewWindow.DONE");
    };

    callbacks.closeOut = function closeOut()
    {
        FBTest.progress("Remove breakpoint from "+detachedFW.location);
        var panel = detachedFW.FirebugChrome.getSelectedPanel();
        FBTest.progress("Remove breakpoint by toggle, from selected panel "+panel.name);
        panel.toggleBreakpoint(issue1483.lineNo);

        FBTest.progress("Removed breakpoint from selected panel "+panel.name);
        var row = FBTestFirebug.getSourceLineNode(issue1483.lineNo, detachedFW.FirebugChrome);

        if (!FBTest.compare("false", row.getAttribute('breakpoint'), "Line "+ issue1483.lineNo+" should NOT have a breakpoint set"))
            FBTest.sysout("Failing row is "+row.parentNode.innerHTML, row)


        FBTestFirebug.clickContinueButton(detachedFW.FirebugChrome);
        FBTest.progress( "The continue button is pushed");

        FBTest.progress("breakpoint checks complete");
    };

    callbacks.onBreak = function onBreak(sourceRow)
    {
        // use chromebug to see the elements that make up the row
        var row = FBTestFirebug.getSourceLineNode(issue1483.lineNo);
        FBTest.compare("true", row.getAttribute('breakpoint'), "Line "+issue1483.lineNo+" should have a breakpoint set");
        FBTestFirebug.waitForBreakInDebugger(detachedFW.FirebugChrome,
                issue1483.lineNo, true, callbacks.closeOut);
        FBTest.progress("Now reload");
        FBTestFirebug.reload(callbacks.finalReload);
    };
}

function testAlwaysOpenOption()
{
    // we should be on page issue1438.html with Firebug closed.

    FBTest.progress("select openInWindow option in "+FW.location);

    var browserDocument = FW.document;
    var fbContentBox = browserDocument.getElementById('fbContentBox');

    var menuitems = fbContentBox.getElementsByTagName("menuitem");

    FBTest.sysout("Looking for openInWindow option in "+menuitems.length+" menuitems")
    for (var i=0; i < menuitems.length; i++)
    {
        FBTest.sysout("Looking for openInWindow option["+i+"]:"+menuitems[i].getAttribute('option')+" menuitems", menuitems[i]);
        if (menuitems[i].getAttribute('option') == "openInWindow")
            break;
    }

    menuitems[i].setAttribute("checked", "true");
    FW.FirebugChrome.onToggleOption(menuitems[i]);
    FBTest.ok(FW.Firebug.openInWindow, "The openInWindow option is selected");

    FBTest.progress("toggle Firebug ")
    FBTest.Firebug.pressToggleFirebug();

    setTimeout(function delayHopefully()
    {
        var placement = FW.Firebug.getPlacement();
        if (!FBTest.compare("detached", placement, "Firebug detached"))
        {
            FBTestFirebug.testDone("openInNewWindow.FAILED");
            return;
        }

        FBTest.sysout("FW.FirebugChrome.window.location: "+FW.FirebugChrome.window.location);

        var detachedFW = FW.Firebug.chrome.window;
        var doc = detachedFW.document;
        if (FBTest.compare("chrome://firebug/content/firebug.xul", doc.location.toString(), "The detached window should be firebug.xul"))
        {
            FBTest.progress("Close the window, hope its the right one...")
            detachedFW.close();
            FBTestFirebug.testDone("openInNewWindow.DONE");
        }
        else
        {
            FBTestFirebug.testDone("openInNewWindow.FAILED");
        }

    });
}

function isPanelNode(event)
{
    FBTest.sysout("isPanelNode event.target: "+event.target, event.target);
    if (event.target instanceof HTMLDivElement)
    {
        var targetClass = event.target.getAttribute('class');
        return (targetClass.indexOf('panelNode') != -1);
    }
    else
        return false;
}


