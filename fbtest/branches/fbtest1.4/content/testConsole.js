/* See license.txt for terms of usage */

// ************************************************************************************************
// Test Console Implementation

var Cc = Components.classes;
var Ci = Components.interfaces;

var gFindBar;
var serverPort = 7080;

// ************************************************************************************************

with (FBL) {

/**
 * This object represents main Test Console implementation.
 */
var TestConsole =
{
    initialize: function()
    {
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.TestConsole.initializing");

        var args = window.arguments[0];
        var FirebugWindow = args.FirebugWindow;
        FBTrace = FirebugWindow.FBTrace;
        Firebug = FirebugWindow.Firebug;
        FBTest.FirebugWindow = FirebugWindow;
FBTrace.sysout("FirebugWindow ", FirebugWindow);
FBTrace.sysout("FirebugWindow "+ FirebugWindow.location);
        gFindBar = document.getElementById("FindToolbar");

        // Build UI
        var consoleFrame = document.getElementById("consoleFrame");
        var consoleNode = consoleFrame.contentDocument.getElementById("testList");
        CategoryList.tableTag.replace({testList: testList}, consoleNode);

        // Start local HTTP server
        TestServer.start(/* dir path */); //xxxHonza: the path should be specified by the user.
        TestRunner.initialize();

        this.internationalizeUI();

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.TestConsole.initialized");
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

    // UI Commands
    onRunAll: function()
    {
        alert("TBD");
    },

    onStopTest: function()
    {
        TestRunner.testDone();
    },

    onRefreshList: function()
    {
        var consoleFrame = document.getElementById("consoleFrame");
        var consoleNode = consoleFrame.contentDocument.getElementById("testList");
        CategoryList.tableTag.replace({testList: testList}, consoleNode);
    }
};

// ************************************************************************************************

/**
 * HTTP Server helper
 */
var TestServer =
{
    start: function(dirPath)
    {
        var cache = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService);
        cache.evictEntries(Ci.nsICache.STORE_ON_DISK);
        cache.evictEntries(Ci.nsICache.STORE_IN_MEMORY);
FBTrace.sysout("cache setup, now chromeToPath");
// use parent to undo the convertToChromeURL file portion shorthand
        this.localDir = this.chromeToPath("chrome://firebugTests/content/").parent;
        this.path = "http://localhost:" + serverPort + "/tests/";
        FBTrace.sysout("localDir "+this.localDir.path);
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

       if (/^file:/.test(rv))
          rv = this.urlToPath(rv);
       else
          rv = this.urlToPath("file://"+rv);

       return rv;
    },

    urlToPath: function (aPath)
    {
        if (!aPath || !/^file:/.test(aPath))
            return;

        return Cc["@mozilla.org/network/protocol;1?name=file"]
            .createInstance(Ci.nsIFileProtocolHandler)
            .getFileFromURLSpec(aPath);
    }
};

// ************************************************************************************************
// TestRunner

/**
 * Test runner is inteded to run singl tests or test suites.
 */
var TestRunner =
{
    initialize: function()
    {
        this.testFrame = document.getElementById("testFrame");
    },

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
            this.currentTest.path = TestServer.path + testObj.uri;
            this.currentTest.results = [];
            this.currentTest.error = false;

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
        var outerWindow =  this.testFrame.contentWindow;
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
        if (!testCaseIframe) // no, add it
        {
            testCaseIframe = doc.createElementNS("http://www.w3.org/1999/xhtml", "iframe");
            testCaseIframe.setAttribute("src", "about:blank");
            var body = doc.getElementsByTagName("body")[0];
            body.appendChild(testCaseIframe);
            // now hook the load event, so the next src= will trigger it.
            testCaseIframe.addEventListener("load", function triggerTest(event)
            {
                if (FBTrace.DBG_FBTEST)
                    FBTrace.sysout("load event "+event.target, event.target);
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
                win.runTest();
            }, true);
        }
        // Load or reload the test page
        testCaseIframe.setAttribute("src", testURL);
        var docShell = getDocShellByDOMWindow(testCaseIframe);
        FBTrace.sysout("iframe.docShell for "+testURL,  docShell);
    },

    testDone: function()
    {
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

        // xxxHonza: what about appendResults?
        if (!result.pass)
        {
            setClass(this.currentTest.row, "error");
            this.currentTest.error = true;
        }
    },

    appendResults: function(queueResults)
    {
        var tbody = TestConsole.table.firstChild;
        var row = TestResultRep.resultTag.insertRows(
            {results: queueResults}, tbody.lastChild ? tbody.lastChild : tbody)[0];

        for (var i=0; i<queueResults.length; i++)
        {
            var result = queueResults[i];
            result.row = row;
            row = row.nextSibling;
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
            FBTrace.sysout("getDocShellByDOMWindow domWindow.location:"+domWindow.location, " isA nsIDOMWindow: "+(domWindow instanceof nsIDOMWindow));
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
};

// ************************************************************************************************
}
