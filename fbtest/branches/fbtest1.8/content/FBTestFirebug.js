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
        FBTest.resetTimeout();

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
        result = actual ? actual.match(expected) : null;
        expected = expected ? expected.toString() : null;
    }
    else
    {
        // xxxHonza: TODO: lib/textSearch doesn't like '==='
        result = (expected == actual);
    }

    FBTest.sysout("compare "+(result?"passes":"**** FAILS ****")+" "+msg, {expected: expected, actual: actual});

    FBTestApp.TestRunner.appendResult(new FBTestApp.TestResult(window,
        result, msg, expected, actual));

    if (result)
        FBTest.resetTimeout();
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
    FBTest.resetTimeout();
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
    // xxxHonza: should be set as a global in this scope.
    return FBTestApp.TestConsole.getHTTPURLBase();
};

/**
 * Returns URL of a directory with test driver files.
 */
this.getLocalURLBase = function()
{
    // xxxHonza: should be set as a global in this scope.
    return FBTestApp.TestConsole.chromeToUrl(FBTestApp.TestRunner.currentTest.driverBaseURI, true);
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
 * In some cases the test can take longer time to execute than it's expected (e.g. due to a slow
 * test server connection).
 * Instead of changing the default timeout to another (bigger) - but still fixed value, the test
 * can regularly reset the timeout.
 * This way the runner knows that the test is not frozen and is still doing something.
 */
this.resetTimeout = function()
{
    FBTestApp.TestRunner.setTestTimeout(window);
}

// ************************************************************************************************
// APIs used by test harness (direct access to FBTestApp)

/**
 * Called by the test harness framework in case of a failing test. If <i>Fail Halt<i> option
 * is set and <i>Chromebug</i> extension installed, the debugger will halt the test execution.
 * @param {String} msg A message to be displayed under the current test within the test console.
 */
this.onFailure = function(msg)
{
    FBTestApp.TestConsole.notifyObservers(this, "fbtest", "onFailure");
};

/**
 * This function is automatically called before every test sequence.
 */
