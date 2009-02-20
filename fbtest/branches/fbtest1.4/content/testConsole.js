/* See license.txt for terms of usage */

// ************************************************************************************************
// Test Console Implementation

var Cc = Components.classes;
var Ci = Components.interfaces;

// Services
var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);
var filePicker = Cc["@mozilla.org/filepicker;1"].getService(Ci.nsIFilePicker);
var cache = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService);
var ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
var chromeRegistry = Cc['@mozilla.org/chrome/chrome-registry;1'].getService(Ci.nsIChromeRegistry);

// Interfaces
var nsIFilePicker = Ci.nsIFilePicker;

// Global variables
var gFindBar;
var serverPort = 7080;

// ************************************************************************************************

with (FBL) {

/**
 * This object represents main Test Console implementation.
 */
var TestConsole =
{
    // These are set when a testList.html is loaded.
    baseURI: null,
    categories: null,

    initialize: function()
    {
        try
        {
            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.TestConsole.initializing");

            var args = window.arguments[0];
            var FirebugWindow = args.FirebugWindow;
            FBTrace = FirebugWindow.FBTrace;
            Firebug = FirebugWindow.Firebug;
            FBTest.FirebugWindow = FirebugWindow;
            gFindBar = document.getElementById("FindToolbar");

            // Register strings so, Firebug's localization APIs can be used.
            if (Firebug.registerStringBundle)
                Firebug.registerStringBundle("chrome://fbtest/locale/fbtest.properties");

            Firebug.registerRep(CategoryList);

            // Localize strings in XUL (using string bundle).
            this.internationalizeUI();

            var defaultTestList = Firebug.getPref(Firebug.prefDomain, "fbtest.defaultTestSuite");
            if (!defaultTestList)
                defaultTestList = "chrome://firebug/content/testList.html";

            // Load default test list. The test list is built according to 
            // a 'testList' variable and server started using a 'baseURI' variable.
            // Both variables must be present within the file.
            this.loadTestList(defaultTestList);

            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.TestConsole.initialized");
        }
        catch (e)
        {
            if (FBTrace.DBG_FBTEST || FBTrace.DBG_ERRORS)
                FBTrace.sysout("fbtest.TestConsole.initialize FAILS "+e, e);

            alert("There may be a useful message on the Error Console: "+e);
        }
    },

    internationalizeUI: function()
    {
        var buttons = ["runAll", "stopTest"];
        for (var i=0; i<buttons.length; i++)
        {
            var element = $(buttons[i]);
            FBL.internationalize(element, "label");
            FBL.internationalize(element, "tooltiptext");
        }
    },

    shutdown: function()
    {
        TestServer.stop();

        Firebug.setPref(Firebug.prefDomain, "fbtest.defaultTestSuite", this.testListPath);
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

                // Create category list from the provided test list. Also clone all JS objects
                // (tests) since they come from untrusted content.
                var map = [];
                self.categories = [];
                for (var i=0; i<win.testList.length; i++) 
                {
                    var test = win.testList[i];
                    var category = map[test.category];
                    if (!category)
                        self.categories.push(category = map[test.category] = new Category(test.category));
                    category.tests.push(new Test(category, test.uri, test.desc));
                }

                // Restart server with new home directory using a file: url
                var serverBaseURI = TestServer.chromeToUrl(self.baseURI, true);  
                TestServer.restart(serverBaseURI);

                // Build new test list UI.
                self.refreshTestList();

                if (FBTrace.DBG_FBTEST)
                    FBTrace.sysout("fbtest.onOpenTestSuite; Test list successfully loaded: " +
                        testListPath, doc);
            }
        }

        // Load test-list file into the content frame.
        consoleFrame.addEventListener("load", onTestFrameLoaded, true);
        consoleFrame.setAttribute("src", testListPath);

        // Update test list URL box.
        var testListURLBox = $("testListURL");
        testListURLBox.value = testListPath;
    },

    refreshTestList: function()
    {
        if (!this.categories)
        {
            FBTrace.sysout("fbtest.refreshTestList; ERROR There are no tests.");
            return;
        }

        var frame = $("consoleFrame");
        var consoleNode = $("testList", frame.contentDocument);
        var table = CategoryList.tableTag.replace({categories: this.categories}, consoleNode);
        var row = table.firstChild.firstChild;

        for (var i=0; i<this.categories.length; i++)
        {
            var category = this.categories[i];
            category.row = row;
            row = row.nextSibling;
        }
    },

    // UI Commands
    onRunAll: function()
    {
        // Join all tests from all categories.
        var testQueue = [];
        for (var i=0; i<this.categories.length; i++)
            testQueue.push.apply(testQueue, this.categories[i].tests);

        // ... and execute them as one test suite.
        TestRunner.runTests(testQueue);
    },

    onStop: function()
    {
        TestRunner.testQueue = null;
        TestRunner.testDone();
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
    }
};

