/* See license.txt for terms of usage */

FBTestApp.ns(function() { with (FBL) {

// ************************************************************************************************
// Test Console Implementation

var Cc = Components.classes;
var Ci = Components.interfaces;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);

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
        // Get current URLs from the UI. The user could change it after
        // the test has been loaded.
        FBTestApp.TestConsole.updatePaths();

        // Update history
        FBTestApp.TestConsole.appendToHistory(null,
            FBTestApp.TestConsole.testCasePath,
            FBTestApp.TestConsole.driverBaseURI);

        tests = cloneArray(tests);

        FBTestApp.Preferences.save();
        FBTestApp.TestSummary.clear();
        FBTestApp.TestProgress.start(tests.length);

        this.startTime = (new Date()).getTime();
        this.testCount = tests.length;
        this.onFinishCallback = onFinishCallback;
        this.testQueue = tests;
        this.runTest(this.getNextTest());
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
            this.currentTest.onStartTest(FBTestApp.TestConsole.driverBaseURI);

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
        // testDone maybe called in an event handler which may need to complete before we clean up
        var self = this;
        setTimeout( function delayTestDone(){self.testDoneOnDelay.apply(self, [canceled]);} );

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.TestRunner.testDone: " + this.currentTest.path,
                this.currentTest);
    },

    testDoneOnDelay: function(canceled)
    {
        if (this.currentTest)
        {
            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.TestRunner.Test END: " + this.currentTest.path,
                    this.currentTest);

            this.currentTest.end = this.currentTest.isManual ? this.currentTest.end : (new Date()).getTime();
            this.currentTest.onTestDone();
            this.currentTest = null;
        }

        if (FBTrace.DBG_FBTEST && canceled)
            FBTrace.sysout("fbtest.TestRunner.CANCELED");

        // Test is done so, clear the break-timeout.
        FBTestApp.TestRunner.cleanUp();

        // If there are tests in the queue, execute them.
        if (this.testQueue && this.testQueue.length)
        {
            FBTestApp.TestProgress.update(this.testQueue.length);
            this.runTest(this.getNextTest());
            return;
        }

        // Otherwise the test-suite (could be also a single test) is finished.
        FBTestApp.TestProgress.stop();

        // Show elapsed time when running more than one test (entire suite or group of tests).
        if (this.startTime)
        {
            this.endTime = (new Date()).getTime();
            var elapsedTime = this.endTime - this.startTime;
            var message = "Elapsed Time: " + formatTime(elapsedTime) +
                " (" + this.testCount + " test cases)";
            this.startTime = null;

            FBTestApp.TestSummary.setMessage(message);
            FBTestApp.FBTest.sysout("FBTest Suite Finished: " + message);
        }

        // Preferences could be changed by tests so restore the previous values.
        FBTestApp.Preferences.restore();

        // Execute callback to notify about finished test suit (used e.g. for
        // Firefox shutdown if test suite is executed from the command line).
        if (this.onFinishCallback)
            this.onFinishCallback(canceled);
        this.onFinishCallback = null;
    },

    manualVerify: function(verifyMsg, instructions, cleanupHandler)
    {
        if (!this.currentTest)
            return;

        if (FBTrace.DBG_FBTEST)
        {
            FBTrace.sysout("fbtest.TestRunner.Test manualVerify: " + verifyMsg + " " + this.currentTest.path,
                this.currentTest);
        }

        // Test is done so, clear the break-timeout.
        this.clearTestTimeout();

        this.currentTest.isManual = true;
        this.currentTest.cleanupHandler = cleanupHandler;
        this.currentTest.end = (new Date()).getTime();

        // If the test is currently opened, append the result directly into the UI.
        FBTestApp.TestList.expandTest(this.currentTest.row);

        var infoBodyRow = this.currentTest.row.nextSibling;
        var table = FBL.getElementByClass(infoBodyRow, "testResultTable");
        if (!table)
            table = FBTestApp.TestResultRep.tableTag.replace({}, infoBodyRow.firstChild);

        var tbody = table.firstChild;
        var verify = FBTestApp.TestResultRep.manualVerifyTag.insertRows(
            {test: this.currentTest, verifyMsg: verifyMsg, instructions: instructions}, tbody.lastChild ? tbody.lastChild : tbody)[0];
        scrollIntoCenterView(verify);

        this.currentTest.onManualVerify(verifyMsg, instructions);
    },

    getNextTest: function()
    {
        var randomSelection = Firebug.getPref(FBTestApp.prefDomain, "randomTestSelection");
        if (randomSelection)
        {
            var index = (Math.floor(Math.random() * this.testQueue.length));
            return this.testQueue.splice(index, 1)[0];
        }

        return this.testQueue.shift();
    },

    loadTestFrame: function(testURL)
    {
        var testFrame = $("testFrame");
        var outerWindow =  testFrame.contentWindow;
        var doc = outerWindow.document;

        FBTestApp.TestRunner.removePreviousFrames(doc);

        // Create a new frame for this test.
        var testCaseIframe = doc.createElementNS("http://www.w3.org/1999/xhtml", "iframe");
        testCaseIframe.setAttribute("src", "about:blank");
        testCaseIframe.setAttribute("id", "testFrame");
        var body = doc.getElementsByTagName("body")[0];
        body.appendChild(testCaseIframe);

        // Set default timeout for the test.
        FBTestApp.FBTest.testTimeout = this.getDefaultTestTimeout();

        // Now hook the load event, so the next src= will trigger it.
        testCaseIframe.addEventListener("load", FBTestApp.TestRunner.onLoadTestFrame, true);
        testCaseIframe.addEventListener("unload", FBTestApp.TestRunner.onUnloadTestFrame, true);
        // Load or reload the test page
        testCaseIframe.setAttribute("src", testURL);
    },

    removePreviousFrames: function(doc)
    {
        // Clean up previous test if any.
        var testCaseIframe = null;
        var frames = doc.getElementsByTagName("iframe");
        for (var i = 0; i < frames.length; i++)
        {
            testCaseIframe = frames[i];
            var event = testCaseIframe.contentDocument.createEvent("Event");
            event.initEvent("FBTestCleanup", true, false); // bubbles and not cancelable

            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("Firing FBTestCleanup at "+testCaseIframe.contentDocument+" "+testCaseIframe.contentDocument.location);

            testCaseIframe.contentDocument.dispatchEvent(event);

            if (FBTrace.DBG_FBTEST)
            {
                FBTrace.sysout("Fired FBTestCleanup at "+testCaseIframe.contentDocument+" "+testCaseIframe.contentDocument.location);
                FBTrace.sysout("Removing testCaseIFrame "+testCaseIframe, testCaseIframe);
            }

            testCaseIframe.parentNode.removeChild(testCaseIframe);
        }
    },

    onUnloadTestFrame: function(event)
    {
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("onUnloadTestFrame ", event);
    },

    getDefaultTestTimeout: function()
    {
        return Firebug.getPref(FBTestApp.prefDomain, "testTimeout");
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
        win.FBTest = FBTestApp.FBTest;

        // As soon as the window is loaded, execute a "runTest" method, that must be
        // implemented within the test file.
        win.addEventListener('load', FBTestApp.TestRunner.runTestCase, true);
    },

    runTestCase: function(event)
    {
        FBTrace.sysout("testRunner driverBaseURI:"+FBTestApp.TestConsole.driverBaseURI+" testCasePath: "+FBTestApp.TestConsole.testCasePath)
        var testDoc = event.target;
        var win = testDoc.defaultView;

        win.removeEventListener('load', FBTestApp.TestRunner.runTestCase, true);

        // Start timeout that breaks stuck tests.
        FBTestApp.TestRunner.setTestTimeout(win);

        // Initialize start time.
        FBTestApp.TestRunner.currentTest.start = (new Date()).getTime();

        try
        {
            // Initialize test environment.
            win.FBTest.setToKnownState();

            // Execute test's entry point.
            win.runTest();
        }
        catch (exc)
        {
            FBTestApp.FBTest.sysout("runTest FAILS "+exc, exc);
            FBTestApp.FBTest.ok(false, "runTest FAILS "+exc);
            FBTestApp.TestRunner.cleanUp();

            FBTestApp.TestRunner.testDone(true);
        }

        // If we don't get an exception the test should call testDone() or the testTimeout will fire
    },

    cleanUp: function()
    {
        try
        {
            FBTestApp.TestRunner.clearTestTimeout();
            var doc = $("testFrame").contentWindow.document;
            FBTestApp.TestRunner.removePreviousFrames(doc);
        }
        catch(e)
        {
            FBTrace.sysout("testRunner.cleanUp FAILS "+e, e);
        }
    },

    setTestTimeout: function(win)
    {
        if (this.testTimeoutID)
            this.clearTestTimeout();

        // Use test timeout from the test driver window if any. This is how
        // a test can override the default value.
        if (win && typeof(win.FBTestTimeout) != "undefined")
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

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("TestRunner set testTimeoutID "+this.testTimeoutID);
    },

    clearTestTimeout: function()
    {
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("TestRunner clear testTimeoutID "+this.testTimeoutID);
        if (this.testTimeoutID)
        {
            clearTimeout(this.testTimeoutID);
            this.testTimeoutID = 0;
        }
    },

    wrapJS: function(jsURL)
    {
        const wrapperURL = "chrome://fbtest/content/wrapAJSFile.html";
        if (!this.wrapAJSFile)
            this.wrapAJSFile = getResource(wrapperURL);

        var testFirebugLibURL = FBTestApp.TestServer.chromeToUrl(
            "chrome://fbtest/content/FBTestFirebug.js");

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.wrapJS; Firebug lib file: " + testFirebugLibURL);

        var wrapAJSFile = new String(this.wrapAJSFile);
        var temp = wrapAJSFile.replace("__TestDriverURL__", jsURL).
            replace("__FBTestFirebugURL__",  testFirebugLibURL);

        var testURL = getDataURLForContent(temp, wrapperURL);
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("wrapJS converted "+jsURL, unescape(testURL));

        return testURL;
    },

    appendResult: function(result)
    {
        if (!this.currentTest)
        {
            FBTrace.sysout("test result came in after testDone!", result);
            $("progressMessage").value = "test result came in after testDone!";
            FBTestApp.TestRunner.cleanUp();
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
    },

    dumpSummary: function()
    {
        FBTestApp.FBTest.sysout("Passed: " + this.passingTests.passing);
        FBTestApp.FBTest.sysout("Failed: " + this.passingTests.failing);
    }
}

// ************************************************************************************************

FBTestApp.Preferences =
{
    values : [],

    save: function()
    {
        this.values = [];

        var preferences = prefs.getChildList(Firebug.prefDomain, {});
        for (var i=0; i<preferences.length; i++)
        {
            var prefName = preferences[i].substr(Firebug.prefDomain.length + 1);
            if (prefName.indexOf("DBG_") == -1 &&
                prefName.indexOf("filterSystemURLs") == -1)
            {
                this.values[prefName] = Firebug.getPref(Firebug.prefDomain, prefName);
            }
        }
    },

    restore: function()
    {
        if (!this.values)
            return;

        for (var prefName in this.values)
            Firebug.setPref(Firebug.prefDomain, prefName, this.values[prefName]);

        this.values = [];
    }
}

// ************************************************************************************************
}});
