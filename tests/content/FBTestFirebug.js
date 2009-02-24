
// XPCOM
var Cc = Components.classes;
var Ci = Components.interfaces;


function initializeFBTestFirebug()
{
    // ****************************************************************
    // Operations on Firebug

    window.FW = FBTest.FirebugWindow;

    // Server
    window.basePath = FBTest.getHTTPURLBase();


    FBTest.Firebug = {};
    FBTest.Firebug.pressKey = function(keyCode)
    {
        var doc = FW.document;
        var keyEvent = doc.createEvent("KeyboardEvent");
        keyEvent.initKeyEvent(
                "keypress",        //  in DOMString typeArg,
                true,             //  in boolean canBubbleArg,
                true,             //  in boolean cancelableArg,
                null,             //  in nsIDOMAbstractView viewArg,  Specifies UIEvent.view. This value may be null.
                false,            //  in boolean ctrlKeyArg,
                false,            //  in boolean altKeyArg,
                false,            //  in boolean shiftKeyArg,
                false,            //  in boolean metaKeyArg,
                 keyCode,               //  in unsigned long keyCodeArg,
                 0);              //  in unsigned long charCodeArg);

        doc.documentElement.dispatchEvent(keyEvent);
    };

    FBTest.Firebug.pressToggleFirebug = function()
    {
        FBTrace.sysout("pressToggleFirebug");
        FBTest.progress("pressToggleFirebug");
        this.pressKey(123); // F12
    };

    FBTest.Firebug.isFirebugOpen = function()
    {
        var browserDocument = FW.document;
        var fbContentBox = browserDocument.getElementById('fbContentBox');
        var collapsedFirebug = fbContentBox.getAttribute("collapsed");
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("isFirebugOpen collapsedFirebug "+ collapsedFirebug);
        return (collapsedFirebug=="true") ? false : true;
    };

    FBTest.Firebug.clearCache = function()
    {
        var cache = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService);
        cache.evictEntries(Ci.nsICache.STORE_ON_DISK);
        cache.evictEntries(Ci.nsICache.STORE_IN_MEMORY);
    };

    FBTest.Firebug.setToKnownState = function()
    {
        // TODO
    };

    // *******************************************************************
    // Panels

    // Select a location, eg a sourcefile in the Script panel, using the string the user sees
    // var panel = FW.FirebugChrome.selectPanel("script");
    // FBTest.Firebug.selectPanelLocationByName(panel, "foo.js");
    FBTest.Firebug.selectPanelLocationByName = function(panel, name)
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
    FBTest.Firebug.selectSourceLine = function(url, lineNo, category)
    {
        var sourceLink = new FBTest.FirebugWindow.FBL.SourceLink(url, lineNo, category);
        FBTest.FirebugWindow.FirebugChrome.select(sourceLink);
    }

    // *******************************************************************

    // var fooTest = new FBTest.Firebug.TestHandlers("TestFoo");
    FBTest.Firebug.TestHandlers = function(testName)
    {
        this.testName = testName;
        this.progressElement = document.getElementById("firebugTestElement");
        if (!this.progressElement)
            throw new Error("TestHanders object requires element firebugTestElement in document "+document.title);
        this.windowLocation = new String(window.location);

        cleanUpTestTabs();  // before we start
    };

    FBTest.Firebug.TestHandlers.prototype =
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
    window.removeEventListener('load', initializeFBTestFirebug, true);
    FBTrace.sysout("initializeFBTestFirebug complete", FBTest);
}
window.addEventListener("load", initializeFBTestFirebug, true);
window.dump("FBTestFirebug.js\n");
//-------------------------------------------------------------------------------------------------
//Helpers

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
