/* See license.txt for terms of usage */

FBTestApp.ns(function() { with (FBL) {

// ************************************************************************************************
// Test Console Implementation

var Cc = Components.classes;
var Ci = Components.interfaces;

// Services
var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);
var filePicker = Cc["@mozilla.org/filepicker;1"].getService(Ci.nsIFilePicker);
var cmdLineHandler = Cc["@mozilla.org/commandlinehandler/general-startup;1?type=FBTest"].getService(Ci.nsICommandLineHandler);
var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

// Interfaces
var nsIFilePicker = Ci.nsIFilePicker;

// Global variables
var gFindBar;

// ************************************************************************************************

/**
 * This object represents main Test Console implementation.
 */
FBTestApp.TestConsole =
{
    // These are set when a testList.html is loaded.
    testListPath: null, // full path to the test list, eg a URL for the testList.html
    baseURI: null,  // base for test drivers, must be a secure location, chrome or https
    testCasePath: null,  // base for testcase pages. These are normal web pages

    groups: null,

    initialize: function()
    {
        try
        {
            this.initializeTracing();

            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.TestConsole.initializing");

            // Localize strings in XUL (using string bundle).
            this.internationalizeUI();

            this.haltOnFailedTest = Firebug.getPref(FBTestApp.prefDomain, "haltOnFailedTest");
            this.setHaltOnFailedTestButton();

            this.notifyObservers(this, "fbtest", "initialize");

            // Load all tests from the default test list file (testList.html).
            // The file usually defines two variables:
            // testList: array with individual test objects.
            // baseURI: base directory for the test server (http://localhost:7080)
            //          if this variable isn't specified, the parent directory of the
            //          test list file is used.
            this.loadTestList(this.getDefaultTestList(), this.getDefaultTestCasePath());

            $("testCaseUrlBar").testURL = this.testCasePath;

            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.TestConsole.initialized");

            gFindBar = $("FindToolbar");
        }
        catch (e)
        {
            if (FBTrace.DBG_FBTEST || FBTrace.DBG_ERRORS)
                FBTrace.sysout("fbtest.TestConsole.initialize FAILS "+e, e);

            alert("There may be a useful message on the Error Console: "+e);
        }
    },

    getDefaultTestList: function()
    {
        // 1) The default test list (suite) can be specified on the command line.
        var defaultTestList = FBTestApp.defaultTestList;

        // 2) The list from the last time (stored in preferences) can be also used.
        if (!defaultTestList)
            defaultTestList = Firebug.getPref(FBTestApp.prefDomain, "defaultTestSuite");

        // 3) If no list is specified, use the default from currently installed Firebug.
        if (!defaultTestList)
            defaultTestList = "chrome://firebug/content/testList.html";

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.TestConsole.getDefaultTestList; " + defaultTestList);

        return defaultTestList;
    },

    getDefaultTestCasePath: function()
    {
        // 1) The default test list (suite) can be specified on the command line.
        var defaultTestCaseServer = FBTestApp.defaultTestCaseServer;

        // 2) The list from the last time (stored in preferences) can be also used.
        if (!defaultTestCaseServer)
            defaultTestCaseServer = Firebug.getPref(FBTestApp.prefDomain, "defaultTestCaseServer");

        // 3) If no list is specified, use the default from getfirebug
        if (!defaultTestCaseServer)
            defaultTestCaseServer = "http://getfirebug.com/tests/content/";

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.TestConsole.getDefaultTestCasePath; " + defaultTestCaseServer);

        return defaultTestCaseServer;
    },

    getHTTPURLBase: function()
    {
        var url = this.testCasePath;

        // Make sure the path ends properly.
        if (url && url.charAt(url.length-1) != "/")
            url += "/";

        return url;
    },

    internationalizeUI: function()
    {
        var buttons = ["runAll", "stopTest", "haltOnFailedTest", "refreshList",
            "menu_showTestCaseURLBar", "menu_showTestDriverURLBar", "menu_showTestListURLBar",
            "testListUrlBar", "testCaseUrlBar", "testDriverUrlBar"];

        for (var i=0; i<buttons.length; i++)
        {
            var element = $(buttons[i]);
            FBL.internationalize(element, "label");
            FBL.internationalize(element, "tooltiptext");
            FBL.internationalize(element, "pickerTooltiptext");
            FBL.internationalize(element, "barTooltiptext");
        }
    },

    initializeTracing: function()
    {
        // TraceModule isn't part of Firebug end-user version.
        if (Firebug.TraceModule)
            Firebug.TraceModule.addListener(this.TraceListener);

        // The tracing console can be already opened so, simulate onLoadConsole event.
        var self = this;
        iterateBrowserWindows("FBTraceConsole", function(win)
        {
            if (win.TraceConsole.prefDomain == "extensions.firebug")
            {
                self.TraceListener.onLoadConsole(win, null);
                return true;
            }
        });
    },

    shutdown: function()
    {
        this.notifyObservers(this, "fbtest", "shutdown");

        Firebug.setPref(FBTestApp.prefDomain, "defaultTestSuite", this.testListPath);
        Firebug.setPref(FBTestApp.prefDomain, "defaultTestCaseServer", this.testCasePath);

        if (Firebug.TraceModule)
            Firebug.TraceModule.removeListener(this.TraceListener);

        // Unregister registered repositories.
        Firebug.unregisterRep(FBTestApp.GroupList);
        Firebug.unregisterRep(FBTestApp.TestList);
        Firebug.unregisterRep(FBTestApp.TestResultRep);

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.TestConsole.shutdown;");
    },

    updatePaths: function()
    {
        this.testListPath = $("testListUrlBar").testURL;
        this.testCasePath = $("testCaseUrlBar").testURL;
        this.testDriverPath = $("testDriverUrlBar").testURL;
    },

    updateURLBars: function()
    {
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.updateURLBars; " + this.testListPath + ", " +
                this.testCasePath + ", " + this.baseURI);

        // Update test list URL box.
        var urlBar = $("testListUrlBar");
        urlBar.testURL = this.testListPath;

        // Update test source URL box.
        urlBar = $("testCaseUrlBar");
        urlBar.testURL = this.testCasePath;

        // Update test driver URL box.
        urlBar = $("testDriverUrlBar");
        urlBar.testURL = this.baseURI;
    },

    setAndLoadTestList: function()
    {
        this.updatePaths();

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.setAndLoadTestList; " + this.testListPath + ", " +
                this.testCasePath + ", " + this.baseURI);

        // Append the test-case server into the history immediately. If the test list is
        // already loaded it wouldn't be done at the "successful load" moment.
        this.appendToHistory("", this.testCasePath);

        // xxxHonza: this is a workaround, the test-case server isn't stored into the
        // preferences in shutdown when the Firefox is restared by "Restart Firefox"
        // button in the FBTrace console.
        Firebug.setPref(FBTestApp.prefDomain, "defaultTestCaseServer", this.testCasePath);

        this.loadTestList(this.testListPath, this.testCasePath);

        FBTestApp.TestSummary.clear();
    },

    resetHistoryList: function(urlBar)
    {
        var type = urlBar.getAttribute("autocompletesearch");
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.resetHistoryList; " + type);

        if (type == "FBTestHistory")
            Firebug.clearPref(FBTestApp.prefDomain, "history");
        else if (type == "FBTestCaseHistory")
            Firebug.clearPref(FBTestApp.prefDomain, "testCaseHistory");
        else if (type == "FBTestDriverHistory")
            Firebug.clearPref(FBTestApp.prefDomain, "testDriverHistory");
    },

    loadTestList: function(testListPath, testCasePath)
    {
        this.testListPath = testListPath;
        if (testCasePath)
            this.testCasePath = testCasePath;

        var self = this;
        var consoleFrame = $("consoleFrame");
        var onTestFrameLoaded = function(event)
        {
            consoleFrame.removeEventListener("load", onTestFrameLoaded, true);

            var doc = event.target;

            // Some CSS from Firebug namespace.
            addStyleSheet(doc, createStyleSheet(doc, "chrome://Firebug/skin/dom.css"));
            addStyleSheet(doc, createStyleSheet(doc, "chrome://Firebug/skin/dom.css"));
            addStyleSheet(doc, createStyleSheet(doc, "chrome://firebug-os/skin/panel.css"));
            addStyleSheet(doc, createStyleSheet(doc, "chrome://Firebug/skin/console.css"));

            // Append specific FBTest CSS.
            var styles = ["testConsole.css", "testList.css", "testResult.css", "tabView.css"];
            for (var i=0; i<styles.length; i++)
                addStyleSheet(doc, createStyleSheet(doc, "chrome://fbtest/skin/" + styles[i]));

            var win = doc.defaultView.wrappedJSObject;
            if (!win.testList)
            {
                if (FBTrace.DBG_FBTEST || FBTrace.DBG_ERRORS)
                    FBTrace.sysout("fbtest.refreshTestList; ERROR testList is missing in: " +
                        testListPath, win);
            }
            else
            {
                if (win.baseURI)
                {
                    self.baseURI = win.baseURI;
                }
                else
                {
                    // If the baseURI isn't provided use the directory where testList.html
                    // file is located.
                    self.baseURI = testListPath.substr(0, testListPath.lastIndexOf("/") + 1);
                }

                if (win.serverURI)
                    self.testCasePath = win.serverURI;
                else
                    self.testCasePath = "http://getfirebug.com/tests/content/";

                if (FBTrace.DBG_FBTEST)
                    FBTrace.sysout("fbtest.loadTestList; baseURI " + self.baseURI +
                        ", serverURI " + self.testCasePath);

                // Create group list from the provided test list. Also clone all JS objects
                // (tests) since they come from untrusted content.
                var map = [];
                self.groups = [];
                for (var i=0; i<win.testList.length; i++)
                {
                    var test = win.testList[i];
                    var group = map[test.group];
                    if (!group)
                    {
                        self.groups.push(group = map[test.group] =
                            new FBTestApp.TestGroup(test.group));
                    }

                    // Default value for category attribute is "passes".
                    if (!test.category)
                        test.category = "passes";

                    group.tests.push(new FBTestApp.Test(group, test.uri,
                        test.desc, test.category, test.testPage));
                }

                self.notifyObservers(self, "fbtest", "restart")

                // Build new test list UI.
                self.refreshTestList();

                // Remember sucessfully loaded test within test history.
                self.appendToHistory(testListPath, self.testCasePath);

                self.updateURLBars();

                if (FBTrace.DBG_FBTEST)
                    FBTrace.sysout("fbtest.onOpenTestSuite; Test list successfully loaded: " +
                        testListPath + ", " + self.testCasePath);

                // Finally run all tests if the browser has been launched with
                // -runFBTests argument on the command line.
                self.autoRun();
            }
        }

        // Load test-list file into the content frame.
        consoleFrame.addEventListener("load", onTestFrameLoaded, true);
        consoleFrame.setAttribute("src", testListPath);

        this.updateURLBars();
    },

    notifyObservers: function(subject, topic, data)
    {
        observerService.notifyObservers({wrappedJSObject: this}, topic, data);
    },

    refreshTestList: function()
    {
        if (!this.groups)
        {
            FBTrace.sysout("fbtest.refreshTestList; ERROR There are no tests.");
            return;
        }

        var frame = $("consoleFrame");
        var doc = frame.contentDocument;
        var consoleNode = $("testList", doc);
        if (!consoleNode)
        {
            consoleNode = doc.createElement("div");
            consoleNode.setAttribute("id", "testList");
            var body = getBody(doc);
            if (!body)
            {
                FBTrace.sysout("fbtest.refreshTestList; ERROR There is no <body> element.");
                return;
            }
            body.appendChild(consoleNode);
        }

        var table = FBTestApp.GroupList.tableTag.replace({groups: this.groups}, consoleNode);
        var row = table.firstChild.firstChild;

        for (var i=0; i<this.groups.length; i++)
        {
            var group = this.groups[i];
            group.row = row;
            row = row.nextSibling;
        }
    },

    autoRun: function()
    {
        if (!cmdLineHandler.wrappedJSObject.runFBTests)
            return;

        // The auto run is done just the first time the test-console is opened.
        cmdLineHandler.wrappedJSObject.runFBTests = false;

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.autoRun; defaultTestList: " + FBTestApp.defaultTestList +
                ", defaultTest: " + FBTestApp.defaultTest);

        // Run all asynchronously so, callstack is correct.
        setTimeout(function()
        {
            // If a test is specified on the command line, run it. Otherwise
            // run entire test suite.
            if (FBTestApp.defaultTest)
            {
                var test = FBTestApp.TestConsole.getTest(FBTestApp.defaultTest);
                if (FBTrace.DBG_FBTEST && !test)
                    FBTrace.sysout("fbtest.autoRun; Test from command line doesn't exist: " +
                        FBTestApp.defaultTest);

                if (test)
                    FBTestApp.TestRunner.runTests([test]);
            }
            else
            {
                FBTestApp.TestConsole.onRunAll(function(canceled)
                {
                    var allPassed = FBTestApp.TestSummary.passingTests.failing == 0;
                    if (!canceled && allPassed)
                        goQuitApplication();
                });
            }
        }, 100);
    },

    getTest: function(uri)
    {
        for (var i=0; i<this.groups.length; i++)
        {
            var group = this.groups[i];
            for (var j=0; j<group.tests.length; j++)
            {
                if (group.tests[j].uri == uri)
                    return group.tests[j];
            }
        }
        return null;
    },

    appendToHistory: function(testListPath, testcaseServer)
    {
        testListPath = trimLeft(testListPath);
        testcaseServer = trimLeft(testcaseServer);

        if (testListPath)
            this.appendNVPairToHistory("history", testListPath);

        if (testcaseServer)
            this.appendNVPairToHistory("testCaseHistory", testcaseServer);
    },

    getHistory: function(name)
    {
        var history = Firebug.getPref(FBTestApp.prefDomain, name);
        var arr = history.split(",");
        return arr;
    },

    appendNVPairToHistory: function(name, value)
    {
        var arr = this.getHistory(name);

        if (!value)
            return arr;

        // Avoid duplicities.
        for (var i=0; i<arr.length; i++) {
            if (arr[i] == value)
                return;
        }

        // Store in preferences.
        arr.push(value);
        Firebug.setPref(FBTestApp.prefDomain, name, arr.join(","));
    },

    // UI Commands
    onRunAll: function(onFinishCallback)
    {
        // Make sure that current URLs for test list & test case root directory
        // is used (could be edited by the user). Notice that if the test list
        // path is edited without pressing and entry (or picking the URI of the
        // test list from the history), no new list is loaded so, the current
        // is executed.
        this.testCasePath = $("testCaseUrlBar").testURL;
        this.testDriverPath = $("testDriverUrlBar").testURL;

        // Join all tests from all groups.
        var testQueue = [];
        for (var i=0; i<this.groups.length; i++)
            testQueue.push.apply(testQueue, this.groups[i].tests);

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.runAll; Number of tests: " + testQueue.length);

        // ... and execute them as one test suite.
        FBTestApp.TestRunner.runTests(testQueue, onFinishCallback);
    },

    onStop: function()
    {
        FBTestApp.TestRunner.testQueue = null;
        FBTestApp.TestRunner.testDone(true);
    },

    onOpenTestList: function()
    {
        filePicker.init(window, null, nsIFilePicker.modeOpen);
        filePicker.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterHTML);
        filePicker.filterIndex = 1;
        filePicker.defaultString = "testList.html";

        var rv = filePicker.show();
        if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace)
        {
            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.onOpenTestList; Test list file picked: " +
                    filePicker.file.path, filePicker.file);

            var testListUrl = Cc["@mozilla.org/network/protocol;1?name=file"]
                .createInstance(Ci.nsIFileProtocolHandler)
                .getURLSpecFromFile(filePicker.file);

            this.loadTestList(testListUrl, this.testCasePath);
        }
    },

    onRefreshTestList: function()
    {
        $("consoleFrame").setAttribute("src", "about:blank");
        this.updatePaths();
        this.loadTestList(this.testListPath, this.testCasePath);
    },

    onToggleHaltOnFailedTest: function()
    {
        this.haltOnFailedTest = !this.haltOnFailedTest;
        Firebug.setPref(FBTestApp.prefDomain, "haltOnFailedTest", this.haltOnFailedTest);
        this.setHaltOnFailedTestButton();
    },

    setHaltOnFailedTestButton: function()
    {
        $('haltOnFailedTest').setAttribute('checked', this.haltOnFailedTest?'true':'false');
    },

    onViewToolbarsPopupShowing: function(event)
    {
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.onViewToolbarsPopupShowing;");

        var popup = event.target;
        for (var i=0; i<popup.childNodes.length; i++)
        {
            var menuItem = popup.childNodes[i];
            var toolbar = $(menuItem.getAttribute("toolbar"));
            menuItem.setAttribute("checked", toolbar.collapsed ? "false" : "true");
        }
    },

    showURLBar: function(event)
    {
        var menuItem = event.originalTarget;
        var toolbar = $(menuItem.getAttribute("toolbar"));
        toolbar.collapsed = menuItem.getAttribute("checked") != "true";
        document.persist(toolbar.id, "collapsed");
    }
};

