/* See license.txt for terms of usage */

// XPCOM
var Cc = Components.classes;
var Ci = Components.interfaces;

var FBTestFirebug = function() { 

// ************************************************************************************************
// Constants

window.FW = FBTest.FirebugWindow;
window.basePath = FBTest.getHTTPURLBase();
window.baseLocalPath = FBTest.getLocalURLBase();

var chrome = window.parent.parent;

// ************************************************************************************************
// Firebug speicific APIs

/**
 * Open/close Firebug UI. If forceOpen is true, Firebug is only opened if closed.
 */
this.pressToggleFirebug = function(forceOpen)
{
    FBTrace.sysout("pressToggleFirebug");
    FBTest.progress("pressToggleFirebug");

    // Don't close if it's open and should stay open.
    if (forceOpen && this.isFirebugOpen())
        return;

    FBTest.pressKey(123); // F12
};

this.openFirebug = function()
{
    this.pressToggleFirebug(true);
}

/**
 * Returns true if Firebug is currently opened; false otherwise.
 */
this.isFirebugOpen = function()
{
    var browserDocument = FW.document;
    var fbContentBox = browserDocument.getElementById('fbContentBox');
    var collapsedFirebug = fbContentBox.getAttribute("collapsed");
    if (FBTrace.DBG_FBTEST)
        FBTrace.sysout("isFirebugOpen collapsedFirebug " + collapsedFirebug);
    return (collapsedFirebug=="true") ? false : true;
};

/**
 * Clears Firefox cache.
 */
this.clearCache = function()
{
    var cache = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService);
    cache.evictEntries(Ci.nsICache.STORE_ON_DISK);
    cache.evictEntries(Ci.nsICache.STORE_IN_MEMORY);
};

/**
 * Finishes current test and prints info message (if any) to the status bar. 
 * All test tabs are removed from the browser.
 */
this.testDone = function(message)
{
    this.cleanUpTestTabs();
    if (message)
        FBTest.progress(message);
    FBTest.testDone();
}

/**
 * xxxHonza: TBD.
 */
this.setToKnownState = function()
{
    // TODO
};

// ************************************************************************************************
// URLs

/**
 * Opens specific URL in a new tab and calls the callback as soon as the tab is ready.
 */
this.openNewTab = function(url, callback)
{
    var tabbrowser = FW.getBrowser();
    var testHandler = this;
    var newTab = tabbrowser.addTab(url);
    newTab.setAttribute("firebug", "test");
    tabbrowser.selectedTab = newTab;
    var browser = tabbrowser.getBrowserForTab(newTab);
    var onLoadURLInNewTab = function(event)
    {
        browser.removeEventListener("load", onLoadURLInNewTab, true);
        setTimeout(function() { callback(browser.contentWindow); }, 100);
    }
    browser.addEventListener("load", onLoadURLInNewTab, true);
}

/**
 * Opens specific URL in the current tab and calls the callback as soon as the tab is ready.
 */
this.openURL = function(url, callback)
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

/**
 * Refresh the current tab.
 */
this.reload = function(callback)
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

/**
 * Closes all Firefox tabs that were opened becouse of test purposes.
 */
this.cleanUpTestTabs = function()
{
    if (FBTrace.DBG_FBTest)
        FBTest.progress("clean up tabs");

    var tabbrowser = FBTest.FirebugWindow.getBrowser();
    for (var i = 0; i < tabbrowser.mTabs.length; i++)
    {
        var tab = tabbrowser.mTabs[i];

        var firebugAttr = tab.getAttribute("firebug");
        if (FBTrace.DBG_FBTest)
            FBTrace.sysout("cleanUpTestTabs on tab "+tab+" firebug: "+firebugAttr);

        if (firebugAttr == "test")
            tabbrowser.removeTab(tab);
    }
}

// ************************************************************************************************
// DOM Helpers

