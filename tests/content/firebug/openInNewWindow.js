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
            FBTest.sysout("browser.chrome.window.location: "+browser.chrome.window.location);
            FW.Firebug.toggleDetachBar();
        }

        FBTestFirebug.reload(function reloadToEnsureSourceFilesLoaded()
        {
            FBTest.progress("reloaded page to ensure all source is available");
            FBTestFirebug.openFirebug();

            FBTest.sysout("ready to detach, browser "+browser.currentURI.spec+" browser.chrome:"+browser.chrome.window.location);

            FBTest.progress("Detach");
            var detachedFW = FW.Firebug.detachBar(FW.FirebugContext);

            FBTest.ok(detachedFW, "We created a detached window");

            var oneLoad = new FBTestFirebug.OneShotHandler(detachedFW, 'load', function onLoadWindow(event)
            {
                var doc = event.target;
                FBTest.compare("chrome://firebug/content/firebug.xul", doc.location.toString(), "The detached window should be firebug.xul");

                FBTest.sysout("after to detach, browser "+browser.currentURI.spec+" browser.chrome:"+browser.chrome.window.location);

                var mainBrowser = doc.getElementById('fbPanelBar1-browser');
                var panelDocument = mainBrowser.contentDocument;
                FBTest.sysout("onLoadWindow panelDocument "+panelDocument.location+":", panelDocument);

                setTimeout( function onLoadBrowser(event)
                {
                    FBTest.progress("panel document "+panelDocument.location+" load event handler")
                    FBTestFirebug.selectPanelTab('script', doc);
                    var panel = detachedFW.FirebugChrome.getSelectedPanel();
                    FBTest.compare(panel.name, 'script', "The script panel should be selected");

                    var found = FBTestFirebug.selectPanelLocationByName(panel, issue1483.fileName);
                    FBTest.compare(found, true, "The "+issue1483.fileName+" should be found");
                    // Select proper JS file.
                    FBTest.Firebug.selectSourceLine(panel.location.href, issue1483.lineNo, "js");
                    setBreakpoint(detachedFW);

                    FBTestFirebug.listenForBreakpoint(detachedFW.FirebugChrome, issue1483.lineNo, function closeOut()
                    {
                        FBTest.progress("breakpoint checks complete");
                    });

                    FBTest.progress("Now reload");

                    FBTestFirebug.reload(function ()  // listenForBreakpoint should hit first
                    {
                        FBTest.progress("reloaded, check detachedFW "+detachedFW.location);
                        var panel = detachedFW.FirebugChrome.getSelectedPanel();
                        FBTest.compare(panel.name, 'script', "The script panel should be selected");

                        FBTest.compare(panel.context.name, issue1483.URL, "The context should be "+issue1483.URL);
                        FBTest.progress("close detached window");
                        detachedFW.close();
                        FBTestFirebug.testDone("openInNewWindow.DONE");
                    });

                }, true);
            } , true);
            FBTest.progress("Waiting for onLoadWindow event");
        });
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


function setBreakpoint(detachedFW)
{
    var panel = detachedFW.FirebugContext.chrome.getSelectedPanel();
    panel.toggleBreakpoint(issue1483.lineNo);

    // use chromebug to see the elements that make up the row
    var row = FBTestFirebug.getSourceLineNode(issue1483.lineNo);
    FBTest.compare("true", row.getAttribute('breakpoint'), "Line "+issue1483.lineNo+" should have a breakpoint set");

    //issue1483.secondReload(panel);
};
