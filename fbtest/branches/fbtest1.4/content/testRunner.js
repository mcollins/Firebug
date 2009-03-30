/* See license.txt for terms of usage */

FBTestApp.ns(function() { with (FBL) {

// ************************************************************************************************
// Test Console Implementation

var Cc = Components.classes;
var Ci = Components.interfaces;

// ************************************************************************************************
// TestRunner

/**
 * Test runner is intended to run single tests or test suites.
 */
FBTestApp.TestRunner =
{
    testQueue: null,
    onFinishCallback: null,
    testTimeoutID: null,

    runTests: function(tests, onFinishCallback)
    {
        tests = cloneArray(tests);

        FBTestApp.TestSummary.clear();
        FBTestApp.TestProgress.start(tests.length);

        this.onFinishCallback = onFinishCallback;
        this.testQueue = tests;
        this.runTest(this.testQueue.shift());
    },

    runTest: function(testObj)
    {
        if (this.currentTest)
            return;

        try
        {
            // Remember the current test.
            this.currentTest = testObj;

            // Show the test within the UI (expand parent group)
            var parentGroup = this.currentTest.group;
            FBTestApp.GroupList.expandGroup(parentGroup.row);
            scrollIntoCenterView(this.currentTest.row);

            // Start the test after the parent group is expanded so the row
            // exists and can reflect the UI state.
            this.currentTest.onStartTest(FBTestApp.TestConsole.baseURI);

            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.TestRunner.Test START: " + this.currentTest.path,
                    this.currentTest);

            var testURL = this.currentTest.path;
            if (/\.js$/.test(testURL))
                testURL = this.wrapJS(testURL);

            // Load the test file (*.js or *.html) into a test frame and execute it.
            this.loadTestFrame(testURL);
        }
        catch (e)
        {
            if (FBTrace.DBG_FBTEST || FBTrace.DBG_ERRORS)
                FBTrace.sysout("fbtest.TestRunner.runTest EXCEPTION", e);

            FBTestApp.FBTest.ok(false, "TestRunner.runTest FAILS: "+e);
        }
    },

    testDone: function(canceled)
    {
        if (!this.currentTest)
            return;

        if (FBTrace.DBG_FBTEST)
        {
            FBTrace.sysout("fbtest.TestRunner.Test END: " + this.currentTest.path,
                this.currentTest);

            if (canceled)
                FBTrace.sysout("fbtest.TestRunner.CANCELED");
        }

        this.currentTest.onTestDone();
        this.currentTest = null;

        // Test is done so, clear the break-timeout.
        this.resetTestTimeout();

        // If there are tests in the queue, execute them.
        if (this.testQueue && this.testQueue.length)
        {
            FBTestApp.TestProgress.update(this.testQueue.length);
            this.runTest(this.testQueue.shift());
        }
        else
        {
            FBTestApp.TestProgress.stop();
            if (this.onFinishCallback)
                this.onFinishCallback(canceled);
            this.onFinishCallback = null;
        }
    },

    loadTestFrame: function(testURL)
    {
        var testFrame = $("testFrame");
        var outerWindow =  testFrame.contentWindow;
        var doc = outerWindow.document;

        // Clean up previous test if any.
        var testCaseIframe = null;
        var frames = doc.getElementsByTagName("iframe");
        for (var i = 0; i < frames.length; i++)
        {
            testCaseIframe = frames[i];
            testCaseIframe.parentNode.removeChild(testCaseIframe);
        }

        // Create a new frame for this test.
        testCaseIframe = doc.createElementNS("http://www.w3.org/1999/xhtml", "iframe");
        testCaseIframe.setAttribute("src", "about:blank");
        testCaseIframe.setAttribute("id", "testFrame");
        var body = doc.getElementsByTagName("body")[0];
        body.appendChild(testCaseIframe);

        // Set default timeout for the test.
        FBTestApp.FBTest.testTimeout = this.getDefaultTestTimeout();

        // Now hook the load event, so the next src= will trigger it.
        testCaseIframe.addEventListener("load", this.onLoadTestFrame, true);

        // Load or reload the test page
        testCaseIframe.setAttribute("src", testURL);

        if (FBTrace.DBG_FBTEST)
        {
            var docShell = this.getDocShellByDOMWindow(testCaseIframe);
            FBTrace.sysout("iframe.docShell for "+testURL, docShell);
        }
    },

    getDefaultTestTimeout: function()
    {
        return Firebug.getPref(Firebug.prefDomain, "fbtest.testTimeout");
    },

    onLoadTestFrame: function(event)
    {
        var doc = $("testFrame").contentWindow.document;
        var testCaseIframe = doc.getElementById("testFrame");
        testCaseIframe.removeEventListener("load", FBTestApp.TestRunner.onLoadTestFrame, true);

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("FBTest.onLoadTestFrame; " + event.target, event.target);

        var testDoc = event.target;
        var win = testDoc.defaultView;

        // Inject FBTest object into the test page.
        if (win.wrappedJSObject)
            win.wrappedJSObject.FBTest = FBTestApp.FBTest;
        else
            win.FBTest = FBTestApp.FBTest;

        // As soon as the window is loaded, execute a "runTest" method, that must be
        // implemented within the test file.
        win.addEventListener('load', FBTestApp.TestRunner.runTestCase, true);
    },

    runTestCase: function(event)
    {
        var testDoc = event.target;
        var win = testDoc.defaultView;

        win.removeEventListener('load', FBTestApp.TestRunner.runTestCase, true);

        // Start timeout that breaks stucked tests.
        FBTestApp.TestRunner.setTestTimeout(win);

        try
        {
            // Execute test's entry point.
            win.runTest();
        }
        catch (exc)
        {
            FBTestApp.FBTest.sysout("runTest FAILS "+exc, exc);
            FBTestApp.TestRunner.resetTestTimeout();
        }
    },

    setTestTimeout: function(win)
    {
        if (this.testTimeoutID)
            this.resetTestTimeout();

        // Use test timeout from the test driver window if any. This is how
        // a test can override the default value.
        if (typeof(win.FBTestTimeout) != "undefined")
            FBTestApp.FBTest.testTimeout = win.FBTestTimeout;

        this.testTimeoutID = window.setTimeout(function()
        {
            var time = formatTime(FBTestApp.FBTest.testTimeout);
            FBTestApp.FBTest.ok(false, "TIMEOUT: " + time );

            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.testTimeout TEST FAILED (timeout: " + time + "): " +
                    FBTestApp.TestRunner.currentTest.path);

           FBTestApp.TestRunner.testDone(false);
        }, FBTestApp.FBTest.testTimeout);
    },

    resetTestTimeout: function()
    {
        if (this.testTimeoutID)
        {
            clearTimeout(this.testTimeoutID);
            this.testTimeoutID = 0;
        }
    },

    wrapJS: function(jsURL)
    {
        if (!this.wrapAJSFile)
            this.wrapAJSFile = getResource("chrome://fbtest/content/wrapAJSFile.html");

        var testURL = getDataURLForContent(new String(this.wrapAJSFile).replace("__replaceme__", jsURL), jsURL);
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("wrapJS converted "+jsURL, testURL);

        return testURL;
    },

    appendResult: function(result)
    {
        if (!this.currentTest)
        {
            FBTrace.sysout("test result came in after testDone!", result);
            $("progressMessage").value = "test result came in after testDone!";
            return;
        }

        // Append result into the test object.
        this.currentTest.appendResult(result);

        // If the test is currently opened, append the result directly into the UI.
        if (hasClass(this.currentTest.row, "opened"))
        {
            var infoBodyRow = this.currentTest.row.nextSibling;
            var table = FBL.getElementByClass(infoBodyRow, "testResultTable");
            if (!table)
                table = FBTestApp.TestResultRep.tableTag.replace({}, infoBodyRow.firstChild);

            var tbody = table.firstChild;
            result.row = FBTestApp.TestResultRep.resultTag.insertRows(
                {results: [result]}, tbody.lastChild ? tbody.lastChild : tbody)[0];
        }

        // Update summary in the status bar.
        FBTestApp.TestSummary.append(this.currentTest, result);
    },

    sysout: function(msg, obj)
    {
        FBTrace.sysout(msg, obj);
    },

    getDocShellByDOMWindow: function(domWindow)
    {
        if (domWindow instanceof Ci.nsIInterfaceRequestor)
        {
            var navi = domWindow.getInterface(Ci.nsIWebNavigation);
            if (navi instanceof Ci.nsIDocShellTreeItem)
            {
                return navi;
            }
            else if (FBTrace.DBG_FBTEST)
            {
                FBTrace.sysout("Chromebug getDocShellByDOMWindow, nsIWebNavigation notA nsIDowShellTreeItem");
            }
        }
        else if (FBTrace.DBG_FBTEST)
        {
            FBTrace.sysout("Chromebug getDocShellByDOMWindow, window notA nsIInterfaceRequestor:", domWindow);
            FBTrace.sysout("getDocShellByDOMWindow domWindow.location:"+domWindow.location, " isA nsIDOMWindow: "+
                (domWindow instanceof Ci.nsIDOMWindow));
        }
    },
};

// ************************************************************************************************

FBTestApp.TestProgress =
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

FBTestApp.TestSummary =
{
    results: [],

    passingTests: {passing: 0, failing: 0},
    failingTests: {passing: 0, failing: 0},

    append: function(test, result)
    {
        this.results.push(result);

        if (test.category == "fails")
        {
            result.pass ? this.failingTests.passing++ : this.failingTests.failing++;

            $("todoTests").value = $STR("fbtest.label.Todo") + ": " +
                this.failingTests.failing + "/" + this.failingTests.passing;
        }
        else
        {
            result.pass ? this.passingTests.passing++ : this.passingTests.failing++;

            if (this.passingTests.passing)
                $("passingTests").value = $STR("fbtest.label.Passing") + ": " +
                    this.passingTests.passing;

            if (this.passingTests.failing)
                $("failingTests").value = $STR("fbtest.label.Failing") + ": " +
                    this.passingTests.failing;
        }
    },

    setMessage: function(message)
    {
        $("progressMessage").value = message;
    },

    onTodoShowTooltip: function(tooltip)
    {
        // xxxHonza: localization
        tooltip.label = "There is " + this.failingTests.failing + " TODO test(s) that failed " +
            "and " + this.failingTests.passing + " TODO test(s) that passed.";
    },

    clear: function()
    {
        this.results = [];
        this.passingTests = {passing: 0, failing: 0};
        this.failingTests = {passing: 0, failing: 0};

        $("passingTests").value = "";
        $("failingTests").value = "";
        $("progressMessage").value = "";
    }
}

// ************************************************************************************************
}});
