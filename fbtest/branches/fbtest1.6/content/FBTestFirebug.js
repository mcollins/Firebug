/* See license.txt for terms of usage */

// ************************************************************************************************
// Test APIs

/**
 * This file defines all APIs for test driver. The FBTest object is injected
 * into this scope by the Firebug test harness.
 */

// Namespace for Test APIs
(function() {

// ************************************************************************************************
// Core test APIs (direct access to FBTestApp)

/**
 * Verification method, prints result of a test. If the first <i>pass<i> parameter is true
 * the test passes, otherwise fails.
 * @param {Boolean} pass Result of a test.
 * @param {String} msg A message to be displayed as a test results under the current test
 *      within the test console.
 */
this.ok = function(pass, msg)
{
    if (!pass)
        FBTest.sysout("FBTest **** FAILS **** " + msg);
    else
        FBTest.sysout("FBTest ok " + msg);

    FBTestApp.TestRunner.appendResult(new FBTestApp.TestResult(window, pass, msg));

    if (!pass)
        this.onFailure(msg);
    else
        FBTestApp.TestRunner.setTestTimeout();

    return pass;
};

/**
 * Verification method. Compares expected and actuall string (typially from the Firebug UI).
 * If <i>actuall</i> and <i>expected<i> parameters are equal the test passes, otherwise fails.
 * @param {String} expected Expected value
 * @param {String} actual Actual value
 * @param {String} msg A message to be displayed as a test result under the current test
 *      within the test console.
 */
this.compare = function(expected, actual, msg)
{
    var result;
    if (expected instanceof RegExp)
    {
        result = actual.match(expected);
        expected = expected.toString();
    }
    else
    {
        // xxxHonza: TODO: lib/textSearch doesn't like '==='
        result = (expected == actual);
    }

    FBTest.sysout("compare "+(result?"passes":"**** FAILS ****")+" "+msg);

    FBTestApp.TestRunner.appendResult(new FBTestApp.TestResult(window,
        result, msg, expected, actual));

    if (result)
        FBTestApp.TestRunner.setTestTimeout();
    else
        FBTest.onFailure(msg);

    return result;
};

/**
 * Logs an exception under the current test within the test console.
 * @param {String} msg A message to be displayed under the current test within the test console.
 * @param {Exception} err An exception object.
 */
this.exception = function(msg, err)
{
    FBTestApp.TestRunner.appendResult(new FBTestApp.TestException(window, msg, err));
};

/**
 * Prints a message into test resutls (displayed under a test within test console).
 * @param {String} msg A message to be displayed under the current test within the test console.
 */
this.progress = function(msg)
{
    FBTestApp.TestRunner.appendResult(new FBTestApp.TestResult(window, true, "progress: "+msg));
    FBTestApp.TestSummary.setMessage(msg);
    FBTest.sysout("FBTest progress: ------------- "+msg+" -------------");
    FBTestApp.TestRunner.setTestTimeout();
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
        FBTestApp.TestRunner.testDone(false);
    });
}

/**
 * Returns URL of a directory with test cases (HTML pages with a manual test implementation)
 */
this.getHTTPURLBase = function()
{
    return FBTestApp.TestConsole.getHTTPURLBase();
};

/**
 * Returns URL of a directory with test driver files.
 */
this.getLocalURLBase = function()
{
    return FBTestApp.TestConsole.chromeToUrl(FBTestApp.TestConsole.driverBaseURI, true);
};

/**
 * Basic logging into the Firebug tracing console. All logs made through this function
 * appears only if 'TESTCASE' options is set.
 * @param {String} text A message to log.
 * @param {Object} obj An object to log.
 */
this.sysout = function(text, obj)
{
    if (FBTrace.DBG_TESTCASE)
        FBTrace.sysout(text, obj);
};

/**
 * Allow to load a script into the test driver (e.g. additional APIs for Firebug extensions).
 * @param {String} scriptURI
 * @param {Object} scope
 */
this.loadScript = function(scriptURI, scope)
{
    var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);
    return loader.loadSubScript(FBTestApp.TestConsole.driverBaseURI + scriptURI, scope);
};

// ************************************************************************************************
// APIs used by test harness (direct access to FBTestApp)