this.expandElements = function(panelNode, className) // className, className, ...
{
    var rows = chrome.FBL.getElementsByClass.apply(null, arguments);
    for (var i=0; i<rows.length; i++)
    {
        var row = rows[i];
        if (!chrome.FBL.hasClass(row, "opened") && !chrome.FBL.hasClass(row, "collapsed"))
            FBTest.click(row);
    }
}

// ************************************************************************************************
// Firebug Panel Enablement.

this.updateModelPermission = function(model, callback, permsission)
{
    // Open Firebug UI
    this.pressToggleFirebug(true);

    // Enable specified model.
    model.setHostPermission(FW.FirebugContext, permsission);

    // Clear cache and reload.
    this.clearCache();
    if (callback)
        this.reload(callback);
}

this.enableNetPanel = function(callback)
{
    this.updateModelPermission(FW.Firebug.NetMonitor, callback, "enable");
}

this.enableScriptPanel = function(callback)
{
    this.updateModelPermission(FW.Firebug.Debugger, callback, "enable");
}

this.enableConsolePanel = function(callback)
{
    this.updateModelPermission(FW.Firebug.Console, callback, "enable");
}

this.disableAllPanels = function()
{
    this.openFirebug(true);
    this.updateModelPermission(FW.Firebug.NetMonitor, null, "disable");
    this.updateModelPermission(FW.Firebug.Debugger, null, "disable");
    this.updateModelPermission(FW.Firebug.Console, null, "disable");
    this.clearCache();
}

// ************************************************************************************************
// Panel Navigation

// Select a location, eg a sourcefile in the Script panel, using the string the user sees
// var panel = FW.FirebugChrome.selectPanel("script");
// FBTest.Firebug.selectPanelLocationByName(panel, "foo.js");
this.selectPanelLocationByName = function(panel, name)
{
    var locations = panel.getLocationList();
    for(var i = 0; i < locations.length; i++)
    {
        var location = locations[i];
        var description = panel.getObjectDescription(location);
        if (description.name == name)
        {
            panel.navigate(location);
            return true;
        }
    }
    return false;
};

// jump to a file@line
// FBTest.Firebug.selectSourceLine(sourceFile.href, 1143, "js")
this.selectSourceLine = function(url, lineNo, category)
{
    var sourceLink = new FBTest.FirebugWindow.FBL.SourceLink(url, lineNo, category);
    FBTest.FirebugWindow.FirebugChrome.select(sourceLink);
}

// ************************************************************************************************
// Test Handlers

// var fooTest = new FBTest.Firebug.TestHandlers("TestFoo");
this.TestHandlers = function(testName)
{
    this.testName = testName;
    this.progressElement = document.getElementById("firebugTestElement");
    if (!this.progressElement)
        throw new Error("TestHanders object requires element firebugTestElement in document "+document.title);
    this.windowLocation = new String(window.location);

    FBTest.Firebug.cleanUpTestTabs();  // before we start
};