// ************************************************************************************************

/**
 * HTTP Server helper
 */
var TestServer =
{
    // Start the HTTP server mapping the server URL http://localhost:port/tests to the files at chromeRoot.
    // chromeRoot cannot end at /content, it has to have something after that.
    // (if you end in /content/, use parent to undo the convertToChromeURL file portion shorthand .parent;)
    start: function(chromeRoot)
    {
        cache.evictEntries(Ci.nsICache.STORE_ON_DISK);
        cache.evictEntries(Ci.nsICache.STORE_IN_MEMORY);

        this.localDir = this.chromeToPath(chromeRoot);
        this.path = "http://localhost:" + serverPort + "/";

        this.getServer().registerDirectory("/", this.localDir);

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.TestServer.registerDirectory: " + this.path + " => " +
                this.localDir.path);

        return true;
    },

    stop: function()
    {
        if (this.server)
            this.server.stop();
    },

    restart: function(chromeRoot)
    {
        TestServer.stop();
        TestServer.start(chromeRoot);
    },

    getTestCaseRootPath: function()
    {
        return this.path;
    },

    getServer: function()
    {
        if (!this.server)
        {
            this.server = new nsHttpServer();
            this.server.start(serverPort);

            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.TestServer.getServer HTTP server started");
        }
        return this.server;
    },

    chromeToPath: function (aPath)
    {
       if (!aPath || !(/^chrome:/.test(aPath)))
          return this.urlToPath( aPath );

       var ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci["nsIIOService"]);
       var uri = ios.newURI(aPath, "UTF-8", null);
       var cr = Cc['@mozilla.org/chrome/chrome-registry;1'].getService(Ci["nsIChromeRegistry"]);
       var rv = cr.convertChromeURL(uri).spec;

       if (/content\/$/.test(aPath)) // fix bug  in convertToChromeURL
       {
           var m = /(.*\/content\/)/.exec(rv);
           if (m)
           {
               rv = m[1];
           }
       }

       if (/^file:/.test(rv))
          rv = this.urlToPath(rv);
       else
          rv = this.urlToPath("file://"+rv);

       return rv;
    },

    urlToPath: function (aPath)
    {
        try
        {
            if (!aPath || !/^file:/.test(aPath))
                return;

            return Cc["@mozilla.org/network/protocol;1?name=file"]
                      .createInstance(Ci.nsIFileProtocolHandler)
                      .getFileFromURLSpec(aPath);
        }
        catch (e)
        {
            throw new Error("urlToPath fails for "+aPath+ " because of "+e);
        }
    },

    chromeToUrl: function (aPath, aDir)
    {
        if (!aPath || !(/^chrome:/.test(aPath)))
            return this.pathToUrl(aPath);

       var uri = ios.newURI(aPath, "UTF-8", null);
       var rv = chromeRegistry.convertChromeURL(uri).spec;
       if (aDir)
            rv = rv.substr(0, rv.lastIndexOf("/") + 1);

       if (/content\/$/.test(aPath)) // fix bug  in convertToChromeURL
       {
           var m = /(.*\/content\/)/.exec(rv);
           if (m)
           {
               rv = m[1];
           }
       }

       if (!/^file:/.test(rv))
          rv = this.pathToUrl(rv);

       return rv;
    },

    pathToUrl: function(aPath)
    {
        try
        {
            if (!aPath || /^file:/.test(aPath))
                return aPath;

            var uri = ios.newURI(aPath, "UTF-8", null);
            return Cc["@mozilla.org/network/protocol;1?name=file"]
                .createInstance(Ci.nsIFileProtocolHandler)
                .getURLSpecFromFile(uri).spec;
        }
        catch (e)
        {
            throw new Error("urlToPath fails for "+aPath+ " because of "+e);
        }
    }
};

// ************************************************************************************************
// TestRunner

/**
 * Test runner is intended to run single tests or test suites.
 */
