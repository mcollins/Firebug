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
// Firebug specific APIs

/**
 * Open/close Firebug UI. If forceOpen is true, Firebug is only opened if closed.
 */
this.pressToggleFirebug = function(forceOpen)
{
    //FBTest.progress("pressToggleFirebug");

    // Don't close if it's open and should stay open.
    if (forceOpen && this.isFirebugOpen())
        return;

    FBTest.pressKey(123); // F12
};

this.openFirebug = function()
{
    this.pressToggleFirebug(true);
}

this.detachFirebug = function()
{
    this.openFirebug();
    return FW.Firebug.detachBar();
}

this.closeFirebug = function()
{
    if (this.isFirebugOpen())
        this.pressToggleFirebug();
}

/**
 * Returns true if Firebug is currently opened; false otherwise.
 */
this.isFirebugOpen = function()
{
    var browserDocument = FW.document;
    var fbContentBox = browserDocument.getElementById('fbContentBox');
    var collapsedFirebug = fbContentBox.getAttribute("collapsed");
    FBTest.sysout("isFirebugOpen collapsedFirebug " + collapsedFirebug);
    return (collapsedFirebug=="true") ? false : true;
};

/**
 * Clears Firefox cache.
 */
this.clearCache = function()
{
    try
    {
        var cache = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService);
        cache.evictEntries(Ci.nsICache.STORE_ON_DISK);
        cache.evictEntries(Ci.nsICache.STORE_IN_MEMORY);
    }
    catch(exc)
    {
        FBTest.sysout("clearCache FAILS "+exc, exc);
    }
};

/**
 * Finishes current test and prints info message (if any) to the status bar.
 * All test tabs are removed from the browser.
 */
this.testDone = function(message)
{
    this.closeFirebug();
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
    this.closeFirebugOnAllTabs();
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
    return newTab;
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
        FBTest.progress("FBTestFirebug reload onLoadURL fired");  // maybe we need this to slow down things?
        browser.removeEventListener("load", onLoadURL, true);
        callback(tabbrowser.selectedBrowser.contentDocument.defaultView);
    }
    browser.addEventListener("load", onLoadURL, true);

    // Reload content of the selected tab.
    FBTest.progress("FBTestFirebug Reload content of the selected tab "+tabbrowser.selectedBrowser.contentDocument.defaultView.location);
    tabbrowser.selectedBrowser.contentDocument.defaultView.location.reload();
}

/**
 * Closes all Firefox tabs that were opened because of test purposes.
 */
this.cleanUpTestTabs = function()
{
    //FBTest.progress("clean up tabs");

    var tabbrowser = FBTest.FirebugWindow.getBrowser();
    var removeThese = [];
    for (var i = 0; i < tabbrowser.mTabs.length; i++)
    {
        var tab = tabbrowser.mTabs[i];

        var firebugAttr = tab.getAttribute("firebug");

        FBTest.sysout(i+"/"+tabbrowser.mTabs.length+" cleanUpTestTabs on tab "+tab+" firebug: "+firebugAttr);

        if (firebugAttr == "test")
            removeThese.push(tab);
    }

    for (var i = 0; i < removeThese.length; i++)
            tabbrowser.removeTab(removeThese[i]);
}


/**
 * Closes Firebug on all tabs
 */
