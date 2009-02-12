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

// Server
var basePath = "http://localhost:7080/";

//-------------------------------------------------------------------------------------------------
// Default error handling

// Handle unexpected errors on the page and finish the current test.
window.onerror = function(errType, errURL, errLineNum) 
{
    var path = window.location.pathname;
    var fileName = path.substr(path.lastIndexOf("/") + 1);
    var errorDesc = errType + " (" + errLineNum + ")" + " " + errURL;
    FBTest.sysout(fileName + " ERROR " + errorDesc);
    FBTest.ok(false, errorDesc);
    FBTest.testDone();
    return true;
}

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
    var tabbrowser = FBTest.FirebugWindow.getBrowser();
    var testHandler = this;
    var newTab = tabbrowser.addTab(url);
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
    var tabbrowser = FBTest.FirebugWindow.getBrowser();
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

function removeCurrentTab()
{
    var tabbrowser = FBTest.FirebugWindow.getBrowser();
    tabbrowser.removeCurrentTab();
}