// ************************************************************************************************

FBTestApp.TestConsole.TraceListener =
{
    // Called when console window is loaded.
    onLoadConsole: function(win, rootNode)
    {
        var consoleFrame = $("consoleFrame", win.document);
        this.addStyleSheet(consoleFrame.contentDocument,
            "chrome://fbtest/skin/traceConsole.css",
            "fbTestStyles");
    },

    addStyleSheet: function(doc, uri, id)
    {
        if ($(id, doc))
            return;

        var styleSheet = createStyleSheet(doc, uri);
        styleSheet.setAttribute("id", id);
        addStyleSheet(doc, styleSheet);
    },

    // Called when a new message is logged in to the trace-console window.
    onDump: function(message)
    {
        var index = message.text.indexOf("fbtest.");
        if (index == 0)
        {
            message.text = message.text.substr("fbtest.".length);
            message.text = trimLeft(message.text);
        }
    }
};

// ************************************************************************************************
// FBTest

/**
 * Unit Test APIs intended to be used within test-file scope.
 */
var FBTest = FBTestApp.FBTest =
{
    /**
     *  Function to be called before every test sequence.
     */
    setToKnownState: function()
    {
        FBTest.sysout("FBTestFirebug setToKnownState");
        if(FBTest.FirebugWindow.Firebug.Activation)
        {
            FBTest.FirebugWindow.Firebug.Activation.toggleAll("off");
            FBTest.FirebugWindow.Firebug.Activation.toggleAll("none");
            FBTest.FirebugWindow.Firebug.Activation.clearAnnotations();
        }
        else
        {
            FBTest.FirebugWindow.Firebug.toggleAll("off");
            FBTest.FirebugWindow.Firebug.toggleAll("none");
        }

        FBTest.FirebugWindow.Firebug.resetAllOptions(false);
    },

    // *************************************************************************************************
    // These functions cause the time-out timer to be reset

    progress: function(msg)
    {
        FBTestApp.TestRunner.appendResult(new FBTestApp.TestResult(window, true, "progress: "+msg));
        FBTestApp.TestSummary.setMessage(msg);
        FBTest.sysout("FBTest progress: ------------- "+msg+" -------------");
    },

    ok: function(pass, msg)
    {
        if (!pass)
            FBTest.sysout("FBTest **** FAILS **** "+msg);
        else
            FBTest.sysout("FBTest ok "+msg);

        FBTestApp.TestRunner.appendResult(new FBTestApp.TestResult(window, pass, msg));

        if (!pass)
            this.onFailure(msg);

        return pass;
    },

    compare: function(expected, actual, msg)
    {
        FBTest.sysout("compare "+((expected == actual)?"passes":"**** FAILS ****")+" "+msg);
        FBTestApp.TestRunner.appendResult(new FBTestApp.TestResult(window,
            expected == actual, msg, expected, actual));
        if (expected != actual)
            FBTest.onFailure(msg);
        return (expected == actual);
    },

    // *************************************************************************************************

    testDone: function()
    {
        FBTestApp.TestRunner.testDone(false);
    },

    manualVerify: function(verifyMsg, instructions, cleanupHandler)
    {
        FBTestApp.TestRunner.manualVerify(verifyMsg, instructions, cleanupHandler);
    },

    onFailure: function(msg)
    {
        if (FBTestApp.TestConsole.haltOnFailedTest)
        {
            FBTestApp.TestRunner.clearTestTimeout();
            FBTest.sysout("Test failed, dropping into debugger "+msg);
            debugger;
        }
    },

    sysout: function(text, obj)
    {
        if (FBTrace.DBG_TESTCASE)
            FBTrace.sysout(text, obj);
    },

    click: function(node)
    {
        if (!node)
            FBTrace.sysout("testConsole click node is null");

        var doc = node.ownerDocument, event = doc.createEvent("MouseEvents");
        event.initMouseEvent("click", true, true, doc.defaultView, 0, 0, 0, 0, 0,
            false, false, false, false, 0, null);
        return node.dispatchEvent(event);
    },

    dblclick: function(node)
    {
        if (!node)
            FBTrace.sysout("testConsole click node is null");

        var doc = node.ownerDocument, event = doc.createEvent("MouseEvents");
        event.initMouseEvent("click", true, true, doc.defaultView, 2, 0, 0, 0, 0,
            false, false, false, false, 0, null);
        return node.dispatchEvent(event);
    },

    rightClick: function(node)
    {
        if (!node)
            FBTrace.sysout("testConsole.rightClick node is null");

        var doc = node.ownerDocument, event = doc.createEvent("MouseEvents");
        event.initMouseEvent("click", true, true, doc.defaultView, 0, 0, 0, 0, 0,
            false, false, false, false, 2, null);
        return node.dispatchEvent(event);
    },

    mouseDown: function(node)
    {
        var doc = node.ownerDocument, event = doc.createEvent("MouseEvents");
        event.initMouseEvent("mousedown", true, true, doc.defaultView, 0, 0, 0, 0, 0,
            false, false, false, false, 0, null);
        return node.dispatchEvent(event);
    },

    loadScript: function(scriptURI, scope)
    {
        return loader.loadSubScript(FBTestApp.TestConsole.baseURI + scriptURI, scope);
    },

    getHTTPURLBase: function()
    {
        return FBTestApp.TestConsole.getHTTPURLBase();
    },

    getLocalURLBase: function()
    {
        return FBTestApp.TestServer.chromeToUrl(FBTestApp.TestConsole.baseURI, true);
    },

    registerPathHandler: function(path, handler)
    {
        var server = FBTestApp.TestServer.getServer();
        return server.registerPathHandler(path, function(metadata, response)
        {
            try
            {
                handler.apply(null, [metadata, response]);
            }
            catch (err)
            {
                FBTrace.sysout("FBTest.registerPathHandler EXCEPTION", err);
            }
        });
    },

    pressKey: function(keyCode, eltID)
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
    },

    focus: function(node)
    {
        if (node.focus)
            return node.focus();

        var doc = node.ownerDocument, event = doc.createEvent("UIEvents");
        event.initUIEvent("DOMFocusIn", true, true, doc.defaultView, 1);
        return node.dispatchEvent(event);
    },

    exception: function(msg, err)
    {
        FBTestApp.TestRunner.appendResult(new FBTestApp.TestException(window, msg, err));
    }
};

// ************************************************************************************************

/**
 * Helper wrapper for FBTest API object. When a test calls any of the FBTest
 * APIs the test timout is re-executed since we know that the test is still alive.
 * This wrapper is passed into the test scope as a proxy to the original object.
 */
FBTestApp.FBTestWrapper = function(win)
{
    var original = FBTestApp.FBTest;
    var reseters = ['ok', 'compare', 'progress'];
    for (prop in original)
    {
        var obj = original[prop];
        if (reseters.indexOf(prop) != -1 && obj instanceof Function)
        {
            // Make sure the scope is correct (double function)
            var wrapper = function(funcName) {
                return function() {
                    FBTestApp.TestRunner.setTestTimeout(win);
                    return original[funcName].apply(original, arguments);
                }
            };
            this[prop] = wrapper(prop);
        }
        else
        {
            this[prop] = obj;
        }
    }
}

// ************************************************************************************************
}});