this.closeFirebugOnAllTabs = function()
{
    FBTest.progress("closeFirebugOnAllTabs");

    var tabbrowser = FBTest.FirebugWindow.getBrowser();
    for (var i = 0; i < tabbrowser.mTabs.length; i++)
    {
        var tab = tabbrowser.mTabs[i];
        FBTest.sysout("closeFirebugOnAllTabs on tab "+tab);
        tabbrowser.selectedTab = tab;
        this.closeFirebug();
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

    return rows;
}

// ************************************************************************************************
// Firebug Panel Enablement.

this.updateModelState = function(model, callbackTriggersReload, enable)
{
    // Open Firebug UI
    this.pressToggleFirebug(true);

    // Enable specified model.
    model.setDefaultState(enable);

    // Clear cache and reload.
    this.clearCache();
    if (callbackTriggersReload)
        this.reload(callbackTriggersReload);
}

this.disableNetPanel = function(callback)
{
    this.updateModelState(FW.Firebug.NetMonitor, callback, false);
}

this.enableNetPanel = function(callback)
{
    this.updateModelState(FW.Firebug.NetMonitor, callback, true);
}

this.disableScriptPanel = function(callback)
{
    this.updateModelState(FW.Firebug.Debugger, callback, false);
}

this.enableScriptPanel = function(callback)
{
    this.updateModelState(FW.Firebug.Debugger, callback, true);
}

this.disableConsolePanel = function(callback)
{
    this.updateModelState(FW.Firebug.Console, callback, false);
}

this.enableConsolePanel = function(callback)
{
    this.updateModelState(FW.Firebug.Console, callback, true);
}

this.disableAllPanels = function()
{
    FW.Firebug.ModuleManager.disableModules()
}

this.enableAllPanels = function()
{
    FW.Firebug.ModuleManager.enableModules();
}

/**
 * Select specific panel in the UI.
 */
this.selectPanel = function(panelName)
{
    return FW.FirebugChrome.selectPanel(panelName);
}

/* select a panel tab */
this.selectPanelTab = function(name)
{
    var panelBar1 = FW.document.getElementById("fbPanelBar1-panelTabs");
    for (var child = panelBar1.firstChild; child; child = child.nextSibling)
    {
        var label = child.getAttribute("label").toLowerCase();
        FBTest.sysout("selectPanelTab trying "+label);
        var role = child.getAttribute("role");
        if (role == 'tab' && label == name)
        {
            panelBar1.selectTab(child);
            return true;
        }
    }
    return false;
}

/* selected panel on UI (not via context) */
this.getSelectedPanel = function()
{
    var panelBar1 = FW.document.getElementById("fbPanelBar1");
    return panelBar1.selectedPanel; // may be null
}

this.getPanelDocument = function()
{
    var panel = this.getSelectedPanel();
    return panel.panelNode.ownerDocument; // panel.html
}

/* user sees panel tab disabled? */
this.isPanelTabDisabled = function(name)
{
    var panelBar1 = FW.document.getElementById("fbPanelBar1");
    for (var child = panelBar1.firstChild; child; child = child.nextSibling)
    {
        var label = child.getAttribute("label").toLowerCase();
        FBTest.sysout("isPanelTabDisabled trying "+label);
        var role = child.getAttribute("role");
        if (role == 'tab' && label == name)
        {
            FBTest.sysout("isPanelTablDisabled found "+child.getAttribute('aria-disabled'));
            return child.getAttribute('aria-disabled'); // "true" or "false"
        }
    }
    return null;
}

/*
this.getSelectedPanel = function()
{
    return FW.FirebugChrome.getSelectedPanel();
}
*/

this.getPanel = function(name)
{
    return FW.FirebugContext.getPanel(name);
}

// ************************************************************************************************
// Firebug preferences

this.setPref = function(pref, value)
{
    FW.Firebug.setPref(FW.Firebug.prefDomain, pref, value);
}

this.getPref = function(pref)
{
    return FW.Firebug.getPref(FW.Firebug.prefDomain, pref);
}

// ************************************************************************************************
// Debugger

this.clickContinueButton = function(breakOnNext)
{
    // xxxHonza: why the click doesn't work? Is is because the execution context
    // is stopped at a breakpoint?
    // xxxJJB: I guess because the continue button is active that the time of the call.
    var doc = FBTest.FirebugWindow.document;
    var button = doc.getElementById("fbContinueButton");

    if (breakOnNext)
    {
        if (button.getAttribute("breakable") == "true")
        {
            FBTest.sysout("FBTestFirebug breakable true, resuming should arm break on next");
            FW.Firebug.Debugger.resume(FW.FirebugContext);
            FBTest.sysout("FBTestFirebug breakable true, armed break on next");
            return true;
        }
        FBTest.sysout("FBTestFirebug clickContinueButton not armed for breakOnNext breakable:"+button.getAttribute("breakable"), button);
        return false; // not breakable
    }

    if (button.getAttribute("breakable") == "off")
    {
        FBTest.sysout("FBTestFirebug breakable off, resuming debugger");
        FW.Firebug.Debugger.resume(FW.FirebugContext);
        FBTest.sysout("FBTestFirebug breakable off, resumed debugger");
        return true;
    }
    FBTest.sysout("FBTestFirebug clickContinueButton not armed for continue breakable:"+button.getAttribute("breakable"), button);
    return false; // not breakable

}

this.getSourceLineNode = function(lineNo)
{
    var panel = FW.FirebugContext.chrome.getSelectedPanel();
    var sourceBox = panel.getSourceBoxByURL(panel.location.href);
    var sourceViewport =  FW.FBL.getChildByClass(sourceBox, 'sourceViewport');
    if (!sourceViewport)
    {
        FBTest.ok(sourceViewport, "There is a sourceViewport after scrolling");
        return false;
    }

    var rows = sourceViewport.childNodes;

    // Look for line
    var lineNoName = lineNo +"";
    var row = null;
    for (var i=0; i < rows.length; i++)
    {
        var line = FW.FBL.getChildByClass(rows[i], 'sourceLine');
        if (line.textContent == lineNoName) {
            row = rows[i];
            break;
        }
        else
            FBTest.sysout("tried row "+i+" "+line.textContent+"=?="+lineNoName);
    }
    return row;
}

this.waitForBreakInDebugger = function(callback)
{
    var panel = FBTestFirebug.getSelectedPanel();
    var doc = panel.panelNode.ownerDocument; // panel.html

    window.addEventListener("unload", function squeal()
    {
        FBTest.sysout("xoxoxoxoxoxo test driver window unloaded oxoxoxoxoxox");
    }, true);

    FBTestFirebug.handleDOMAttrModified = function(event)
    {
        if (event.attrName == "exeline" && event.newValue == "true")
        {
            window.dump("window is "+(window.closed?"closed":window.location)+ "\n");

            if (window.closed)
                return;

            doc.removeEventListener("DOMAttrModified", FBTestFirebug.handleDOMAttrModified, FBTestFirebug.handleDOMAttrModified.capturing);
            window.FBTest.progress("Hit BP, exeline set, check exeline");
            var panel = FBTestFirebug.getSelectedPanel();
            FBTest.compare("script", panel.name, "The script panel should be selected");

            callback();
        }
    }
    FBTestFirebug.handleDOMAttrModified.capturing = false;
    doc.addEventListener("DOMAttrModified", FBTestFirebug.handleDOMAttrModified, FBTestFirebug.handleDOMAttrModified.capturing);

    doc.defaultView.addEventListener("unload", function cleanUp()
    {
        window.dump("clean up "+window.location+"\n");
        doc.removeEventListener("DOMAttrModified", FBTestFirebug.handleDOMAttrModified, FBTestFirebug.handleDOMAttrModified.capturing);
    }
    , true);
}



// ************************************************************************************************
// Error handling

window.onerror = function(errType, errURL, errLineNum)
{
    var path = window.location.pathname;
    var fileName = path.substr(path.lastIndexOf("/") + 1);
    var errorDesc = errType + " (" + errLineNum + ")" + " " + errURL;
    FBTest.sysout(fileName + " ERROR " + errorDesc);
    FBTestFirebug.testDone();
    return false;
}

// ************************************************************************************************
// Panel Navigation

// Select a location, eg a sourcefile in the Script panel, using the string the user sees
// var panel = FW.FirebugChrome.selectPanel("script");
// FBTestFirebug.selectPanelLocationByName(panel, "foo.js");
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
        throw new Error("TestHandlers object requires element firebugTestElement in document "+document.title);
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
        //FBTest.sysout("fire this", this);
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
                        FBTest.sysout("fireOnNewPage register extensionCallbacks in "+url, extensionCallbacks);
                        if (extensionCallbacks.moduleListener) FW.Firebug.registerModule(extensionCallbacks.moduleListener);
                        if (extensionCallbacks.uiListener) FW.Firebug.registerUIListener(extensionCallbacks.uiListener);
                        if (extensionCallbacks.tabWatchListener) FW.TabWatcher.addListener(extensionCallbacks.tabWatchListener);
                    }
                    else
                    {
                        FBTest.sysout("fireOnNewPage initContext skip "+uriString +" != "+url);
                    }
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

            FBTest.sysout("FBTestFirebug unload removing extensionCallbacks event.target.location "+event.target.location);
        }, true);
    },

    // fooTest.fireOnNewPage("openFirebug", "http://getfirebug.com");
    fireOnNewPage: function(eventName, url, extensionCallbacks)
    {
        if (extensionCallbacks)
            this.setFirebugHooks(url, extensionCallbacks);

        var tabbrowser = FW.getBrowser();

        FBTest.sysout("fireOnNewPage adding tab for "+url);
        // Add tab, then make active (https://developer.mozilla.org/en/Code_snippets/Tabbed_browser)
        var newTab = tabbrowser.addTab(url);
        newTab.setAttribute("firebug", "test");
        FBTest.sysout("fireOnNewPage selectedTab = newTab for "+url);
        tabbrowser.selectedTab = newTab;
        var browser = tabbrowser.getBrowserForTab(newTab);
        FBTest.sysout("fireOnNewPage getBrowserForTab "+url);

        var testHandler = this;
        var onLoadURLInNewTab = function(event)
        {
            // This event come late compared with most of Firebug's work.
            var win = event.target;   // actually  tab XUL elt
            FBTest.sysout("fireOnNewPage onLoadURLInNewTab win.location: "+win.location);
            FW.getBrowser().selectedTab = win;
            //FBTest.sysout("selectedTab ", FW.getBrowser().selectedTab);
            var selectedBrowser = tabbrowser.getBrowserForTab(tabbrowser.selectedTab);
            //FBTest.sysout("selectedBrowser "+selectedBrowser.currentURI.spec);
            browser.removeEventListener('load', onLoadURLInNewTab, true);

            var DOMWindow = browser.contentWindow;

            if (eventName)
                testHandler.fire(eventName);
        }


        browser.addEventListener("load", onLoadURLInNewTab, true);
        FBTest.sysout("fireOnNewPage added load event listener to browser for "+url, browser);
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

    FBTest.sysout("FBTest.Firebug; Namespace initialized", FBTest.Firebug);
}

// Make sure FBTest.Firebug namespace is initialized at the right time.
window.addEventListener("load", initializeFBTestFirebug, true);