/**
 * Called by the test harness framework in case of a failing test. If <i>Fail Halt<i> option
 * is set and <i>Chromebug</i> extension installed, the debugger will halt the test execution.
 * @param {String} msg A message to be displayed under the current test within the test console.
 */
this.onFailure = function(msg)
{
    if (FBTestApp.TestConsole.haltOnFailedTest)
    {
        FBTestApp.TestRunner.clearTestTimeout();
        FBTest.sysout("Test failed, dropping into debugger "+msg);
        debugger;
    }
};

/**
 * This function is automatically called before every test sequence.
 */
this.setToKnownState = function()
{
    FBTest.sysout("FBTestFirebug setToKnownState");

    var Firebug = FBTest.FirebugWindow.Firebug;
    if (Firebug.Activation)
    {
        Firebug.Activation.toggleAll("off");
        Firebug.Activation.toggleAll("none");
        Firebug.Activation.clearAnnotations();
    }
    else
    {
        Firebug.toggleAll("off");
        Firebug.toggleAll("none");
    }

    if (Firebug.isDetached())
        Firebug.toggleDetachBar();

    Firebug.resetAllOptions(false);
    Firebug.Debugger.clearAllBreakpoints(null);
};

// ************************************************************************************************
// Manual verification (direct access to FBTestApp). These APIs should not be used in automated
// test-suites

function manualTest(verifyMsg, instructions, cleanupHandler)
{
    FBTestApp.TestRunner.manualVerify(verifyMsg, instructions, cleanupHandler);
}

this.manualVerify = function(verifyMsg, instructions)
{
    var self = this;
    manualTest(
        verifyMsg, instructions,
        function(passes)
        {
            FBTest.ok(passes, "Manual verification");
            self.closeFirebug();
            self.cleanUpTestTabs();
            FBTestApp.TestRunner.testDone(false);
        });
};

// ************************************************************************************************
// Event automation

this.click = function(node)
{
    if (!node)
        FBTrace.sysout("testConsole click node is null");

    var doc = node.ownerDocument, event = doc.createEvent("MouseEvents");
    event.initMouseEvent("click", true, true, doc.defaultView, 0, 0, 0, 0, 0,
        false, false, false, false, 0, null);
    return node.dispatchEvent(event);
};

this.dblclick = function(node)
{
    if (!node)
        FBTrace.sysout("testConsole click node is null");

    var doc = node.ownerDocument, event = doc.createEvent("MouseEvents");
    event.initMouseEvent("click", true, true, doc.defaultView, 2, 0, 0, 0, 0,
        false, false, false, false, 0, null);
    return node.dispatchEvent(event);
};

this.rightClick = function(node)
{
    if (!node)
        FBTrace.sysout("testConsole.rightClick node is null");

    var doc = node.ownerDocument, event = doc.createEvent("MouseEvents");
    event.initMouseEvent("click", true, true, doc.defaultView, 0, 0, 0, 0, 0,
        false, false, false, false, 2, null);
    return node.dispatchEvent(event);
};

this.mouseDown = function(node)
{
    var doc = node.ownerDocument, event = doc.createEvent("MouseEvents");
    event.initMouseEvent("mousedown", true, true, doc.defaultView, 0, 0, 0, 0, 0,
        false, false, false, false, 0, null);
    return node.dispatchEvent(event);
};

this.pressKey = function(keyCode, eltID)
{
    var doc = FBTest.FirebugWindow.document;
    var keyEvent = doc.createEvent("KeyboardEvent");
    keyEvent.initKeyEvent(
        "keypress",       //  in DOMString typeArg,
        true,             //  in boolean canBubbleArg,
        true,             //  in boolean cancelableArg,
        null,             //  in nsIDOMAbstractView viewArg,  Specifies UIEvent.view. This value may be null.
        false,            //  in boolean ctrlKeyArg,
        false,            //  in boolean altKeyArg,
        false,            //  in boolean shiftKeyArg,
        false,            //  in boolean metaKeyArg,
        keyCode,          //  in unsigned long keyCodeArg,
        0);               //  in unsigned long charCodeArg);

    if (eltID && eltID instanceof Node)
        doc.eltID.dispatchEvent(keyEvent)
    else if (eltID)
        doc.getElementById(eltID).dispatchEvent(keyEvent);
    else
        doc.documentElement.dispatchEvent(keyEvent);
};

