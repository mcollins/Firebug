/**
 * 1) Open two new tabs and firebu on it.
 * 2) Disable net panel.
 * 3) Enable net panel.
 * 4) Select net panel. 
 * 5) Perform net request on the first tab and check net panel content.
 * 6) Perform net request on the second tab and check net panel content.
 */

var tab1 = null;
var tab2 = null;
var counter = 0;

function runTest()
{
    FBTest.sysout("panelContentAfterReopen.START");
    tab1 = FBTestFirebug.openNewTab(basePath + "net/activation/activation1.html", onTabLoad);
    tab2 = FBTestFirebug.openNewTab(basePath + "net/activation/activation2.html", onTabLoad);
}

function onTabLoad(window)
{
    // Wait till both tabs are opened.
    if (++counter < 2)
        return;

    // Select net panel and enable/disable.
    var panel = FW.FirebugChrome.selectPanel("net");
    FBTestFirebug.disableNetPanel();
    FBTestFirebug.enableNetPanel();

    // Select first tab, execute XHR and verify. Once it's done do the same for the other tab. 
    selectTabAndVerify(tab1, function() {
        selectTabAndVerify(tab2, function() {
            FBTestFirebug.testDone("panelContentAfterReopen.DONE");
        });
    });
}

function selectTabAndVerify(tab, callback)
{
    var tabbrowser = FW.getBrowser();
    tabbrowser.selectedTab = tab;

    FBTestFirebug.openFirebug();

    var win = tab.linkedBrowser.contentWindow;
    win.wrappedJSObject.runTest(function(request)
    {
        FBTest.sysout("activation.onResponse; " + request.channel.name, request);

        var panel = FW.FirebugChrome.selectPanel("net");
        var netRow = FW.FBL.getElementByClass(panel.panelNode, "netRow", "category-xhr", "hasHeaders", "loaded");
        FBTest.ok(netRow, "There must be one xhr request.");

        callback();
    });
}
