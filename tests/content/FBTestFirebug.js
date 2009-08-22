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
        FW.Firebug.closeFirebug(FW.FirebugContext)
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
    var self = this;
    setTimeout(function cleanUpLater(){
        self.closeFirebug();
        self.cleanUpTestTabs();
        FBTest.sysout("testDone DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD")
        if (message)
            FBTest.progress(message);
        FBTest.testDone();
    });
}

this.manualVerify = function(verifyMsg, instructions)
{
    var self = this;
    FBTest.manualVerify(
        verifyMsg, instructions,
        function(passes)
        {
            FBTest.ok(passes, "Manual verification");
            self.closeFirebug();
            self.cleanUpTestTabs();
            FBTest.testDone();
        });
}

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
        setTimeout(function() {
            try
            {
                var win = browser.contentWindow;

                // This is a workaround for missing wrappedJSObject property,
                // if the test case comes from http (and not from chrome)
                if (!win.wrappedJSObject)
                    win.wrappedJSObject = win;
                callback(win);
            }
            catch (exc)
            {
                FBTest.sysout("runTest FAILS "+exc, exc);
                FBTest.ok(false, "runTest FAILS "+exc);
            }
        }, 100);
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
        setTimeout(function()
        {
            var win = tabbrowser.selectedBrowser.contentDocument.defaultView;

            // This is a workaround for missing wrappedJSObject property,
            // if the test case comes from http (and not from chrome)
            if (!win.wrappedJSObject)
                win.wrappedJSObject = win;
            callback(win);
        }, 10);
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
        setTimeout(function()
        {
            var win = tabbrowser.selectedBrowser.contentDocument.defaultView;

            // This is a workaround for missing wrappedJSObject property,
            // if the test case comes from http (and not from chrome)
            if (!win.wrappedJSObject)
                win.wrappedJSObject = win;
            callback(win);
        }, 10);
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

    FBTestFirebug.cleanUpListeners();

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
this.selectPanel = function(panelName, chrome)
{
    return chrome?chrome.selectPanel(panelName):FW.FirebugChrome.selectPanel(panelName);
}