var TestRunner =
{
    testQueue: null,

    runTests: function(tests)
    {
        tests = cloneArray(tests);

        TestSummary.clear();
        TestProgress.start(tests.length);

        this.testQueue = tests;
        this.runTest(this.testQueue.shift());
    },

    runTest: function(testObj)
    {
        if (this.currentTest)
            return;

        try
        {
            this.currentTest = testObj;
            this.currentTest.path = TestConsole.baseURI + testObj.uri;
            this.currentTest.results = [];
            this.currentTest.error = false;

            // Show the test within the UI (expand parent category)
            var parentCategory = this.currentTest.parent;
            CategoryList.expandCategory(parentCategory.row);
            scrollIntoCenterView(this.currentTest.row);

            // Remove previous results (if any).
            if (hasClass(this.currentTest.row, "opened"))
            {
                var infoBody = this.currentTest.row.nextSibling;
                var resultsBody = FBL.getElementByClass(infoBody, "testBodyCol");
                clearNode(resultsBody);
            }

            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.TestRunner.Test START: " + this.currentTest.path,
                    this.currentTest);

            setClass(this.currentTest.row, "running");
            removeClass(this.currentTest.row, "results");
            removeClass(this.currentTest.row, "error");

            var testURL = this.currentTest.path;
            if (/\.js$/.test(testURL))
                testURL = this.wrapJS(testURL);

            this.loadTestFrame(testURL);
        }
        catch (e)
        {
            if (FBTrace.DBG_FBTEST || FBTrace.DBG_ERRORS)
                FBTrace.sysout("fbtest.TestRunner.runTest EXCEPTION", e);
            FBTest.ok(false, "TestRunner.runTest FAILS: "+e);
        }
    },

    wrapJS: function(jsURL)
    {
        if (!this.wrapAJSFile)
            this.wrapAJSFile = getResource("chrome://fbtest/content/wrapAJSFile.html");
        var testURL = getDataURLForContent(new String(this.wrapAJSFile).replace("__replaceme__", jsURL), jsURL);

        FBTrace.sysout("wrapJS converted "+jsURL, testURL);
        return testURL;
    },

    loadTestFrame: function(testURL)
    {
        var testFrame = $("testFrame");
        var outerWindow =  testFrame.contentWindow;
        var doc = outerWindow.document;

        // clean up previous test if any
        var testCaseIframe = null;
        var frames = doc.getElementsByTagName("iframe");
        for (var i = 0; i < frames.length; i++)
        {
            testCaseIframe = frames[i];
            testCaseIframe.parentNode.removeChild(testCaseIframe);
        }
        
        testCaseIframe = doc.createElementNS("http://www.w3.org/1999/xhtml", "iframe");
        testCaseIframe.setAttribute("src", "about:blank");
        var body = doc.getElementsByTagName("body")[0];
        body.appendChild(testCaseIframe);
        // now hook the load event, so the next src= will trigger it.
        var loadTestCase = function(event)
        {
            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("load event "+event.target, event.target);
            testCaseIframe.removeEventListener("load", loadTestCase, true);
            var testDoc = event.target;
            var win = testDoc.defaultView;

            if (win.wrappedJSObject)
                win.wrappedJSObject.FBTest = window.FBTest;
            else
                win.FBTest = window.FBTest;
            if (win.wrappedJSObject)
                win.wrappedJSObject.FBTrace = window.FBTrace;
            else
                win.FBTrace = window.FBTrace;
            function runTestCase(event)
            {
            	win.removeEventListener('load', runTestCase, true);
            	try
            	{
            		win.runTest();
            	}
            	catch (exc)
            	{
            		FBTest.sysout("runTest FAILS "+exc, exc);
            	}
            }
            win.addEventListener('load', runTestCase, true);
        }
        testCaseIframe.addEventListener("load", loadTestCase, true);

        // Load or reload the test page
        testCaseIframe.setAttribute("src", testURL);
        var docShell = this.getDocShellByDOMWindow(testCaseIframe);
        FBTrace.sysout("iframe.docShell for "+testURL,  docShell);
    },

    testDone: function()
    {
        if (!this.currentTest)
            return;

        removeClass(this.currentTest.row, "running");

        if (this.currentTest.results.length > 0)
            setClass(this.currentTest.row, "results");

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.TestRunner.Test END: " + this.currentTest.path,
                this.currentTest);

        this.currentTest = null;

        // If there are tests in the queue, execute them.
        if (this.testQueue && this.testQueue.length)
        {
            TestProgress.update(this.testQueue.length);
            this.runTest(this.testQueue.shift());
        }
        else
        {
            TestProgress.stop();
        }
    },

    appendResult: function(result)
    {
        this.currentTest.results.push(result);

        // If the test is currently opened, append the result directly into the UI.
        if (hasClass(this.currentTest.row, "opened"))
        {
            var infoBodyRow = this.currentTest.row.nextSibling;
            var table = FBL.getElementByClass(infoBodyRow, "testResultTable");
            if (!table)
                table = TestResultRep.tableTag.replace({}, infoBodyRow.firstChild);

            var tbody = table.firstChild;
            result.row = TestResultRep.resultTag.insertRows(
                {results: [result]}, tbody.lastChild ? tbody.lastChild : tbody)[0];
        }

        // If it's an error update test so, it's reflecting an error state.
        if (!result.pass)
        {
            setClass(this.currentTest.row, "error");
            this.currentTest.error = true;
        }

        // Update summary in the status bar.
        TestSummary.append(result);
    },

    sysout: function(msg, obj)
    {
        FBTrace.sysout(msg, obj);
    },

    getDocShellByDOMWindow: function(domWindow)
    {
       if (domWindow instanceof Components.interfaces.nsIInterfaceRequestor)
        {
            var navi = domWindow.getInterface(Components.interfaces.nsIWebNavigation);
            if (navi instanceof Components.interfaces.nsIDocShellTreeItem)
            {
                return navi;
            }
            else
                FBTrace.dumpStack("Chromebug getDocShellByDOMWindow, nsIWebNavigation notA nsIDowShellTreeItem");
        }
        else
        {
            FBTrace.dumpProperties("Chromebug getDocShellByDOMWindow, window notA nsIInterfaceRequestor:", domWindow);
            FBTrace.sysout("getDocShellByDOMWindow domWindow.location:"+domWindow.location, " isA nsIDOMWindow: "+
                (domWindow instanceof Ci.nsIDOMWindow));
        }
    },
};

