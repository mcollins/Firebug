/* See license.txt for terms of usage */

// ************************************************************************************************
// Constants

// XPCOM
var Cc = Components.classes;
var Ci = Components.interfaces;

// ************************************************************************************************
// Mutation Recognizer

/*
 * var lookForLogRow = new MutationRecognizer(panelDoc.defaultView, 'div', {class: "logRow-errorMessage"});

   lookForLogRow.onRecognize(function sawLogRow(elt)
   {
       checkConsoleLogMessage(elt, titles[ith], sources[ith]);  // deeper analysis if needed
       setTimeout(function bindArgs() { return fireTest(win, ith+1); }); // run next UI event on a new top level
   });
   // now fire a UI event
 */

/**
 * @constructor This object is intended for handling HTML changes that can occur on a page.
 * This is useful e.g. in cases when a test expects specific element to be created and
 * wants to asynchronously wait for it.
 * @param {Window} win Parent window.
 * @param {String} tagName Name of the element.
 * @param {Object} attributes List of attributes that identifies the element.
 * @param {String} text Specific text that should be created. The tagName must be set to
 * <i>Text</i> in this case.
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
    var obj = {
        tagName: this.tagName,
        attributes: this.attributes,
        characterData: this.characterData
    };

    return JSON.stringify(obj);
};

/**
 * Passes a callback handler that is called when specific HTML change
 * occurs on the page.
 * @param {Function} handler Callback handler gets one parameter specifing the founded element.
 */
MutationRecognizer.prototype.onRecognize = function(handler)
{
    return new MutationEventFilter(this, handler);
}

/**
 * Passes a callback handler that is called when specific HTML change
 * occurs on the page. After the change is catched, the handler is executed yet
 * asynchronously.
 * @param {Function} handler Callback handler gets one parameter specifing the founded element.
 * @delay {Number} delay Number of milliseconds delay (10ms by default).
 */
MutationRecognizer.prototype.onRecognizeAsync = function(handler, delay)
{
    if (!delay)
        delay = 10;

    return new MutationEventFilter(this, function(element) {
        setTimeout(function() {
            FBTest.sysout("testFirebug.MutationEventFilter.onRecognizeAsync:", element);
            handler(element);
        }, delay);
    });
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
        if (elt.data && elt.data.indexOf(this.characterData) != -1)
        {
            FBTest.sysout("MutationRecognizer matches Text character data "+this.characterData);
            return true;
        }
        else
        {
            FBTest.sysout("MutationRecognizer no match in Text character data "+this.characterData+" vs "+elt.data,{element: elt, recogizer: this});
            return false;
        }
    }

    if (!(elt instanceof Element))
    {
        FBTest.sysout("MutationRecognizer Node not an Element ", elt);
        return false;
    }

    if (elt.tagName && (elt.tagName.toLowerCase() != this.tagName) )
    {
        FBTest.sysout("MutationRecognizer no match on tagName "+this.tagName+" vs "+elt.tagName.toLowerCase(), {element: elt, recogizer: this});
        return false;
    }

    for (var p in this.attributes)
    {
        if (this.attributes.hasOwnProperty(p))
        {
            var eltP = elt.getAttribute(p);
            if (!eltP)
            {
                FBTest.sysout("MutationRecognizer no attribute "+p+" in "+FW.FBL.getElementHTML(elt), {element: elt, recogizer: this});
                return false;
            }
            if (this.attributes[p] != null)
            {
                if (p == 'class')
                {
                    if (!FW.FBL.hasClass.apply(FW.FBL, [elt, this.attributes[p]]))
                    {
                        FBTest.sysout("MutationRecognizer no match for class " +
                            this.attributes[p]+" vs "+eltP+" p==class: "+(p=='class') +
                            " indexOf: "+eltP.indexOf(this.attributes[p]));
                        return false;
                    }
                }
                else if (eltP != this.attributes[p])
                {
                    FBTest.sysout("MutationRecognizer no match for attribute "+p+": "+this.attributes[p]+" vs "+eltP,{element: elt, recogizer: this});
                    return false;
                }
            }
        }
    }

    if (this.characterData)
    {
        if (elt.textContent.indexOf(this.characterData) < 0)
        {
            FBTest.sysout("MutationRecognizer no match for characterData "+this.characterData+" vs "+elt.textContent, {element: elt, recogizer: this});
            return false;
        }
    }

    // tagName and all attributes match
    FBTest.sysout("MutationRecognizer tagName and all attributes match "+elt, elt);
    return true;
}

