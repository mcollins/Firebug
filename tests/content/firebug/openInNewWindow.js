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

        FBTest.progress("Kill the window if it is detached");
        var browser = FW.FirebugChrome.getCurrentBrowser();
        if (browser.detached)
            FW.Firebug.toggleDetachBar();

        FBTest.progress("Detach");
        var detachedFW = FW.Firebug.detachBar();

        FBTest.ok(detachedFW, "We created a detached window");

        detachedFW.addEventListener('load', checkOpenInNewWindow, 'true');

    });
}

function checkOpenInNewWindow(event)
{
    var doc = event.target;
    var detachedFW = doc.defaultView;

    // Select proper JS file.
    var panel = detachedFW.FirebugChrome.getSelectedPanel();

    var found = FBTestFirebug.selectPanelLocationByName(panel, issue1483.fileName);
    FBTest.compare(found, true, "The "+issue1483.fileName+" should be found");
    if (found)
    {
        FBTest.Firebug.selectSourceLine(panel.location.href, issue1483.lineNo, "js");
        setBreakpoint(detachedFW);
    }
    else
        FBTestFirebug.testDone("openInNewWindow.DONE");

    FBTest.progress("Now reload");

    FBTestFirebug.reload(function ()
    {
        FBTest.progress("reloaded, check detachedFW "+detachedFW.location);

        FBTest.progress("close detached window");
        detachedFW.close();

        FBTestFirebug.testDone("openInNewWindow.DONE");
    });



};


function setBreakpoint(detachedFW)
{
    var panel = detachedFW.FirebugContext.chrome.getSelectedPanel();
    panel.toggleBreakpoint(issue1483.lineNo);

    // use chromebug to see the elements that make up the row
    var row = FBTestFirebug.getSourceLineNode(issue1483.lineNo);
    FBTest.compare("true", row.getAttribute('breakpoint'), "Line "+issue1483.lineNo+" should have a breakpoint set");

    //issue1483.secondReload(panel);
};
