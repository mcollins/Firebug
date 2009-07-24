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
    baseURI: null,
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

            // Load all tests from the default test list file (testList.html).
            // The file usually defines two variables:
            // testList: array with individual test objects.
            // baseURI: base directory for the test server (http://localhost:7080)
            //          if this variable isn't specified, the parent directory of the
            //          test list file is used.
            this.loadTestList(this.getDefaultTestList());

            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.TestConsole.initialized");

            gFindBar = document.getElementById("FindToolbar");
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

        return defaultTestList;
    },

    internationalizeUI: function()
    {
        var buttons = ["runAll", "stopTest", "haltOnFailedTest", "refreshList"];
        for (var i=0; i<buttons.length; i++)
        {
            var element = $(buttons[i]);
            FBL.internationalize(element, "label");
            FBL.internationalize(element, "tooltiptext");
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
        FBTestApp.TestServer.stop();
        Firebug.setPref(FBTestApp.prefDomain, "defaultTestSuite", this.testListPath);

        if (Firebug.TraceModule)
            Firebug.TraceModule.removeListener(this.TraceListener);

        // Unregister registered repositories.
        Firebug.unregisterRep(FBTestApp.GroupList);
        Firebug.unregisterRep(FBTestApp.TestList);
        Firebug.unregisterRep(FBTestApp.TestResultRep);
    },

    loadTestList: function(testListPath)
    {
//        if (/^chrome:/.test(testListPath))
//            testListPath = TestServer.chromeToUrl(testListPath, false);
//        else if (!/^file:/.test(testListPath))
//            testListPath = TestServer.pathToUrl(testListPath);

        this.testListPath = testListPath;

        var self = this;
        var consoleFrame = $("consoleFrame");
        var onTestFrameLoaded = function(event)
        {
            consoleFrame.removeEventListener("load", onTestFrameLoaded, true);

            // Append proper styles.
            var doc = event.target;
            var styles = ["testConsole.css", "testList.css", "testResult.css", "tabView.css"];
            for (var i=0; i<styles.length; i++)
                addStyleSheet(doc, createStyleSheet(doc, "chrome://fbtest/skin/" + styles[i]));

            // Some CSS from Firebug namespace.
            addStyleSheet(doc, createStyleSheet(doc, "chrome://Firebug/skin/dom.css"));
            addStyleSheet(doc, createStyleSheet(doc, "chrome://Firebug/skin/dom.css"));
            addStyleSheet(doc, createStyleSheet(doc, "chrome://firebug-os/skin/panel.css"));
            addStyleSheet(doc, createStyleSheet(doc, "chrome://Firebug/skin/console.css"));

            var win = doc.defaultView.wrappedJSObject;
            if (!win.testList)
            {
                if (FBTrace.DBG_FBTEST || FBTrace.DBG_ERRORS)
                    FBTrace.sysout("fbtest.refreshTestList; ERROR testList is missing in: " +
                        testListPath, win);
            }
            else
            {
                self.baseURI = win.baseURI;

                // If the baseURI isn't provided use the directory where testList.html
                // file is located.
                if (!self.baseURI)
                    self.baseURI = testListPath.substr(0, testListPath.lastIndexOf("/") + 1);

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

                // Restart server with new home directory using a file: url
                var serverBaseURI = FBTestApp.TestServer.chromeToUrl(self.baseURI, true);
                if (!serverBaseURI)
                {
                    alert("Cannot access test files via baseURI conversion to http URL. " +
                        "Verify 'baseURI' in the config file and that it points to a valid directory!\n\n" +
                        "current config file: " + testListPath + "\n" +
                        "baseURI: " + self.baseURI + "\n");
                    return;
                }

                FBTestApp.TestServer.restart(serverBaseURI);

                // Build new test list UI.
                self.refreshTestList();

                // Remember sucessfully loaded test within test history.
                self.appendToHistory(testListPath);

                if (FBTrace.DBG_FBTEST)
                    FBTrace.sysout("fbtest.onOpenTestSuite; Test list successfully loaded: " +
                        testListPath, doc);

                // Finally run all tests if the browser has been launched with
                // -runFBTests argument on the command line.
                self.autoRun();
            }
        }

        // Load test-list file into the content frame.
        consoleFrame.addEventListener("load", onTestFrameLoaded, true);
        consoleFrame.setAttribute("src", testListPath);

        // Update test list URL box.
        var urlBar = $("testListUrlBar");
        urlBar.testURL = testListPath;
    },

    refreshTestList: function()
    {
        if (!this.groups)
        {
            FBTrace.sysout("fbtest.refreshTestList; ERROR There are no tests.");
            return;
        }

        var frame = $("consoleFrame");
        var consoleNode = $("testList", frame.contentDocument);
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

    appendToHistory: function(testListPath)
    {
        var history = Firebug.getPref(FBTestApp.prefDomain, "history");
        var arr = history.split(",");

        // Avoid duplicities.
        for (var i=0; i<arr.length; i++) {
            if (arr[i] == testListPath)
                return;
        }

        // Store in preferences.
        arr.push(testListPath);
        Firebug.setPref(FBTestApp.prefDomain, "history", arr.join(","));
    },

    // UI Commands
    onRunAll: function(onFinishCallback)
    {
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

            this.loadTestList(testListUrl);
        }
    },

    onRefreshTestList: function()
    {
        $("consoleFrame").setAttribute("src", "about:blank");
        this.loadTestList(this.testListPath);
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

};

// ************************************************************************************************

FBTestApp.TestConsole.TraceListener =
{
    // Called when console window is loaded.
    onLoadConsole: function(win, rootNode)
    {
        var consoleFrame = win.document.getElementById("consoleFrame");
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
            message.type = "DBG_FBTEST";
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
        FBTest.FirebugWindow.Firebug.Activation.toggleAll("off");
        FBTest.FirebugWindow.Firebug.Activation.toggleAll("none");
        FBTest.FirebugWindow.Firebug.Activation.clearAnnotations();
        var filterThem = FBTest.FirebugWindow.Firebug.filterSystemURLs;
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
        return FBTestApp.TestServer.path;
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
