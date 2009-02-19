/* 
 * @author: Jan Odvarko, www.janodvarko.cz
 */

// XPCOM
var Cc = Components.classes;
var Ci = Components.interfaces;

// Firebug
var chrome = window.parent.parent;
var FBTest = chrome.FBTest;
var FBL = chrome.FBL;
var FW = FBTest.FirebugWindow;

// Server
var basePath = FBTest.getHTTPURLBase();

//-------------------------------------------------------------------------------------------------
// Default error handling

// Handle unexpected errors on the page and finish the current test.
/*window.onerror = function(errType, errURL, errLineNum) 
{
    var path = window.location.pathname;
    var fileName = path.substr(path.lastIndexOf("/") + 1);
    var errorDesc = errType + " (" + errLineNum + ")" + " " + errURL;
    FBTest.sysout(fileName + " ERROR " + errorDesc);
    FBTest.ok(false, errorDesc);
    FBTest.testDone();
    return true;
}*/

//-------------------------------------------------------------------------------------------------
// Helpers

function expandNetRows(panelNode, className) // className, className, ...
{
    var rows = chrome.FBL.getElementsByClass.apply(null, arguments);
    for (var i=0; i<rows.length; i++)
    {
        var row = rows[i];
        if (!chrome.FBL.hasClass(row, "opened"))
            FBTest.click(row);
    }
}

function expandNetTabs(panelNode, tabClass)
{
    var tabs = chrome.FBL.getElementsByClass.apply(null, arguments);
    for (var i=0; i<tabs.length; i++)
    {
        var tab = tabs[i];
        if (!chrome.FBL.hasClass(tab, "collapsed"))
            FBTest.click(tab);
    }
}

function openNewTab(url, callback)
{
    var tabbrowser = FW.getBrowser();
    var testHandler = this;
    var newTab = tabbrowser.addTab(url);
    newTab.setAttribute("firebug", "test");
    tabbrowser.selectedTab = newTab;
    var browser = tabbrowser.getBrowserForTab(newTab);
    var onLoadURLInNewTab = function(event)
    {
        browser.removeEventListener('load', onLoadURLInNewTab, true);
        setTimeout(function() { callback(browser.contentWindow); }, 100);
    }
    browser.addEventListener("load", onLoadURLInNewTab, true);
}

function openURL(url, callback)
{
    var tabbrowser = FW.getBrowser();
    var browser = tabbrowser.getBrowserForTab(tabbrowser.selectedTab);
    var onLoadURL = function(event) 
    {
        browser.removeEventListener("load", onLoadURL, true);
        callback(tabbrowser.selectedBrowser.contentDocument.defaultView);
    }
    browser.addEventListener("load", onLoadURL, true);

    // Reload content of the selected tab.
    tabbrowser.selectedBrowser.contentDocument.defaultView.location.href = url;
}

function reload(callback)
{
    var tabbrowser = FW.getBrowser();
    var browser = tabbrowser.getBrowserForTab(tabbrowser.selectedTab);
    var onLoadURL = function(event) 
    {
        browser.removeEventListener("load", onLoadURL, true);
        callback(tabbrowser.selectedBrowser.contentDocument.defaultView);
    }
    browser.addEventListener("load", onLoadURL, true);

    // Reload content of the selected tab.
    tabbrowser.selectedBrowser.contentDocument.defaultView.location.reload();
}

function cleanUpTestTabs()
{
    var tabbrowser = FBTest.FirebugWindow.getBrowser();
    for (var i = 0; i < tabbrowser.mTabs.length; i++)
    {
        var tab = tabbrowser.mTabs[i];
        var firebugAttr = tab.getAttribute("firebug");
        if (firebugAttr == "test")
            tabbrowser.removeTab(tab);
    }
}

function toggleFirebug()
{
    FBTest.pressKey(123); // F12
}

function openFirebug()
{
    if (!isFirebugOpen())
        toggleFirebug();
}

function isFirebugOpen()
{
    var fbContentBox = FW.document.getElementById("fbContentBox");
    var collapsedFirebug = fbContentBox.getAttribute("collapsed");
    return (collapsedFirebug == "true") ? false : true;
}

function clearCache()
{
    var cache = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService);
    cache.evictEntries(Ci.nsICache.STORE_ON_DISK);
    cache.evictEntries(Ci.nsICache.STORE_IN_MEMORY);
}

function enableNetPanel(callback)
{
    openFirebug();
    FW.Firebug.NetMonitor.setHostPermission(FW.FirebugContext, "enable");
    clearCache();
    if (callback)
        reload(callback);
}

function enableScriptPanel(callback)
{
    openFirebug();
    FW.Firebug.Debugger.setHostPermission(FW.FirebugContext, "enable");
    clearCache();
    if (callback)
        reload(callback);
}

function enableConsolePanel(callback)
{
    openFirebug();
    FW.Firebug.Console.setHostPermission(FW.FirebugContext, "enable");
    clearCache();
    if (callback)
        reload(callback);
}