// ************************************************************************************************

var TestProgress =
{
    start: function(max)
    {
        this.max = max;
        var meter = this.getMeter();
        meter.style.display = "block";
    },

    stop: function()
    {
        var meter = this.getMeter();
        meter.style.display = "none";
    },

    update: function(value)
    {
        var current = this.max - value;
        var meter = this.getMeter();
        meter.value = current ? current / (this.max / 100) : 0;
    },

    getMeter: function()
    {
        return $("progressMeter");
    }
}

// ************************************************************************************************

var TestSummary = 
{
    results: [],
    passing: 0,
    failing: 0,

    append: function(result)
    {
        this.results.push(result);

        result.pass ? this.passing++ : this.failing++;

        if (this.passing)
            $("passingTests").value = "Passing Tests: " + this.passing;       //xxxHonza: localization

        if (this.failing)
            $("failingTests").value = "Failing Tests: " + this.failing;      //xxxHonza: localization
    },

    setMessage: function(message)
    {
        $("progressMessage").value = message;
    },

    clear: function()
    {
        this.results = [];
        this.passing = 0;
        this.failing = 0;

        $("passingTests").value = "";
        $("failingTests").value = "";
        $("progressMessage").value = "";
    }
}

// ************************************************************************************************
// FBTest

/**
 * Unit Test APIs intended to be used within test-file scope.
 */
var FBTest =
{
    progress: function(msg)
    {
        TestRunner.appendResult(new TestResult(window, true, "progress: "+msg));
        TestSummary.setMessage(msg);
    },

    ok: function(pass, msg)
    {
        TestRunner.appendResult(new TestResult(window, pass, msg));
    },

    testDone: function()
    {
        TestRunner.testDone();
    },

    compare: function(expected, actuall, msg)
    {
        TestRunner.appendResult(new TestResult(window, expected == actuall,
            msg, expected, actuall));
    },

    sysout: function(text, obj)
    {
        TestRunner.sysout(text, obj);
    },

    click: function(node)
    {
        if (node.click)
            return node.click();

        var doc = node.ownerDocument, event = doc.createEvent("MouseEvents");
        event.initMouseEvent("click", true, true, doc.defaultView, 0, 0, 0, 0, 0, 
            false, false, false, false, 0, null);
        return node.dispatchEvent(event);
    },

    mouseDown: function(node)
    {
        if (node.click)
            return node.click();

        var doc = node.ownerDocument, event = doc.createEvent("MouseEvents");
        event.initMouseEvent("mousedown", true, true, doc.defaultView, 0, 0, 0, 0, 0, 
            false, false, false, false, 0, null);
        return node.dispatchEvent(event);
    },

    loadScript: function(scriptURI, scope)
    {
        return loader.loadSubScript(TestConsole.baseURI + scriptURI, scope);
    },

    getHTTPURLBase: function()
    {
        return TestServer.path;
    },

    registerPathHandler: function(path, handler)
    {
        return TestServer.getServer().registerPathHandler(path, function(metadata, response) 
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

    pressKey: function(keyCode)
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
        doc.documentElement.dispatchEvent(keyEvent);
    },
};

// ************************************************************************************************
}