this.TestHandlers.prototype =
{
    // fooTest.add("openFirebug", onOpenFirebug);
    add: function(handlerFunction)
    {
        var eventName = handlerFunction.name;
        this.progressElement.addEventListener(eventName, handlerFunction, true);
    },
    // function onOpenFirebug(event) { ...; fooTest.fire("enablePanels"); }
    fire: function(eventName)
    {
        var event = this.progressElement.ownerDocument.createEvent("Event");
        event.initEvent(eventName, true, false); // bubbles and not cancelable
        if (window.closed)
            throw "CLOSED "+this.windowLocation;
        FBTest.progress(eventName);
        //FBTrace.sysout("fire this", this);
        //debugger;
        this.progressElement.dispatchEvent(event);
    },

    setFirebugHooks: function(url, extensionCallbacks)
    {
        var TabWatcher = FW.TabWatcher;
        var scopeName = new String(window.location.toString());
        var hookFirebug =
        {
                dispatchName: "FBTest",
                initContext: function(context)
                {
                    var uriString = context.getWindowLocation();
                    if (uriString == url)
                    {
                        FBTrace.sysout("fireOnNewPage register extensionCallbacks in "+url, extensionCallbacks);
                        if (extensionCallbacks.moduleListener) FW.Firebug.registerModule(extensionCallbacks.moduleListener);
                        if (extensionCallbacks.uiListener) FW.Firebug.registerUIListener(extensionCallbacks.uiListener);
                        if (extensionCallbacks.tabWatchListener) FW.TabWatcher.addListener(extensionCallbacks.tabWatchListener);
                    }
                    else
                        FBTrace.sysout("fireOnNewPage initContext skip "+uriString +" != "+url);
                    return null;
                },
                destroyContext: function(context)
                {
                    if (window.closed)
                        throw new Error("destroyContext called in scope of a closed window "+scopeName);
                }
        };
        FW.TabWatcher.addListener(hookFirebug);

        window.addEventListener("unload", function cleanUp(event)
        {
            if (extensionCallbacks.moduleListener) FW.Firebug.unregisterModule(extensionCallbacks.moduleListener);
            if (extensionCallbacks.uiListener) FW.Firebug.unregisterUIListener(extensionCallbacks.uiListener);
            if (extensionCallbacks.tabWatchListener) FW.TabWatcher.removeListener(extensionCallbacks.tabWatchListener);
            FW.TabWatcher.removeListener(hookFirebug);
            FBTrace.sysout("FBTestFirebug unload removing extensionCallbacks event.target.location "+event.target.location);
        }, true);
    },

    // fooTest.fireOnNewPage("openFirebug", "http://getfirebug.com");
    fireOnNewPage: function(eventName, url, extensionCallbacks)
    {
        if (extensionCallbacks)
            this.setFirebugHooks(url, extensionCallbacks);

        var tabbrowser = FW.getBrowser();

        // Add tab, then make active (https://developer.mozilla.org/en/Code_snippets/Tabbed_browser)
        var newTab = tabbrowser.addTab(url);
        newTab.setAttribute("firebug", "test");
        tabbrowser.selectedTab = newTab;
        var browser = tabbrowser.getBrowserForTab(newTab);

        var testHandler = this;
        var onLoadURLInNewTab = function(event)
        {
            var win = event.target;   // actually  tab XUL elt
            if(FBTrace.DBG_FBTest)
                FBTrace.sysout("fireOnNewPage onLoadURLInNewTab win.location: "+win.location);
            FW.getBrowser().selectedTab = win;
            //FBTrace.sysout("selectedTab ", FW.getBrowser().selectedTab);
            var selectedBrowser = tabbrowser.getBrowserForTab(tabbrowser.selectedTab);
            //FBTrace.sysout("selectedBrowser "+selectedBrowser.currentURI.spec);
            browser.removeEventListener('load', onLoadURLInNewTab, true);

            var DOMWindow = browser.contentWindow;

            if (eventName)
                testHandler.fire(eventName);
        }
        //FBTrace.sysout("fireOnNewPage "+FW, FW);

        browser.addEventListener("load", onLoadURLInNewTab, true);
    },

    // function onEnablePanels(event) {...; fooTest.done();}
    done: function()
    {
        FBTest.progress(this.testName +" done");
        FBTest.testDone();
    }
};

// ************************************************************************************************
};

// Initialization
function initializeFBTestFirebug()
{
    FBTest.Firebug = {};
    FBTestFirebug.apply(FBTest.Firebug);
    FBTestFirebug = FBTest.Firebug;
    window.removeEventListener("load", initializeFBTestFirebug, true);

    FBTrace.sysout("FBTest.Firebug; Namespace initialized", FBTest.Firebug);
}

// Make sure FBTest.Firebug namespace is initialized at the right time.
window.addEventListener("load", initializeFBTestFirebug, true);