this.focus = function(node)
{
    if (node.focus)
        return node.focus();

    var doc = node.ownerDocument, event = doc.createEvent("UIEvents");
    event.initUIEvent("DOMFocusIn", true, true, doc.defaultView, 1);
    return node.dispatchEvent(event);
};

// ************************************************************************************************
// Firebug UI

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
    var rows = FW.FBL.getElementsByClass.apply(null, arguments);
    for (var i=0; i<rows.length; i++)
    {
        var row = rows[i];
        if (!FW.FBL.hasClass(row, "opened") && !FW.FBL.hasClass(row, "collapsed"))
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
 * Returns document object of Main Firebug content UI (content of all panels is presented
 * in this document).
 */
this.getPanelDocument = function()
{
    var panelBar1 = FW.document.getElementById("fbPanelBar1");
    return panelBar1.browser.contentDocument;
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

window.onerror = function(errType, errURL, errLineNum)
{
    var path = window.location.pathname;
    var fileName = path.substr(path.lastIndexOf("/") + 1);
    var errorDesc = errType + " (" + errLineNum + ")" + " " + errURL;
    FBTest.sysout(fileName + " ERROR " + errorDesc);
    FBTest.ok(false, fileName + " ERROR " + errorDesc);
    FBTestFirebug.testDone();
    return false;
}


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
// Network

/**
 * Executes passed callback as soon as an expected element is displayed within the
 * specified panel. A DOM node representing the UI is passed into the callback as
 * the only parameter.
 * @param {String} panelName Name of the panel that shows the result.
 * @param {Function] callback A callback function with one parameter.
 */
this.waitForDisplayedElement = function(panelName, config, callback)
{
    if (!config)
    {
        // Default configuration for specific panels.
        config = {};
        switch (panelName)
        {
            case "net":
                config.tagName = "tr";
                config.classes = "netRow category-xhr hasHeaders loaded";
                break;

            case "console":
                config.tagName = "div";
                config.classes = "logRow logRow-spy loaded";
                break;

            default:
                FBTest.sysout("waitForDisplayedElement; ERROR Unknown panel name specified.");
                return;
        }
    }

    FW.FirebugChrome.selectPanel(panelName);

    var doc = FBTestFirebug.getPanelDocument();
    var recognizer = new MutationRecognizer(doc.defaultView, config.tagName,
        {"class": config.classes});

    var tempCallback = callback;
    if (config.counter)
    {
        tempCallback = function(element)
        {
            var panelNode = FBTestFirebug.getPanel(panelName).panelNode;
            var nodes = panelNode.getElementsByClassName(config.classes);

            if (nodes.length < config.counter)
                FBTest.waitForDisplayedElement(panelName, config, callback);
            else
                callback(element);
        }
    }

    recognizer.onRecognizeAsync(tempCallback);
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
        if (!test)
        {
            callback();
            return;
        }

        test.call(this, function() {
            if (tests.length > 0)
                FBTestFirebug.runTestSuite(tests, callback);
            else
                callback();
        });
    }, 200);
}

// ************************************************************************************************
// Task List (replaces the single runTestSuite method.

this.TaskList = function()
{
    this.tasks = [];
}

this.TaskList.prototype =
{
    push: function()
    {
        var args = FW.FBL.cloneArray(arguments);
        args = FW.FBL.arrayInsert(args, 1, [window]);
        this.tasks.push(FW.FBL.bind.apply(this, args));
    },

    run: function(callback)
    {
        FBTest.runTestSuite(this.tasks, callback);
    }
};

// ************************************************************************************************
// Screen copy

this.getImageDataFromWindow = function(win, width, height)
{
    var canvas = this.getCanvasFromWindow(win, width, height);
    return canvas.toDataURL("image/png", "");
}

this.getCanvasFromWindow = function(win, width, height)
{
    var canvas = createCanvas(width, height);
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(1, 1);
    ctx.drawWindow(win, 0, 0, width, height, "rgb(255,255,255)");
    ctx.restore();
    return canvas;
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

this.saveWindowImageToFile = function(win, width, height, destFile)
{
    var canvas = this.getCanvasFromWindow(win, width, height);

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
}).apply(FBTest);
