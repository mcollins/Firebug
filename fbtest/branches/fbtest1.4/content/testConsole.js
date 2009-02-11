/* See license.txt for terms of usage */

// ************************************************************************************************
// Test Console Implementation

var Cc = Components.classes;
var Ci = Components.interfaces;

// Services
var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);
var filePicker = Cc["@mozilla.org/filepicker;1"].getService(Ci.nsIFilePicker);

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
    homeURI: "chrome://firebugTests/content/",
    
    initialize: function()
    {
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.TestConsole.initializing");

        var args = window.arguments[0];
        var FirebugWindow = args.FirebugWindow;
        FBTrace = FirebugWindow.FBTrace;
        Firebug = FirebugWindow.Firebug;
        FBTest.FirebugWindow = FirebugWindow;
        gFindBar = document.getElementById("FindToolbar");

        try
        {
            //xxxHonza: 
            // Load default test list, this will automatically build the UI
            // and start the serve with proper home directory.
            // loadTestList("chrome://firebugTests/testList.html");

            // Build test list UI.
            this.refreshTestListUI();

            // Start local HTTP server. The chrome URL is mapped to an HTTP URL 
            // available via TestServer.getTestCaseRootPath()
            TestServer.start(this.homeURI);

            // Register strings so, Firebug's localization APIs can be used.
            Firebug.registerStringBundle("chrome://fbtest/locale/fbtest.properties");

            // Localize strings in XUL (using string bundle).
            this.internationalizeUI();

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
        var buttons = ["runAll", "stopTest", "refreshList"];
        for (var i=0; i<buttons.length; i++)
        {
            var element = document.getElementById(buttons[i]);
            FBL.internationalize(element, "label");
            FBL.internationalize(element, "tooltiptext");
        }
    },

    shutdown: function()
    {
        TestServer.stop();
    },

    loadTestList: function(testListPath)
    {
        var self = this;
        var consoleFrame = document.getElementById("consoleFrame");
        var onTestFrameLoaded = function(event)
        {
            consoleFrame.removeEventListener("load", onTestFrameLoaded, true);

            // Append proper styles.
            var doc = event.target;
            var styles = ["testConsole.css", "testList.css", "testResult.css", "tabView.css"];
            for (var i=0; i<styles.length; i++)
                addStyleSheet(doc, createStyleSheet(doc, "chrome://fbtest/skin/" + styles[i]));

            // Build test list UI.
            self.refreshTestListUI();

            this.homeURI = doc.defaultView.wrappedJSObject.basePath;
            if (this.homeURI)
            {
                // Restart server with new home directory.
                TestServer.restart(this.homeURI);
    
                if (FBTrace.DBG_FBTEST)
                    FBTrace.sysout("fbtest.onOpenTestSuite; Test List loaded: " +
                        filePicker.file.path, doc);
            }
            else
            {
                if (FBTrace.DBG_FBTEST || FBTrace.DBG_ERRORS)
                    FBTrace.sysout("fbtest.onOpenTestSuite; ERROR No basePath defined in: " +
                        filePicker.file.path, doc);
            }
        }

        // Load test-list file into the conent frame.
        consoleFrame.addEventListener("load", onTestFrameLoaded, true);
        consoleFrame.setAttribute("src", "file://" + testListPath);

        // Update URL
        var testListURLBox = document.getElementById("testListURL");
        testListURLBox.value = testListPath;
    },

    refreshTestListUI: function() 
    {
        var frame = document.getElementById("consoleFrame");
        this.testList = frame.contentWindow.wrappedJSObject.testList;
        if (!this.testList)
        {
            if (FBTrace.DBG_FBTEST || FBTrace.DBG_ERRORS)
                FBTrace.sysout("fbtest.refreshTestList; ERROR No testList defined in: " +
                    frame.getAttribute("src"), frame.contentWindow);
            return;
        }

        var consoleNode = frame.contentDocument.getElementById("testList");
        CategoryList.tableTag.replace({testList: this.testList}, consoleNode);
    },

    // UI Commands
    onRunAll: function()
    {
        alert("TBD");
    },

    onStopTest: function()
    {
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
            this.loadTestList(filePicker.file.path);
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
        var cache = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService);
        cache.evictEntries(Ci.nsICache.STORE_ON_DISK);
        cache.evictEntries(Ci.nsICache.STORE_IN_MEMORY);

        this.localDir = this.chromeToPath(chromeRoot);
        this.path = "http://localhost:" + serverPort + "/tests/";

        this.getServer().registerDirectory("/tests/", this.localDir);

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
    }
};

// ************************************************************************************************
// TestRunner

/**
 * Test runner is intended to run single tests or test suites.
 */
var TestRunner =
{
    runTests: function(tests)
    {

    },

    runTest: function(testObj)
    {
        if (this.currentTest)
            return;

        try
        {
            this.currentTest = testObj;
            this.currentTest.path = TestConsole.homeURI + testObj.uri;
            this.currentTest.results = [];
            this.currentTest.error = false;

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
        var testFrame = document.getElementById("testFrame");
        var outerWindow =  testFrame.contentWindow;
        var doc = outerWindow.document;

        // Look first to see if we already have the test case loaded
        var testCaseIframe = null;
        var frames = doc.getElementsByTagName("iframe");
        for (var i = 0; i < frames.length; i++)
        {
            if (frames[i].getAttribute("src") == testURL)
            {
                testCaseIframe = frames[i];
                break;
            }
        }
        if (testCaseIframe) // yes, remove it
        {
            testCaseIframe.parentNode.removeChild(testCaseIframe);
        }
            testCaseIframe = doc.createElementNS("http://www.w3.org/1999/xhtml", "iframe");
            testCaseIframe.setAttribute("src", "about:blank");
            var body = doc.getElementsByTagName("body")[0];
            body.appendChild(testCaseIframe);
            // now hook the load event, so the next src= will trigger it.
            var triggerTest = function(event)
            {
                if (FBTrace.DBG_FBTEST)
                    FBTrace.sysout("load event "+event.target, event.target);
                testCaseIframe.removeEventListener("load", triggerTest, true);
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

                try
                {
                    win.runTest();
                }
                catch (exc)
                {
                    FBTest.sysout("runTest FAILS "+exc, exc);
                }
            }
            testCaseIframe.addEventListener("load", triggerTest, true);

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
// FBTest

/**
 * Unit Test APIs intended to be used within test-file scope.
 */
var FBTest =
{
    progress: function(msg)
    {
        TestRunner.appendResult(new TestResult(window, true, "progress: "+msg));
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

    id: function(win, id)
    {
        if (typeof id == "string")
            return win.document.getElementById(id);
        return id;
    },

    click: function(win, node)
    {
        node = this.id(win, node);
        if (node.click)
            return node.click();

        var doc = node.ownerDocument, event = doc.createEvent("MouseEvents");
        event.initMouseEvent("click", true, true, doc.defaultView, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        return node.dispatchEvent(event);
    },

    mouseDown: function(win, node)
    {
        node = this.id(win, node);
        if (node.click)
            return node.click();

        var doc = node.ownerDocument, event = doc.createEvent("MouseEvents");
        event.initMouseEvent("mousedown", true, true, doc.defaultView, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        return node.dispatchEvent(event);
    },

    loadScript: function(scriptURI, scope)
    {
        return loader.loadSubScript(TestRunner.homeURI + scriptURI, scope);
    }
};

// ************************************************************************************************
}