this.setToKnownState = function()
{
    FBTest.sysout("FBTestFirebug setToKnownState");

    var Firebug = FBTest.FirebugWindow.Firebug;
    if (Firebug.PanelActivation)
    {
        Firebug.PanelActivation.toggleAll("off");  // These should be done with button presses not API calls.
        Firebug.PanelActivation.toggleAll("none");
    }
    else
    {
        Firebug.Activation.toggleAll("off");  // obsolete
        Firebug.Activation.toggleAll("none");
    }

    if (Firebug.Activation)
    {
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

    // Console preview is hiden by default
    if (this.isConsolePreviewVisible())
        this.clickConsolePreviewButton();
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

this.pressKey = function(keyCode, target)
{
    return __doEventDispatch(target, 0, keyCode, false);
};

/**
 * Send the char aChar to the node with id aTarget. This method handles casing
 * of chars (sends the right charcode, and sends a shift key for uppercase chars).
 * No other modifiers are handled at this point.
 *
 * For now this method only works for English letters (lower and upper case)
 * and the digits 0-9.
 *
 * Returns true if the keypress event was accepted (no calls to preventDefault
 * or anything like that), false otherwise.
 */
this.sendChar = function(aChar, aTarget)
{
    // DOM event charcodes match ASCII (JS charcodes) for a-zA-Z0-9.
    var hasShift = (aChar == aChar.toUpperCase());
    var charCode = aChar.charCodeAt(0);
    var keyCode = charCode;
    if (!hasShift)
    {
        // For lowercase letters, the keyCode is actually 32 less than the charCode
        keyCode -= 0x20;
    }

    return __doEventDispatch(aTarget, charCode, keyCode, hasShift);
}

/**
 * Send the string aStr to the node with id aTarget.
 *
 * For now this method only works for English letters (lower and upper case)
 * and the digits 0-9.
 */
this.sendString = function(aStr, aTarget)
{
    for (var i = 0; i < aStr.length; ++i)
        this.sendChar(aStr.charAt(i), aTarget);
}

/**
 * Send the non-character key aKey to the node with id aTarget.
 * The name of the key should be a lowercase
 * version of the part that comes after "DOM_VK_" in the KeyEvent constant
 * name for this key.  No modifiers are handled at this point.
 *
 * Returns true if the keypress event was accepted (no calls to preventDefault
 * or anything like that), false otherwise.
 */
this.sendKey = function(aKey, aTarget)
{
    keyName = "DOM_VK_" + aKey.toUpperCase();

    if (!KeyEvent[keyName]) {
        throw "Unknown key: " + keyName;
    }

    return __doEventDispatch(aTarget, 0, KeyEvent[keyName], false);
}

/**
 * Actually perform event dispatch given a charCode, keyCode, and boolean for
 * whether "shift" was pressed.  Send the event to the node with id aTarget.  If
 * aTarget is not provided, use "target".
 *
 * Returns true if the keypress event was accepted (no calls to preventDefault
 * or anything like that), false otherwise.
 */
function __doEventDispatch(aTarget, aCharCode, aKeyCode, aHasShift)
{
    if (aTarget && aTarget instanceof Node)
        aTarget = aTarget;
    else if (aTarget)
        aTarget = FBTest.FirebugWindow.document.getElementById(aTarget);
    else
        aTarget= FBTest.FirebugWindow.document.documentElement;

    var doc = aTarget.ownerDocument

    var event = doc.createEvent("KeyEvents");
    event.initKeyEvent("keydown", true, true, doc.defaultView,
        false, false, aHasShift, false, aKeyCode, 0);

    var accepted = aTarget.dispatchEvent(event);

    // Preventing the default keydown action also prevents the default
    // keypress action.
    event = doc.createEvent("KeyEvents");
    if (aCharCode)
    {
        event.initKeyEvent("keypress", true, true, doc.defaultView,
            false, false, aHasShift, false, 0, aCharCode);
    }
    else
    {
        event.initKeyEvent("keypress", true, true, doc.defaultView,
            false, false, aHasShift, false, aKeyCode, 0);
    }

    if (!accepted)
        event.preventDefault();

    accepted = aTarget.dispatchEvent(event);

    // Always send keyup
    var event = doc.createEvent("KeyEvents");
    event.initKeyEvent("keyup", true, true, doc.defaultView,
        false, false, aHasShift, false, aKeyCode, 0);
    aTarget.dispatchEvent(event);

    return accepted;
}

/**
 * Synthesize a key event. It is targeted at whatever would be targeted by an
 * actual keypress by the user, typically the focused element.
 *
 * aKey should be either a character or a keycode starting with VK_ such as
 * VK_ENTER. See list of all possible key-codes here:
 * http://www.w3.org/TR/2000/WD-DOM-Level-3-Events-20000901/events.html
 *
 * aEvent is an object which may contain the properties:
 *   shiftKey, ctrlKey, altKey, metaKey, accessKey, type
 *
 * If the type is specified, a key event of that type is fired. Otherwise,
 * a keydown, a keypress and then a keyup event are fired in sequence.
 *
 * aWindow is optional, and defaults to the current window object.
 */
this.synthesizeKey = function(aKey, aWindow)
{
    if (!aWindow)
        aWindow = window;

    var utils = aWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).
        getInterface(Components.interfaces.nsIDOMWindowUtils);
    if (!utils)
        return;

    var keyCode = 0, charCode = 0;
    if (aKey.indexOf("VK_") == 0)
        keyCode = KeyEvent["DOM_" + aKey];
    else
        charCode = aKey.charCodeAt(0);

    var keyDownDefaultHappened = utils.sendKeyEvent("keydown", keyCode, charCode, 0);
    utils.sendKeyEvent("keypress", keyCode, charCode, 0, !keyDownDefaultHappened);
    utils.sendKeyEvent("keyup", keyCode, charCode, 0);
}

this.focus = function(node)
{
    // If the focus() method is available apply it, but don't return.
    // Sometimes the event needs to be applied too (e.g. the command line).
    if (node.focus)
        node.focus();

    // DOMFocusIn doesn't seem to work with the command line.
    var doc = node.ownerDocument, event = doc.createEvent("UIEvents");
    event.initUIEvent("focus", true, true, doc.defaultView, 1);
    node.dispatchEvent(event);
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
 * Closes Firebug UI. if the UI is closed, it stays closed.
 */
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

// ************************************************************************************************

this.isDetached = function()
{
    return FW.Firebug.isDetached();
}

/**
 * Detach Firebug into a new separate window.
 */
this.detachFirebug = function()
{
    if (FW.Firebug.isDetached())
        return null;

    this.openFirebug();
    return FW.Firebug.detachBar(FW.Firebug.currentContext);
}

/**
 * Close detached Firebug window.
 */
this.closeDetachedFirebug = function()
{
    if (!FW.Firebug.isDetached())
        return false;

    // Better would be to look according to the window type, but it's not set in firebug.xul
    var result = FW.FBL.iterateBrowserWindows("", function(win)
    {
        if (win.location.href == "chrome://firebug/content/firebug.xul")
        {
            win.close();
            return true;
        }
    });

    return result;
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

    // Open new tab and mark as 'test' so it can be closed automatically.
    var newTab = tabbrowser.addTab(url);
    newTab.setAttribute("firebug", "test");
    tabbrowser.selectedTab = newTab;

    // Wait till the new window is loaded.
    var browser = tabbrowser.getBrowserForTab(newTab);
    waitForWindowLoad(browser, callback);

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
    var currTab = tabbrowser.selectedTab;

    // Get the current tab and wait till the new URL is loaded.
    var browser = tabbrowser.getBrowserForTab(currTab);
    waitForWindowLoad(browser, callback);

    // Reload content of the selected tab.
    tabbrowser.selectedBrowser.contentDocument.defaultView.location.href = url;

    return currTab;
}

/**
 * Refres the current tab.
 * @param {Function} callback Callback handler that is called as soon as the page is reloaded.
 */
this.reload = function(callback)
{
    var tabbrowser = FW.getBrowser();
    var currTab = tabbrowser.selectedTab;

    // Get the current tab and wait till it's reloaded.
    var browser = tabbrowser.getBrowserForTab(currTab);
    waitForWindowLoad(browser, callback);

    // Reload content of the selected tab.
    tabbrowser.selectedBrowser.contentDocument.defaultView.location.reload();

    return currTab;
}

/**
 * Helper method for wait till a window is *really* loaded.
 * @param {Object} browser Window's parent browser.
 * @param {Window} callback Executed when the window is loaded. The window is passed in
 *      as the parameter.
 */
function waitForWindowLoad(browser, callback)
{
    // If the callback isn't specified don't watch the window load at all.
    if (!callback)
        return;

    var loaded = false;
    var painted = false;

    // Wait for all event that must be fired before the window is loaded.
    // Any event is missing?
    // xxxHonza: In case of Firefox 3.7 the new 'content-document-global-created'
    // (bug549539) could be utilized.
    var waitForEvents = function(event)
    {
        if (event.type == "load")
        {
            browser.removeEventListener("load", waitForEvents, true);
            loaded = true;
        }
        else if (event.type == "MozAfterPaint")
        {
            browser.removeEventListener("MozAfterPaint", waitForEvents, true);
            painted = true;
        }

        // Execute callback after 100ms timout (the inspector tests need it for now),
        // but this shoud be set to 0.
        if (loaded && painted)
            setTimeout(executeCallback, 100);
    }

    // All expected events have been fired, execute the callback.
    var executeCallback = function()
    {
        try
        {
            var win = browser.contentWindow;

            // This is a workaround for missing wrappedJSObject property,
            // if the test case comes from http (and not from chrome)
            // xxxHonza: this is rather a hack, it should be removed if possible.
            //if (!win.wrappedJSObject)
            //    win.wrappedJSObject = win;
            FBTest.sysout("callback <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< "+win.location);
            // The window is loaded, execute the callback now.
            callback(win);
        }
        catch (exc)
        {
            FBTest.exception("waitForWindowLoad", exc);
            FBTest.sysout("runTest FAILS " + exc, exc);
        }
    }
FBTest.sysout("addinge event listeenr<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
    browser.addEventListener("load", waitForEvents, true);
    browser.addEventListener("MozAfterPaint", waitForEvents, true);
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

    if (!tabbrowser._removingTabs)
        tabbrowser._removingTabs = [];

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
// Firebug Panel Enablement.

this.setPanelState = function(model, panelName, callbackTriggersReload, enable)
{
    // Open Firebug UI
    this.pressToggleFirebug(true);

    // Enable specified panel.
    var panelType = FW.Firebug.getPanelType(panelName);
    FW.Firebug.PanelActivation.setPanelState(panelType, enable);

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
    this.setPanelState(FW.Firebug.NetMonitor, "net", callback, false);
}

/**
 * Enables the Net panel and reloads if a callback is specified.
 * @param {Function} callback A handler that is called as soon as the page is reloaded.
 */
this.enableNetPanel = function(callback)
{
    this.setPanelState(FW.Firebug.NetMonitor, "net", callback, true);
}

/**
 * Disables the Script panel and reloads if a callback is specified.
 * @param {Function} callback A handler that is called as soon as the page is reloaded.
 */
this.disableScriptPanel = function(callback)
{
    this.setPanelState(FW.Firebug.Debugger, "script", callback, false);
}

/**
 * Enables the Script panel and reloads if a callback is specified.
 * @param {Function} callback A handler that is called as soon as the page is reloaded.
 */
this.enableScriptPanel = function(callback)
{
    this.setPanelState(FW.Firebug.Debugger, "script", callback, true);
}

/**
 * Disables the Console panel and reloads if a callback is specified.
 * @param {Function} callback A handler that is called as soon as the page is reloaded.
 */
this.disableConsolePanel = function(callback)
{
    this.setPanelState(FW.Firebug.Console, "console", callback, false);
}

/**
 * Enables the Script panel and reloads if a callback is specified.
 * @param {Function} callback A handler that is called as soon as the page is reloaded.
 */
this.enableConsolePanel = function(callback)
{
    this.setPanelState(FW.Firebug.Console, "console", callback, true);
}

/**
 * Disables all activable panels.
 */
this.disableAllPanels = function()
{
    FW.FBL.$("cmd_disablePanels").doCommand();
}

/**
 * Enables all activable panels.
 */
this.enableAllPanels = function()
{
    FW.FBL.$("cmd_enablePanels").doCommand();
}

/**
 * Select specific panel in the UI.
 * @param {Object} panelName Name of the panel (e.g. <i>console</i>, <i>dom</i>, <i>script</i>,
 * <i>net</i>, <i>css</i>).
 * @param {Object} chrome Firebug chrome object.
 */
this.selectPanel = function(panelName, chrome)
{
    return chrome?chrome.selectPanel(panelName):FW.Firebug.chrome.selectPanel(panelName);
}

this.selectSidePanel = function(panelName, chrome)
{
    return chrome?chrome.selectSidePanel(panelName):FW.Firebug.chrome.selectSidePanel(panelName);
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

this.getSelectedPanelTab = function(doc)
{
    if (!doc)
        doc = FW.document;

    var panelTabs = doc.getElementById("fbPanelBar1-panelTabs");
    for (var child = panelTabs.firstChild; child; child = child.nextSibling)
    {
        if (child.getAttribute("selected") == "true")
            return child;
    }
    return null;
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

this.getSidePanelDocument = function()
{
    var panelBar1 = FW.document.getElementById("fbPanelBar2");
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
    return FW.Firebug.currentContext.getPanel(name);
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

this.executeCommand = function(expr, chrome, useCommandEditor)
{
    this.typeCommand(expr, useCommandEditor);

    if (useCommandEditor)
        FBTest.clickToolbarButton(chrome, "fbCmdLineRunButton");
    else
        FBTest.pressKey(13, "fbCommandLine");
}

this.typeCommand = function(string, useCommandEditor)
{
    var doc = FW.Firebug.chrome.window.document;
    var cmdLine = doc.getElementById(useCommandEditor ? "fbLargeCommandLine": "fbCommandLine");
    var panelBar1 = doc.getElementById("fbPanelBar1");
    var win = panelBar1.browser.contentWindow;

    if (useCommandEditor)
        FBTest.setPref("largeCommandLine", useCommandEditor);

    FW.Firebug.chrome.window.focus();
    panelBar1.browser.contentWindow.focus();
    FBTest.focus(cmdLine);

    FBTest.sysout("typing "+string+" in to "+cmdLine+" focused on "+
        FW.FBL.getElementCSSSelector(doc.commandDispatcher.focusedElement)+
        " win "+panelBar1.browser.contentWindow);

    for (var i=0; i<string.length; ++i)
        FBTest.synthesizeKey(string.charAt(i), win);
}

/**
 * Helper function for executing expression on the command line.
 * @param {Function} callback Appended by the test harness.
 * @param {String} expression Expression to be executed.
 * @param {String} expected Expected value displayed.
 * @param {String} tagName Name of the displayed element.
 * @param {String} class Class of the displayed element.
 */
this.executeCommandAndVerify = function(callback, expression, expected, tagName, classes)
{
    FBTest.clearConsole();

    var config = {tagName: tagName, classes: classes};
    FBTest.waitForDisplayedElement("console", config, function(row)
    {
        FBTest.compare(expected, row.textContent, "Verify: " +
            expression + " SHOULD BE " + expected);

        FBTest.clearConsole();

        if (callback)
            callback();
    });

    FBTest.progress("Execute expression: " + expression);
    FBTest.executeCommand(expression);
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

this.clickRerunButton = function(chrome)
{
    this.clickToolbarButton(chrome, "fbRerunButton");
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
        chrome = FW.Firebug.chrome;

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
        chrome = FW.Firebug.chrome;

    var doc = chrome.window.document;
    var button = doc.getElementById(buttonID);
    FBTest.sysout("Click toolbar button " + buttonID, button);

    // Do not use FBTest.click, toolbar buttons need to use sendMouseEvent.
    // Do not use synthesizeMouse, if the button isn't visible coordinates are wrong
    // and the click event is not fired.
    //this.synthesizeMouse(button);
    button.doCommand();
}

this.synthesizeMouse = function(node, offsetX, offsetY, event, window)
{
    window = window || node.ownerDocument.defaultView;

    var utils = window.QueryInterface(Ci.nsIInterfaceRequestor).
        getInterface(Ci.nsIDOMWindowUtils);

    if (!utils)
        return;

    offsetX = offsetX || 0;
    offsetY = offsetY || 0;
    event = event || {};

    var button = event.button || 0;
    var clickCount = event.clickCount || 1;

    var rects = node.getClientRects();

    // Return true if at least a portion of the passed rectangle is visible.
    function isVisible(rect)
    {
        return ((rect.top > 0 || rect.bottom > 0) && (rect.left > 0 || rect.right > 0));
    }

    // A <span> element can have more rectangles, let find the one that is actually
    // visible so, we can click on it.
    var rect;
    for (var i=0; i<rects.length; i++)
    {
        if (isVisible(rects[i]))
        {
            rect = rects[i];
            break;
        }
    }

    if (!rect)
    {
        FBTest.ok(false, "Can't click on an invisible element");
        return;
    }

    // Make sure that coordinates are always greater than 0. Hit the middle of the button
    // (Clicks to hidden parts of the element doesn't open the context menu).
    var left = Math.max(0, rect.left) + offsetX + 0.5*Math.max(1,rect.width);
    var top = Math.max(0, rect.top) + offsetY + 0.5*Math.max(1,rect.height);

    if (event.type)
    {
        utils.sendMouseEvent(event.type, left, top, button, clickCount, 0);
    }
    else
    {
        utils.sendMouseEvent("mousedown", left, top, button, clickCount, 0);
        utils.sendMouseEvent("mouseup", left, top, button, clickCount, 0);
    }
}

// ************************************************************************************************
// Console preview

/**
 *
 */
this.clickConsolePreviewButton = function(chrome)
{
    this.clickToolbarButton(chrome, "fbCommandPopupButton");
}

this.isConsolePreviewVisible = function()
{
    return FW.Firebug.CommandLine.Popup.isVisible();
}

// ************************************************************************************************
// Debugger

this.getSourceLineNode = function(lineNo, chrome)
{
    if (!chrome)
        chrome = FW.Firebug.chrome;

    var panel = chrome.getSelectedPanel();
    var sourceBox = panel.selectedSourceBox;
    FBTest.ok(sourceBox, "getSourceLineNode needs selectedSourceBox in panel "+panel.name);

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
    if (!chrome)
        chrome = FW.Firebug.chrome;

    FBTest.progress("waitForBreakInDebugger in chrome.window: " + chrome.window.location);

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
        var panel = chrome.getSelectedPanel();
        if (panel)
        {
            onPanelReady(sourceRow);
            return;
        }

        FBTest.progress("onRecognizeAsync; wait for panel to be selected");

        // The script panel is not yet selected so wait for the 'selectingPanel' event.
        var panelBar1 = FW.FBL.$("fbPanelBar1", chrome.window.document);
        function onSelectingPanel()
        {
            panelBar1.removeEventListener("selectingPanel", onSelectingPanel, false);
            setTimeout(function() {
                onPanelReady(sourceRow);
            }, 200);
        }
        panelBar1.addEventListener("selectingPanel", onSelectingPanel, false);
    });

    function onPanelReady(sourceRow)
    {
        try
        {
            FBTest.progress("onRecognizeAsync; check source line number, exe_line" +
                (breakpoint ? " and breakpoint" : ""));

            var panel = chrome.getSelectedPanel();
            FBTest.compare("script", panel.name, "The script panel should be selected");

            var row = FBTestFirebug.getSourceLineNode(lineNo, chrome);
            FBTest.ok(row, "Row " + lineNo + " must be found");

            var currentLineNo = parseInt(sourceRow.firstChild.textContent, 10);
            FBTest.compare(lineNo, currentLineNo, "The break must be on " + lineNo + " line.");

            callback(sourceRow);
        }
        catch (exc)
        {
            FBTest.exception("waitForBreakInDebugger", exc);
            FBTest.sysout("listenForBreakpoint callback FAILS "+exc, exc);
        }
    }

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

    var panel = FBTestFirebug.selectPanel("script");
    if (!url)
        url = panel.getObjectLocation(panel.location);

    FBTestFirebug.selectSourceLine(url, lineNo, "js", chrome, function(row)
    {
        if (row.getAttribute("breakpoint") != "true")
        {
            // Click to create a breakpoint.
            FBTest.mouseDown(row.querySelector(".sourceLine"));
            FBTest.compare(row.getAttribute("breakpoint"), "true", "Breakpoint must be set");
        }
        callback(row);
    });
}

this.removeBreakpoint = function(chrome, url, lineNo, callback)
{
    if (!chrome)
        chrome = FW.Firebug.chrome;

    var panel = FBTestFirebug.selectPanel("script");
    if (!url)
        url = panel.getObjectLocation(panel.location);

    FBTestFirebug.selectSourceLine(url, lineNo, "js", chrome, function(row)
    {
        if (row.getAttribute("breakpoint") == "true")
        {
            // Click to remove a breakpoint.
            FBTest.mouseDown(row.querySelector(".sourceLine"));
            FBTest.ok(row.getAttribute("breakpoint") != "true", "Breakpoint must be set");
        }
        callback(row);
    });
}

// ************************************************************************************************
// Watch Panel

/**
 * Appends a new expression into the Watch panel (the side panel for the Script panel).
 * @param {Object} chrome The current Firebug's chrome (can be null).
 * @param {Object} expression The expression to be evaluated.
 * @param {Object} callback Called after the result is displayed.
 */
this.addWatchExpression = function(chrome, expression, callback)
{
    if (!chrome)
        chrome = FW.Firebug.chrome;

    var watchPanel = FBTest.getPanel("watches", true);
    FBTest.ok(watchPanel, "The watch panel must be there");

    // Create new watch expression (should be done by events).
    var panelNode = watchPanel.panelNode;
    var watchNewRow = panelNode.querySelector(".watchEditBox");
    FBTest.ok(watchNewRow, "The watch edit box must be there");

    // Click to open a text editor.
    FBTest.mouseDown(watchNewRow);

    var editor = panelNode.querySelector(".fixedWidthEditor");
    FBTest.ok(editor, "The editor must be there");

    // Wait till the result is evaluated and displayed.
    var doc = FBTest.getSidePanelDocument();
    var recognizer = new MutationRecognizer(doc.defaultView, "td",
        {"class": "memberValueCell"});

    recognizer.onRecognizeAsync(function(memberValueColumn)
    {
        var td;
        if (FW.FBL.hasClass(memberValueColumn, "memberValueCell"))
            td = memberValueColumn;
        else
            td = memberValueColumn.querySelector(".memberValueCell");

        callback(td);
    });

    FBTest.focus(editor);

    // Set expression and press enter.
    FBTest.sendString(expression, editor);
    FBTest.pressKey(13, editor);
}

/**
 * Returns the row element <tr> from the 'watches' side-panel for specified expression.
 *
 * @param {Object} chrome The current Firebug's chrome (optional)
 * @param {Object} expression The expression we are looking for.
 */
this.getWatchExpressionRow = function(chrome, expression)
{
    if (!chrome)
        chrome = FW.Firebug.chrome;

    var watchPanel = FBTest.getPanel("watches", true);
    FBTest.ok(watchPanel, "The watch panel must be there");

    return getDOMMemberRow(watchPanel, expression);
}

function getDOMMemberRow(panel, name)
{
    var panelNode = panel.panelNode;
    var rows = panelNode.querySelectorAll(".memberRow");

    // Iterate over all rows and pick the one that fits the name.
    for (var i=0; i<rows.length; i++)
    {
        var row = rows[i];
        var labelCell = row.querySelector(".memberLabelCell");
        if (labelCell.textContent == name)
            return row;
    }
}

// ************************************************************************************************
// Error handling

window.onerror = function(errType, errURL, errLineNum)
{
    var path = window.location.pathname;
    var fileName = path.substr(path.lastIndexOf("/") + 1);
    var errorDesc = errType + " (" + errLineNum + ")" + " " + errURL;
    FBTest.sysout(fileName + " ERROR " + errorDesc);
    if (!FBTrace.DBG_ERRORS)  // then we are watching with another tracer, let it go
        FBTest.ok(false, fileName + " ERROR " + errorDesc);
    FBTestFirebug.testDone();
    return false;
}

// ************************************************************************************************
// Panel Navigation

/**
 * Select a location, eg a sourcefile in the Script panel, using the string the user sees.<br/><br/>
 * Example:<br/>
 * <code>var panel = FW.Firebug.chrome.selectPanel("script");<br/>
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
 * Returns current location in the current panel. For example, if the Script panel
 * is selected the return value might be: myScript.js
 */
this.getCurrentLocation = function()
{
    var locationList = FW.document.getElementById("fbLocationList");
    return locationList.label;
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
// DOM

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

    FW.Firebug.chrome.selectPanel(panelName);

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

/**
 * Wait till a text is displayed in specified panel.
 * @param {Object} panelName Name of the panel where the text should appear.
 * @param {Object} text Text to wait for.
 * @param {Object} callback Executed as soon as the text is displayed.
 */
this.waitForDisplayedText = function(panelName, text, callback)
{
    var panel = FW.Firebug.chrome.selectPanel(panelName);
    var rec = new MutationRecognizer(panel.document.defaultView, "Text", {}, text);
    rec.onRecognizeAsync(callback);
}

this.waitForPanel = function(panelName, callback)
{

    panelBar1 = FW.document.getElementById("fbPanelBar1");
    panelBar1.addEventListener("selectingPanel",function onSelectingPanel(event)
    {
        var panel = panelBar1.selectedPanel;
        if (panel.name === panelName)
        {
            panelBar1.removeEventListener("selectingPanel", onSelectingPanel, false);
            callback(panel);
        }
        else
        {
            FBTest.sysout("waitForPanel saw "+panel.name);
        }

    }, false);
}

// ************************************************************************************************
// Console panel

this.clearConsole = function(chrome)
{
    this.clickToolbarButton(chrome, "fbConsoleClear");
}

// ************************************************************************************************
// Search

/**
 * Executes search within the Script panel.
 * @param {String} searchText Keyword set into the search box.
 * @param {Function} callback Function called as soon as the result has been found.
 */
this.searchInScriptPanel = function(searchText, callback)
{
    FW.Firebug.chrome.selectPanel("script");

    var config = {tagName: "div", classes: "sourceRow jumpHighlight"};
    FBTest.waitForDisplayedElement("script", config, callback);

    // Set search string into the search box.
    var searchBox = FW.document.getElementById("fbSearchBox");
    searchBox.value = searchText;

    // Setting the 'value' property doesn't fire an 'input' event so,
    // press enter instead (asynchronously).
    FBTest.focus(searchBox);
    setTimeout(function() {
        FBTest.pressKey(13, "fbSearchBox");
    }, 0);
}

/**
 * Executes search within the HTML panel.
 * @param {String} searchText Keyword set into the search box.
 * @param {Function} callback Function called as soon as the result has been found.
 */
this.searchInHtmlPanel = function(searchText, callback)
{
    var panel = FBTest.selectPanel("html");

    // Set search string into the search box.
    var searchBox = FW.document.getElementById("fbSearchBox");
    searchBox.value = searchText;

    // The listener is automatically removed when the test window
    // is unloaded in case the seletion actually doesn't occur,
    // see FBTestSelection.js
    SelectionController.addListener(function selectionListener()
    {
        var sel = panel.document.defaultView.getSelection();
        if (sel && !sel.isCollapsed && sel.toString() == searchText)
        {
            SelectionController.removeListener(arguments.callee);
            callback(sel);
        }
    });

    FBTest.focus(searchBox);

    // Setting the 'value' property doesn't fire an 'input' event so,
    // press enter instead (asynchronously).
    setTimeout(function() {
        FBTest.pressKey(13, "fbSearchBox");
    }, 0);

    // FIX ME: characters should be sent into the search box individualy
    // (using key events) to simulate incremental search.
    setTimeout(function() {
        FBTest.pressKey(13, "fbSearchBox");
    }, 100);
}

// ********************************************************************************************* //
// HTML Panel

this.waitForHtmlMutation = function(chrome, tagName, callback)
{
    if (!chrome)
        chrome = FW.Firebug.chrome;

    var panel = FBTest.selectPanel("html");

    var doc = FBTest.getPanelDocument();
    var view = doc.defaultView;
    var attributes = {"class": "mutated"};

    // Wait for mutation event. The HTML panel will set "mutate" class on the
    // corresponding element.
    var mutated = new MutationRecognizer(view, tagName, attributes);
    mutated.onRecognizeAsync(function onMutate(node)
    {
        // Now wait till the HTML panel unhighlight the element (removes the mutate class)
        var unmutated = new MutationRecognizer(view, tagName, null, null, attributes);
        unmutated.onRecognizeAsync(function onUnMutate(node)
        {
            callback(node);
        });
    });
}

// ************************************************************************************************
// Context menu

/**
 * Opens context menu for target element and executes specified command.
 * @param {Element} target Element which context menu should be opened.
 * @param {String} menuId ID of the menu item that should be executed.
 */
this.executeContextMenuCommand = function(target, menuId, callback)
{
    var contextMenu = FW.FBL.$("fbContextMenu");

    var self = this;
    function onPopupShown(event)
    {
        contextMenu.removeEventListener("popupshown", onPopupShown, false);

        // Fire the event handler asynchronously so items have a chance to be appended.
        setTimeout(function()
        {
            var menuItem = contextMenu.querySelector("#" + menuId);
            self.ok(menuItem, "'" + menuId + "' item must be available in the context menu.");

            // If the menu item isn't available close the context menu and bail out.
            if (!menuItem)
            {
                contextMenu.hidePopup();
                return;
            }

            // Click on specified menu item.
            self.synthesizeMouse(menuItem);

            // Since the command is dispatched asynchronously,
            // execute the callback using timeout.
            setTimeout(function()
            {
                callback();
            }, 10);
        }, 10);
    }

    // Wait till the menu is displayed.
    contextMenu.addEventListener("popupshown", onPopupShown, false);

    // Right click on the target element.
    var eventDetails = {type : "contextmenu", button : 2};
    this.synthesizeMouse(target, 2, 2, eventDetails);
}

// ************************************************************************************************
// Clipboard

/**
 * Clears the current textual content in the clipboard.
 */
this.clearClipboard = function()
{
    this.setClipboardText("");
}

/**
 * Sets provided text into the clipboard
 * @param {Object} text String to the put into the clipboard.
 */
this.setClipboardText = function(text)
{
    try
    {
        var clipboard = Cc["@mozilla.org/widget/clipboard;1"].getService(Ci.nsIClipboard);
        var trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
        trans.addDataFlavor("text/unicode");

        var string = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
        string.data = text;
        trans.setTransferData("text/unicode", string, text.length + 2);

        clipboard.setData(trans, null, Ci.nsIClipboard.kGlobalClipboard);
    }
    catch (e)
    {
        FBTest.exception("setClipboardText", e);
        FBTest.sysout("setClipboardText FAILS " + e, e);
    }
}

/**
 * Returns the current textual content in the clipboard
 */
this.getClipboardText = function()
{
    try
    {
        var clipboard = Cc["@mozilla.org/widget/clipboard;1"].getService(Ci.nsIClipboard);
        var trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
        trans.addDataFlavor("text/unicode");
        clipboard.getData(trans, Ci.nsIClipboard.kGlobalClipboard);

        var str = new Object();
        var strLength = new Object();
        trans.getTransferData("text/unicode", str, strLength);
        str = str.value.QueryInterface(Ci.nsISupportsString);
        return str.data.substring(0, strLength.value / 2);
    }
    catch (e)
    {
        FBTest.exception("getClipboardText", e);
        FBTest.sysout("getClipboardText FAILS " + e, e);
    }

    return null;
}

// ************************************************************************************************
// Firefox Version

/**
 * Compare expected Firefox version with the current Firefox installed.
 * @param {Object} expectedVersion Expected version of Firefox.
 * @returns
 * -1 the current version is smaller
 *  0 the current version is the same
 *  1 the current version is bigger
 *
 *  @example:
 *  if (compareFirefoxVersion("3.6") >= 0)
 *  {
 *      // execute code for Firebug 3.6+
 *  }
 */
this.compareFirefoxVersion = function(expectedVersion)
{
    var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"].
        getService(Ci.nsIVersionComparator);
    var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
    return versionChecker.compare(appInfo.version, expectedVersion);
}

// ************************************************************************************************
// Support for asynchronous test suites (within a FBTest).

/**
 * Support for set of asynchronouse actions within a FBTest.
 * @param {Array} tests List of asynchronous functions to be executed in order.
 * @param {Function} callback A callback that is executed as soon as all fucntions
 * @param {Number} delay A delay between tasks [ms]
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
this.runTestSuite = function(tests, callback, delay)
{
    delay = delay || 200;

    setTimeout(function()
    {
        var test = tests.shift();
        if (!test)
        {
            callback();
            return;
        }

        function runNext() {
            FBTestFirebug.runTestSuite(tests, callback, delay);
        }

        try
        {
            test.call(this, runNext);
        }
        catch (err)
        {
            FBTest.exception("runTestSuite", err);
        }
    }, delay);
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

    run: function(callback, delay)
    {
        FBTest.runTestSuite(this.tasks, callback, delay);
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
    FW.Firebug.Inspector.highlightObject(elt, FW.Firebug.currentContext, "frame", null);
}

this.inspectUsingBoxModel = function(elt)
{
    FW.Firebug.Inspector.highlightObject(elt, FW.Firebug.currentContext, "boxModel", null);
}

this.inspectUsingBoxModelWithRulers = function(elt)
{
    FW.Firebug.Inspector.highlightObject(elt, FW.Firebug.currentContext, "boxModel", "content");
}

this.inspectorClear = function()
{
    FW.Firebug.Inspector.highlightObject(null);
}

// ************************************************************************************************
// DOM

/**
 * Waits till a specified property is displayed in the DOM panel.
 *
 * @param {String} propName Name of the property to be displayed
 * @param {Function} callback Function called after the property is visible.
 * @param {Boolean} checkAvailability Execute the callback synchronously if the property
 *      is already available.
 */
this.waitForDOMProperty = function(propName, callback, checkAvailability)
{
    var panel = FBTest.getPanel("dom");
    if (checkAvailability)
    {
        var row = getDOMMemberRow(panel, propName);
        if (row)
            return callback(row);
    }

    var recognizer = new MutationRecognizer(panel.document.defaultView,
        "Text", {}, propName);

    recognizer.onRecognizeAsync(function(element)
    {
        var row = FW.FBL.getAncestorByClass(element, "memberRow");

        // If the memberRow isn't there, the mutation comes from different panel (console?).
        if (!row)
            FBTest.waitForDOMProperty(propName, callback, checkAvailability);
        else
            callback(row);
    });
}

this.refreshDOMPanel = function()
{
    var panel = this.getPanel("dom");
    panel.rebuild(true);
}

/**
 * Returns the row element <tr> from the DOM panel for specified member name.
 *
 * @param {Object} chrome The current Firebug's chrome (optional)
 * @param {Object} propName The name of the member displayed in the panel.
 */
this.getDOMPropertyRow = function(chrome, propName)
{
    if (!chrome)
        chrome = FW.Firebug.chrome;

    var domPanel = FBTest.getPanel("dom", true);
    FBTest.ok(domPanel, "The DOM panel must be there");

    return getDOMMemberRow(domPanel, propName);
}

// ************************************************************************************************
}).apply(FBTest);