function MutationEventFilter(recognizer, handler)
{
    this.recognizer = recognizer;

    this.winName = new String(window.location.toString());
    var filter = this;
    this.onMutateAttr = function handleAttrMatches(event)
    {
        if (window.closed)
            throw "WINDOW CLOSED watching:: "+(filter.recognizer.win.closed?"closed":filter.recognizer.win.location)+" closed window: "+filter.winName;

        if (!recognizer.attributes)
            return; // we don't care about attribute mutation

        FBTest.sysout("onMutateAttr "+event.attrName+"=>"+event.newValue+" on "+event.target+" in "+event.target.ownerDocument.location, event.target);

        // We care about some attribute mutation.
        if (!recognizer.attributes.hasOwnProperty(event.attrName))
        {
            FBTest.sysout("onMutateAttr not interested in "+event.attrName+"=>"+event.newValue+" on "+event.target+" in "+event.target.ownerDocument.location, event.target);
            return;  // but not the one that changed.
        }

        try
        {
            if (filter.checkElement(event.target))
                handler(event.target);
        }
        catch(exc)
        {
            FBTest.sysout("onMutateNode FAILS "+exc, exc);
        }
    }

    // the matches() function could be tuned to each kind of mutation for improved efficiency
    this.onMutateNode = function handleNodeMatches(event)
    {
        if (window.closed)
            throw "WINDOW CLOSED watching:: "+(filter.recognizer.win.closed?"closed":filter.recognizer.win.location)+" closed window: "+filter.winName;

        FBTest.sysout("onMutateNode "+event.target+" in "+event.target.ownerDocument.location, event.target);

        try
        {
            if (filter.checkElementDeep(event.target))
                handler(event.target);
        }
        catch(exc)
        {
            FBTest.sysout("onMutateNode FAILS "+exc, exc);
        }
    }

    this.onMutateText = function handleTextMatches(event)
    {
        if (window.closed)
            throw "WINDOW CLOSED watching:: "+(filter.recognizer.win.closed?"closed":filter.recognizer.win.location)+" closed window: "+filter.winName;

        if (!recognizer.characterData)
            return; // we don't care about text

        // We care about text and the text for this element mutated.  If it matches we must have hit.
        FBTest.sysout("onMutateText =>"+event.newValue+" on "+event.target.ownerDocument.location, event.target);

        try
        {
            if (filter.checkElement(event.target))  // target is CharacterData node
                handler(event.target);
        }
        catch(exc)
        {
            FBTest.sysout("onMutateNode FAILS "+exc, exc);
        }
    }

    filter.checkElement = function(elt)
    {
        if (recognizer.matches(elt))
        {
            filter.unwatchWindow(recognizer.getWindow())
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

// ************************************************************************************************
// Mutation Event Filter

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

    filter.cleanUp = function(event)
    {
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
 * @param {Boolean} forceOpen Set to true if Firebug should stay opened. 
 */
this.pressToggleFirebug = function(forceOpen)
{
    // Don't close if it's open and should stay open.
    if (forceOpen && this.isFirebugOpen())
        return;

    FBTest.pressKey(123); // F12
};

/**
 * Open Firebug UI. If it's already opened, it stays opened.
 */
this.openFirebug = function()
{
    this.pressToggleFirebug(true);
}

/**
 * Detach Firebug into a new separate window. 
 */
this.detachFirebug = function()
{
    this.openFirebug();
    return FW.Firebug.detachBar();
}

/**
 * Closes Firebug UI. if the UI is closed, it stays closed.
 */
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
 * @param {String} url URL to be opened in the new tab.
 * @param {Function} callback Callback handler that is called as soon as the page is loaded. 
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
        setTimeout(function()
        {
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

    if (callback)
        browser.addEventListener("load", onLoadURLInNewTab, true);

    return newTab;
}

/**
 * Opens specific URL in the current tab and calls the callback as soon as the tab is ready.
 * @param {String} url URL to be opened.
 * @param {Function} callback Callback handler that is called as soon as the page is loaded.
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
            var win = browser.contentWindow;

            // This is a workaround for missing wrappedJSObject property,
            // if the test case comes from http (and not from chrome)
            if (!win.wrappedJSObject)
                win.wrappedJSObject = win;
            callback(win);
        }, 10);
    }

    if (callback)
        browser.addEventListener("load", onLoadURL, true);

    // Reload content of the selected tab.
    tabbrowser.selectedBrowser.contentDocument.defaultView.location.href = url;
}

/**
 * Refres the current tab.
 * @param {Function} callback Callback handler that is called as soon as the page is reloaded.
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
            var win = browser.contentWindow;

            // This is a workaround for missing wrappedJSObject property,
            // if the test case comes from http (and not from chrome)
            if (!win.wrappedJSObject)
                win.wrappedJSObject = win;

            callback(win);
        }, 10);
    }

    if (callback)
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

/**
 * Disables the Net panel and reloads if a callback is specified.
 * @param {Function} callback A handler that is called as soon as the page is reloaded.
 */
this.disableNetPanel = function(callback)
{
    this.updateModelState(FW.Firebug.NetMonitor, callback, false);
}

/**
 * Enables the Net panel and reloads if a callback is specified.
 * @param {Function} callback A handler that is called as soon as the page is reloaded.
 */
this.enableNetPanel = function(callback)
{
    this.updateModelState(FW.Firebug.NetMonitor, callback, true);
}

/**
 * Disables the Script panel and reloads if a callback is specified.
 * @param {Function} callback A handler that is called as soon as the page is reloaded.
 */
this.disableScriptPanel = function(callback)
{
    this.updateModelState(FW.Firebug.Debugger, callback, false);
}

/**
 * Enables the Script panel and reloads if a callback is specified.
 * @param {Function} callback A handler that is called as soon as the page is reloaded.
 */
this.enableScriptPanel = function(callback)
{
    this.updateModelState(FW.Firebug.Debugger, callback, true);
}

/**
 * Disables the Console panel and reloads if a callback is specified.
 * @param {Function} callback A handler that is called as soon as the page is reloaded.
 */
this.disableConsolePanel = function(callback)
{
    this.updateModelState(FW.Firebug.Console, callback, false);
}

/**
 * Enables the Script panel and reloads if a callback is specified.
 * @param {Function} callback A handler that is called as soon as the page is reloaded.
 */
this.enableConsolePanel = function(callback)
{
    this.updateModelState(FW.Firebug.Console, callback, true);
}

/**
 * Disables all activable panels.
 */
this.disableAllPanels = function()
{
    FW.Firebug.ModuleManager.disableModules()
}

/**
 * Enables all activable panels.
 */
this.enableAllPanels = function()
{
    FW.Firebug.ModuleManager.enableModules();
}

/**
 * Select specific panel in the UI.
 * @param {Object} panelName Name of the panel (e.g. <i>console</i>, <i>dom</i>, <i>script</i>,
 * <i>net</i>, <i>css</i>).
 * @param {Object} chrome Firebug chrome object.
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

/**
 * Returns document object of Firebug content UI (content of all panels is presented
 * in this document).
 */
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

/**
 * Returns panel object that represents a specified panel. In order to get root element of
 * panels's content use <i>panel.panelNode</i>, where <i>panel</i> is the returned value. 
 * @param {Object} name Name of the panel to be returned (e.g. <i>net</i>).
 */
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

/**
 * Sets Firebug preference.
 * @param {Object} pref Name of the preference without <i>extensions.firebug</i> prefix.
 * For instance: <i>activateSameOrigin</i>. Always use this method for seting a preference.
 * Notice that FBTest automatically resets all preferences before every single test is executed.
 * @param {Object} value New value of the preference.
 */
this.setPref = function(pref, value)
{
    FW.Firebug.setPref(FW.Firebug.prefDomain, pref, value);
}

/**
 * Returns value of specified Firebug preference.
 * @param {Object} pref Name of the preference without <i>extensions.firebug</i> prefix.
 * For instance: <i>showXMLHttpRequests</i>. Notice that FBTest automatically resets all
 * preferences before every single test is executed.
 */
this.getPref = function(pref)
{
    return FW.Firebug.getPref(FW.Firebug.prefDomain, pref);
}

// ************************************************************************************************
// Command Line

this.executeCommand = function(expr, chrome)
{
    if (!chrome)
        chrome = FW.FirebugChrome;

    var doc = chrome.window.document;
    var cmdLine = doc.getElementById("fbCommandLine");

    // Make sure the console is focused and command line API loaded. 
    FBTest.focus(cmdLine);

    // Set expression and press enter.
    cmdLine.value = expr;
    FBTest.pressKey(13, "fbCommandLine");
}

// ************************************************************************************************
// Toolbar buttons

/**
 * Simulates click on the Continue button that is available in the Script panel when
 * Firebug is halted in the debugger. This action resumes the debugger (of course, the debugger
 * can stop at another breakpoint).
 * @param {Object} chrome Firebug.chrome object.
 */
this.clickContinueButton = function(chrome)
{
    this.clickToolbarButton(chrome, "fbContinueButton");
}

/**
 * Simulates click on the Break On Next button that is available in main Firebug toolbar.
 * The specific action (e.g. break on next XHR or break on next HTML mutation) depends
 * on the current panel.
 * @param {Object} chrome Firebug.chrome object.
 */
this.clickBreakOnNextButton = function(chrome)
{
    if (!chrome)
        chrome = FW.FirebugChrome;

    var doc = chrome.window.document;
    var button = doc.getElementById("fbBreakOnNextButton");
    var breakable = button.getAttribute("breakable");

    if (breakable == "true")
        FBTest.sysout("FBTestFirebug breakable true, click should arm break on next");
    else if (breakable == "false")
        FBTest.sysout("FBTestFirebug breakable false, click should disarm break on next");
    else
        FBTest.sysout("FBTestFirebug breakOnNext breakable:"+breakable, button);

    // Do not use FBTest.click, toolbar buttons need to use sendMouseEvent.
    this.synthesizeMouse(button);
}

/**
 * Simulates click on the Persist button that is available in the Script and Net panels.
 * Having this button pressed causes persistence of the appropriate panel content across reloads.
 * @param {Object} chrome Firebug.chrome object.
 */
this.clickPersistButton = function(chrome)
{
    this.clickToolbarButton(chrome, "fbConsolePersist");
}

this.clickToolbarButton = function(chrome, buttonID)
{
    if (!chrome)
        chrome = FW.FirebugChrome;

    var doc = chrome.window.document;
    var button = doc.getElementById(buttonID);
    FBTest.sysout("Click toolbar button " + buttonID, button);

    // Do not use FBTest.click, toolbar buttons need to use sendMouseEvent.
    // Do not use synthesizeMouse, if the button isn't visible coordinates are wrong
    // and the click event is not fired.
    //this.synthesizeMouse(button);
    button.doCommand();
}

this.synthesizeMouse = function(node)
{
    var doc = node.ownerDocument;
    var utils = doc.defaultView.QueryInterface(Ci.nsIInterfaceRequestor).
        getInterface(Ci.nsIDOMWindowUtils);

    if (utils)
    {
        var rect = node.getBoundingClientRect();
        utils.sendMouseEvent("mousedown", rect.left, rect.top, 0, 1, 0);
        utils.sendMouseEvent("mouseup", rect.left, rect.top, 0, 1, 0);
    }
}

// ************************************************************************************************
// Debugger

this.getSourceLineNode = function(lineNo, chrome)
{
    if (!chrome)
        chrome = FW.Firebug.chrome;

    var panel = chrome.getSelectedPanel();
    var sourceBox = panel.selectedSourceBox;
    if (!sourceBox)
        throw new Error("getSourceLineNode no selectedSourceBox in panel "+panel.name);

    var sourceViewport =  FW.FBL.getChildByClass(sourceBox, 'sourceViewport');
    if (!sourceViewport)
    {
        FBTest.ok(sourceViewport, "There is a sourceViewport after scrolling");
        return false;
    }

    var rows = sourceViewport.childNodes;
    FBTest.sysout("getSourceLineNode has sourceViewport with "+rows.length+" childNodes");

    // Look for line
    var row = null;
    for (var i=0; i < rows.length; i++)
    {
        var line = FW.FBL.getChildByClass(rows[i], 'sourceLine');
        if (parseInt(line.textContent, 10) == lineNo) {
            row = rows[i];
            break;
        }
        else
            FBTest.sysout("tried row "+i+" "+line.textContent+"=?="+lineNo);
    }

    if (!row)
        FBTest.sysout("getSourceLineNode did not find "+lineNo);
    else
    {
        FBTest.sysout("getSourceLineNode found "+lineNo+" "+rows[i].innerHTML);
        FBTest.sysout("getSourceLineNode found "+lineNo+" "+row.innerHTML);
    }
    return row;
}

/**
 * Registers handler for break in Debugger. The handler is called as soon as Firebug
 * breaks the JS execution on a breakpoint or due a <i>Break On Next<i> active feature.
 * @param {Object} chrome Current Firebug's chrome object (e.g. FW.Firebug.chrome)
 * @param {Number} lineNo Expected source line number where the break should happen.
 * @param {Object} breakpoint Set to true if breakpoint should be displayed in the UI.
 * @param {Object} callback Handeler that should be called when break happens.
 */
this.waitForBreakInDebugger = function(chrome, lineNo, breakpoint, callback)
{
    FBTest.progress("fbTestFirebug.waitForBreakInDebugger in chrome.window" + chrome.window.location);

    // Get document of Firebug's panel.html
    var panel = chrome.getSelectedPanel();
    var doc = panel.panelNode.ownerDocument;

    // Complete attributes that must be set on sourceRow element.
    var attributes = {"class": "sourceRow", exe_line: "true"};
    if (breakpoint)
        attributes.breakpoint = breakpoint ? "true" : "false";

    // Wait for the UI modification that shows the source line where break happened.
    var lookBP = new MutationRecognizer(doc.defaultView, "div", attributes);
    lookBP.onRecognizeAsync(function onBreak(sourceRow)
    {
        FBTest.progress("FBTestFirebug.waitForBreakdInDebugger.onRecognize; check source line number, exe_line" +
            (breakpoint ? " and breakpoint" : ""));

        var panel = chrome.getSelectedPanel();
        FBTest.compare("script", panel.name, "The script panel should be selected");

        var row = FBTestFirebug.getSourceLineNode(lineNo, chrome);
        FBTest.ok(row, "Row " + lineNo + " must be found");

        var currentLineNo = parseInt(sourceRow.firstChild.textContent, 10);
        FBTest.compare(lineNo, currentLineNo, "The break must be on " + lineNo + " line.");

        try
        {
            callback(sourceRow);
        }
        catch(exc)
        {
            FBTest.sysout("listenForBreakpoint callback FAILS "+exc, exc);
        }
    });

    FBTest.sysout("fbTestFirebug.waitForBreakInDebugger recognizing ", lookBP);
}

/**
 * Set a breakpoint
 * @param {Object} chrome Firebug chrome object. If null, the default is used.
 * @param {Object} url URL of the target file. If null, the current file is used.
 * @param {Object} lineNo Source line number.
 * @param {Object} callback Asynchronous callback is called as soon as the breakpoint is set.
 */
this.setBreakpoint = function(chrome, url, lineNo, callback)
{
    if (!chrome)
        chrome = FW.Firebug.chrome;

    var panel = FBTestFirebug.getPanel("script");
    if (!url)
        url = panel.location.href;

    FBTestFirebug.selectSourceLine(url, lineNo, "js", chrome, function(row)
    {
        if (row.getAttribute("breakpoint") != "true")
            panel.toggleBreakpoint(lineNo);
        callback(row);
    });
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

/**
 * Select a location, eg a sourcefile in the Script panel, using the string the user sees.<br/><br/>
 * Example:<br/>
 * <code>var panel = FW.FirebugChrome.selectPanel("script");<br/>
 * FBTestFirebug.selectPanelLocationByName(panel, "foo.js");<code>
 */
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

/**
 * Jump to a file@line.<br/><br/>
 * Example:<br/>
 * <code>FBTest.Firebug.selectSourceLine(sourceFile.href, 1143, "js")</code>
 */ 
this.selectSourceLine = function(url, lineNo, category, chrome, callback)
{
    var sourceLink = new FBTest.FirebugWindow.FBL.SourceLink(url, lineNo, category);
    if (chrome)
        chrome.select(sourceLink);
    else
        FBTest.FirebugWindow.FirebugChrome.select(sourceLink);

    if (!callback)
        return;

    var tries = 5;
    var checking = setInterval(function checkScrolling()
    {
        var row = FBTestFirebug.getSourceLineNode(lineNo, chrome);
        if (!row && --tries)
            return;

        clearInterval(checking);
        callback(row);
    }, 50);
}

// ************************************************************************************************
// Support for asynchronous test suites (within a FBTest).

/**
 * Support for set of asynchronouse actions within a FBTest.
 * @param {Array} tests List of asynchronous functions to be executed in order.
 * @param {Function} callback A callback that is executed as soon as all fucntions
 * in the list are finished.<br/><br/>
 * Example:<br/>
 *  <pre>// A suite of asynchronous tests.
 *  var testSuite = [];
 *  testSuite.push(function(callback) {
 *      // TODO: test implementation
 *      // Continue with other tests.
 *      callback();
 *  });
 *  testSuite.push(function(callback) {
 *      // TODO: test implementation
 *      // Continue with other tests.
 *      callback();
 *  });
 *  // Run entire suite.
 *  runTestSuite(testSuite, function() {
 *      FBTestFirebug.testDone("DONE");
 *  });</pre>
 */
this.runTestSuite = function(tests, callback)
{
    setTimeout(function()
    {
        var test = tests.shift();
        test.call(this, function() {
            if (tests.length > 0)
                FBTestFirebug.runTestSuite(tests, callback);
            else
                callback();
        });
    }, 200);
}

// ************************************************************************************************
// Screen copy

this.getImageDataFromWindow = function(win, width, height)
{
    var canvas = createCanvas(width, height);
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(1, 1);
    ctx.drawWindow(win, 0, 0, width, height, "rgb(255,255,255)");
    ctx.restore();
    return canvas.toDataURL("image/png", "");
}

this.loadImageData = function(url, callback)
{
    var image = new Image();
    image.onload = function()
    {
        var width = image.width;
        var height = image.height;

        var canvas = createCanvas(image.width, image.height);
        var ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);
        callback(canvas.toDataURL("image/png", ""));
    }

    image.src = url;
    return image;
}

this.saveCanvas = function(canvas, destFile)
{
    // convert string filepath to an nsIFile
    var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    file.initWithPath(destFile);

    // create a data url from the canvas and then create URIs of the source and targets
    var io = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    var source = io.newURI(canvas.toDataURL("image/png", ""), "UTF8", null);
    var target = io.newFileURI(file);

    // prepare to save the canvas data
    var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Ci.nsIWebBrowserPersist);

    persist.persistFlags = Ci.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
    persist.persistFlags |= Ci.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

    // displays a download dialog (remove these 3 lines for silent download)
    var xfer = Cc["@mozilla.org/transfer;1"].createInstance(Ci.nsITransfer);
    xfer.init(source, target, "", null, null, null, persist);
    persist.progressListener = xfer;

    // save the canvas data to the file
    persist.saveURI(source, null, null, null, null, file);
}

function createCanvas(width, height)
{
     var canvas = document.createElement("canvas");
     canvas.style.width = width + "px";
     canvas.style.height = height + "px";
     canvas.width = width;
     canvas.height = height;
     return canvas;
}

// ************************************************************************************************
// Inspector

this.inspectUsingFrame = function(elt)
{
    FW.Firebug.Inspector.highlightObject(elt, FW.FirebugContext, "frame", null);
}

this.inspectUsingBoxModel = function(elt)
{
    FW.Firebug.Inspector.highlightObject(elt, FW.FirebugContext, "boxModel", null);
}

this.inspectUsingBoxModelWithRulers = function(elt)
{
    FW.Firebug.Inspector.highlightObject(elt, FW.FirebugContext, "boxModel", "content");
}

this.inspectorClear = function()
{
    FW.Firebug.Inspector.highlightObject(null);
}

// ************************************************************************************************
};

// ************************************************************************************************
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
window.addEventListener("DOMContentLoaded", initializeFBTestFirebug, true);

FBTest.sysout("FBTest.Firebug; load event handler set");

window.addEventListener('unload', function sayUnload()
{
    FBTest.sysout(" UNLOAD "+window.location);
    for (var p in activeFilters)
    {
        FBTest.sysout(p+" still active filter ");
        activeFilters[p].cleanUp();
    }

}, true);
