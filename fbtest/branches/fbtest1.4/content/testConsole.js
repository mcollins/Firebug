/* See license.txt for terms of usage */

// ************************************************************************************************
// Trace Console Implementation

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
        var args = window.arguments[0];
        FBTrace = args.FBTrace;
        Firebug = args.Firebug;

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

        this.localDir = this.chromeToPath("chrome://fbtest/content/tests");
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

            // Load script into a test frame.
            var testSource = getResource(this.currentTest.path);
            var doc = this.testFrame.contentWindow.document;
            var script = doc.getElementById("TestScript");
            if (script)
                doc.body.removeChild(script);

            script = doc.createElement("script");
            script.setAttribute("id", "TestScript");
            script.innerHTML = testSource;
            doc.body.appendChild(script);

            this.testFrame.contentWindow.runTest();
        }
        catch (e)
        {
            if (FBTrace.DBG_FBTEST || FBTrace.DBG_ERRORS)
                FBTrace.sysout("fbtest.TestRunner.runTest EXCEPTION", e);
        }
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
    }
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