/* select a panel tab */
this.selectPanelTab = function(name, doc)
{
    if (!doc)
        doc = FW.document;

    var panelTabs = doc.getElementById("fbPanelBar1-panelTabs");
    for (var child = panelTabs.firstChild; child; child = child.nextSibling)
    {
        var label = child.getAttribute("label").toLowerCase();
        FBTest.sysout("selectPanelTab trying "+label);
        var role = child.getAttribute("role");
        if (role == 'tab' && label == name)
        {
            var panelBar = panelTabs;
            while (panelBar && (panelBar.tagName != 'panelBar') )
                panelBar = panelBar.parentNode;

            panelBar.selectTab(child);
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
    var panelBar1 = FW.document.getElementById("fbPanelBar1-panelTabs");
    for (var child = panelBar1.firstChild; child; child = child.nextSibling)
    {
        var label = child.getAttribute("label").toLowerCase();
        FBTest.sysout("isPanelTabDisabled trying "+label);
        var role = child.getAttribute("role");
        if (role == 'tab' && label == name)
        {
            FBTest.sysout("isPanelTablDisabled found role tab and label "+label+" has "+child.getAttribute('aria-disabled'));
            return child.getAttribute('aria-disabled'); // "true" or "false"
        }
    }
    return null;
}


this.getPanel = function(name)
{
    return FW.FirebugContext.getPanel(name);
}

this.listenerCleanups = [];
this.cleanUpListeners = function()
{
    var c = FBTestFirebug.listenerCleanups;
    FBTest.sysout("ccccccccccccccccccccccccc cleaning listeners ccccccccccccccccccccccccccccccc");
    while(c.length)
        c.shift().call();
}

this.UntilHandler = function(eventTarget, eventName, isMyEvent, onEvent, capturing)
{
    var removed = false;
    function fn (event)
    {
        if (isMyEvent(event))
        {
            eventTarget.removeEventListener(eventName, fn, capturing);
            removed = true;
            FBTest.sysout("UntilHandler activated for event "+eventName);
            onEvent(event);
        }
        else
            FBTest.sysout("UntilHandler skipping event "+eventName, event);
    }
    eventTarget.addEventListener(eventName, fn, capturing);

    FBTestFirebug.listenerCleanups.push( function cleanUpListener()
    {
        if (!removed)
            eventTarget.removeEventListener(eventName, fn, capturing);
    });
}

this.OneShotHandler = function(eventTarget, eventName, onEvent, capturing)
{
    function isTrue(event) {return true;}
    FBTestFirebug.UntilHandler(eventTarget, eventName, isTrue, onEvent, capturing);
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

this.clickContinueButton = function(breakOnNext, chrome)
{
    // xxxHonza: why the click doesn't work? Is is because the execution context
    // is stopped at a breakpoint?
    // xxxJJB: I guess because the continue button is not active that the time of the call.
    if (!chrome)
        chrome = FW.FirebugChrome;

    var doc = chrome.window.document;
    var button = doc.getElementById("fbContinueButton");

    if (breakOnNext)
    {
        if (button.getAttribute("breakable") == "true")
        {
            FBTest.sysout("FBTestFirebug breakable true, resuming should arm break on next");
            FW.Firebug.Debugger.resume(chrome.window.FirebugContext);
            FBTest.sysout("FBTestFirebug breakable true, armed break on next");
            return true;
        }
        FBTest.sysout("FBTestFirebug clickContinueButton not armed for breakOnNext breakable:"+button.getAttribute("breakable"), button);
        return false; // not breakable
    }

    if (button.getAttribute("breakable") == "off")
    {
        FBTest.sysout("FBTestFirebug breakable off, resuming debugger in "+chrome.window.location+" for context "+chrome.window.FirebugContext);
        FW.Firebug.Debugger.resume(chrome.window.FirebugContext);
        FBTest.sysout("FBTestFirebug breakable off, resumed debugger");
        return true;
    }
    FBTest.sysout("FBTestFirebug clickContinueButton not armed for continue breakable:"+button.getAttribute("breakable"), button);
    return false; // not breakable
}

this.getSourceLineNode = function(lineNo, chrome)
{
    if (!chrome)
        chrome = FW.Firebug.chrome;
    var panel = chrome.getSelectedPanel();
    var sourceBox = panel.getSourceBoxByURL(panel.location.href);
    var sourceViewport =  FW.FBL.getChildByClass(sourceBox, 'sourceViewport');
    if (!sourceViewport)
    {
        FBTest.ok(sourceViewport, "There is a sourceViewport after scrolling");
        return false;
    }

    var rows = sourceViewport.childNodes;
    FBTest.sysout("getSourceLineNode has sourceViewport with "+rows.length+" childNodes");

    // Look for line
    var lineNumberAsString = lineNo +"";
    var row = null;
    for (var i=0; i < rows.length; i++)
    {
        var line = FW.FBL.getChildByClass(rows[i], 'sourceLine');
        if (line.textContent == lineNumberAsString) {
            row = rows[i];
            break;
        }
        else
            FBTest.sysout("tried row "+i+" "+line.textContent+"=?="+lineNumberAsString);
    }

    if (!row)
        FBTest.sysout("getSourceLineNode did not find "+lineNumberAsString);
    else
    {
        FBTest.sysout("getSourceLineNode found "+lineNumberAsString+" "+rows[i].innerHTML);
        FBTest.sysout("getSourceLineNode found "+lineNumberAsString+" "+row.innerHTML);
    }
    return row;
}

this.waitForBreakInDebugger = function(callback) // TODO replace with listenForBreakpoint below
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

this.listenForBreakpoint = function(chrome, lineNo, callback)
{
    FBTest.progress("Listen for exeline true, meaning the breakpoint hit in "+chrome.window.location);

    var panel = chrome.getSelectedPanel();
    var doc = panel.panelNode.ownerDocument; // panel.html

    var hits = {};
    function isBreakpointAttr(event)
    {
        FBTest.sysout("DOMAttrModified "+event.attrName+"="+event.newValue);
        if (event.attrName == "breakpoint" && event.newValue == "true")
            hits.breakpoint = true;
        if (event.attrName == "exeline" && event.newValue == "true")
            hits.exeline = true;
        return (hits.breakpoint && hits.exeline);
    }

    function onBreakPoint(event)
    {
        FBTest.progress("Hit BP, exeline set, check breakpoint");
        var panel = chrome.getSelectedPanel();
        FBTest.compare("script", panel.name, "The script panel should be selected");

        var row = FBTestFirebug.getSourceLineNode(lineNo, chrome);
        if (!row)
        {
            FBTest.ok(false, "Row "+ lineNo+" must be found");
            return;
        }

        var exeline = row.getAttribute("exeline");
        FBTest.compare("true", exeline, "The row must be marked as the execution line.");

        var bp = row.getAttribute('breakpoint');
        if (!FBTest.compare("true", bp, "Line "+ lineNo+" should have a breakpoint set"))
            FBTest.sysout("Failing row is "+row.parentNode.innerHTML, row)

        FBTest.progress("Remove breakpoint");
        var panel = chrome.getSelectedPanel();
        panel.toggleBreakpoint(lineNo);

        var row = FBTestFirebug.getSourceLineNode(lineNo, chrome);
        if (!FBTest.compare("false", row.getAttribute('breakpoint'), "Line "+ lineNo+" should NOT have a breakpoint set"))
            FBTest.sysout("Failing row is "+row.parentNode.innerHTML, row)

        callback();
    }

    new FBTestFirebug.UntilHandler(doc, "DOMAttrModified", isBreakpointAttr, onBreakPoint, false);

}


// ************************************************************************************************
// Error handling
/*
window.onerror = function(errType, errURL, errLineNum)
{
    var path = window.location.pathname;
    var fileName = path.substr(path.lastIndexOf("/") + 1);
    var errorDesc = errType + " (" + errLineNum + ")" + " " + errURL;
    FBTest.sysout(fileName + " ERROR " + errorDesc);
    FBTestFirebug.testDone();
    return false;
}
*/
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
this.selectSourceLine = function(url, lineNo, category, chrome)
{
    var sourceLink = new FBTest.FirebugWindow.FBL.SourceLink(url, lineNo, category);
    if (chrome)
        chrome.select(sourceLink);
    else
        FBTest.FirebugWindow.FirebugChrome.select(sourceLink);
}

//************************************************************************************************


//************************************************************************************************
// Test Handlers  XXXjjb I would like to get rid of this one

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

 /*
  * var lookForLogRow = new MutationRecognizer(panelDoc.defaultView, 'div', {class: "logRow-errorMessage"});

    lookForLogRow.onRecognize(function sawLogRow(elt)
    {
        checkConsoleLogMessage(elt, titles[ith], sources[ith]);  // deeper analysis if needed
        setTimeout(function bindArgs() { return fireTest(win, ith+1); }); // run next UI event on a new top level
    });
    // now fire a UI event
  */
var MutationRecognizer = function(win, tagName, attributes, text)
{
    this.win = win;
    this.tagName = tagName;
    this.attributes = attributes;
    this.characterData = text;
};

MutationRecognizer.prototype.getDescription = function()
{
    var obj = { tagName: this.tagName, attributes: this.attributes, characterData: this.characterData};
   return JSON.stringify(obj);
};

MutationRecognizer.prototype.onRecognize = function(handler)
{
    return new MutationEventFilter(this, handler);
}
MutationRecognizer.prototype.getWindow = function()
{
    return this.win;
}

MutationRecognizer.prototype.matches = function(elt)
{
    // Note Text nodes have no tagName
    if (this.tagName == "Text")
    {
        if (elt.data.indexOf(this.characterData) != -1)
        {
            FBTest.sysout("MutationRecognizer matches Text character data "+this.characterData);
            return true;
        }
        else
        {
            FBTest.sysout("MutationRecognizer no match in Text character data "+this.characterData+" vs "+elt.data);
            return false;
        }
    }

    if ( !(elt instanceof Element) )
    {
        FBTest.sysout("MutationRecognizer Node not an Element ", elt);
        return false;
    }

    if (elt.tagName && (elt.tagName.toLowerCase() != this.tagName) )
    {
        FBTest.sysout("MutationRecognizer no match on tagName "+this.tagName+" vs "+elt.tagName.toLowerCase(), elt);
        return false;
    }

    for (var p in this.attributes)
    {
        if (this.attributes.hasOwnProperty(p))
        {
            var eltP = elt.getAttribute(p);
            if (!eltP)
            {
                FBTest.sysout("MutationRecognizer no attribute "+p);
                return false;
            }
            if (this.attributes[p] != null)
            {
                if (p == 'class')
                {
                    if (eltP.indexOf(this.attributes[p]) < 0)
                    {
                        FBTest.sysout("MutationRecognizer no match for class "+this.attributes[p]+" vs "+eltP+" p==class: "+(p=='class')+" indexOf: "+eltP.indexOf(this.attributes[p]));
                        return false;
                    }
                }
                else if (eltP != this.attributes[p])
                {
                    FBTest.sysout("MutationRecognizer no match for attribute "+p+": "+this.attributes[p]+" vs "+eltP);
                    return false;
                }
            }
        }
    }

    if (this.characterData)
    {
        if (elt.textContent.indexOf(this.characterData) < 0)
        {
            FBTest.sysout("MutationRecognizer no match for characterData "+this.characterData+" vs "+elt.textContent);
            return false;
        }
    }
    // tagName and all attributes match
    FBTest.sysout("MutationRecognizer tagName and all attributes match");
    return true;
}

function MutationEventFilter(recognizer, handler)
{
    this.recognizer = recognizer;
    this.handler = handler;

    this.winName = new String(window.location.toString());
    var filter = this;
    this.onMutateAttr = function handleAttrMatches(event)
    {
        if (window.closed)
            throw "WINDOW CLOSED watching:: "+(filter.recognizer.win.closed?"closed":filter.recognizer.win.location)+" closed window: "+filter.winName;

        if (!recognizer.attributes)
            return; // we don't care about attribute mutation

        FBTest.sysout("onMutateAttr "+event.attrName+"=>"+event.newValue+" on "+event.target+" in "+event.target.ownerDocument.location);

        if (filter.checkElement(event.target))
            return;
    }

    // the matches() function could be tuned to each kind of mutation for improved efficiency
    this.onMutateNode = function handleNodeMatches(event)
    {
        if (window.closed)
            throw "WINDOW CLOSED watching:: "+(filter.recognizer.win.closed?"closed":filter.recognizer.win.location)+" closed window: "+filter.winName;

        FBTest.sysout("onMutateNode "+event.target+" in "+event.target.ownerDocument.location, event.target);

        if (filter.checkElementDeep(event.target))
            return;
    }

    this.onMutateText = function handleTextMatches(event)
    {
        if (window.closed)
            throw "WINDOW CLOSED watching:: "+(filter.recognizer.win.closed?"closed":filter.recognizer.win.location)+" closed window: "+filter.winName;

        if (!recognizer.characterData)
            return; // we don't care about text

        FBTest.sysout("onMutateText =>"+event.newValue+" on "+event.target.ownerDocument.location);

        if (filter.checkElement(event.target))  // target is CharacterData node
            return;
    }

    filter.checkElement = function(elt)
    {
        if (recognizer.matches(elt))
        {
            filter.unwatchWindow(recognizer.getWindow())
            handler(elt);
            return true;
        }
        return false;
    }

    filter.checkElementDeep = function(elt)
    {
        if (filter.checkElement(elt))
            return true;
        else
        {
            var child = elt.firstChild;
            for (; child; child = child.nextSibling)
            {
                if (this.checkElementDeep(child))
                    return true;
            }
        }
        return false;
    }

    filter.watchWindow(recognizer.win);
}

var filterInstance = 1;
var activeFilters = {};
MutationEventFilter.prototype.watchWindow = function(win)
{
     var doc = win.document;
     doc.addEventListener("DOMAttrModified", this.onMutateAttr, false);
     doc.addEventListener("DOMCharacterDataModified", this.onMutateText, false);
     doc.addEventListener("DOMNodeInserted", this.onMutateNode, false);
     // doc.addEventListener("DOMNodeRemoved", this.onMutateNode, false);

     var filter = this;
     filterInstance++;
     activeFilters[filterInstance] = filter;
     this.filterInstance = filterInstance;

     filter.cleanUp = function(event) {
         try
         {
             if (window.closed)
             {
                 throw new Error("Filter cleanup in window.closed event.target:"+event.target);
             }
             FBTest.sysout("Filter.cleanup "+filter.filterInstance);
             filter.unwatchWindow(win);
             document.removeEventListener("FBTestCleanup", filter.cleanUp, true);
         }
         catch (e)
         {
           FBTest.sysout("Filter.cleanup FAILS "+e, e);
         }
     }
     win.addEventListener("unload", filter.cleanUp, true);
     window.addEventListener("unload", filter.cleanUp, true);
     document.addEventListener("FBTestCleanup", filter.cleanUp, true);
     //window.FBTest.progress("added MutationWatcher to "+doc.location+" and FBTestCleanup to "+document.location);
     //window.FBTest.progress("added FBTestCleanup "+filterInstance+" to "+document.location);
}

MutationEventFilter.prototype.unwatchWindow = function(win)
{
     var doc = win.document;

     doc.removeEventListener("DOMAttrModified", this.onMutateAttr, false);
     doc.removeEventListener("DOMCharacterDataModified", this.onMutateText, false);
     doc.removeEventListener("DOMNodeInserted", this.onMutateNode, false);
     win.removeEventListener("unload", this.cleanUp, true);
     window.removeEventListener("unload", this.cleanUp, true);
     window.FBTest.sysout("unwatchWindow removed MutationWatcher "+this.filterInstance+" from "+doc.location);
     delete activeFilters[this.filterInstance];
}

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

window.addEventListener('unload', function sayUnload()
{
    FBTest.sysout(" UNLOAD "+window.location);
    for (var p in activeFilters)
    {
        FBTest.sysout(p+" still active filter ");
        activeFilters[p].cleanUp();
    }

}, true);
