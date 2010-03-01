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

            // Load the test file the test frame and execute it.
            this.loadTestFrame(this.currentTest);
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

    loadTestFrame: function(test)
    {
        if (!this.browser)
        {
            this.browser = $("testFrame");  // browser in testConsole
            // Hook the load event to run the test in the frameProgressListener
            this.browser.addProgressListener(this.frameProgressListener, Ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
            // we don't remove the progress listener
            FBTestApp.TestRunner.defaultTestTimeout = FBTestApp.TestRunner.getDefaultTestTimeout();
        }

        FBTestApp.TestRunner.loadAndRun = bind(FBTestApp.TestRunner.onLoadTestFrame, FBTestApp.TestRunner, test);

        var testURL = test.path;
        if (/\.js$/.test(testURL))
            testURL = this.wrapJS(testURL); // a data url with script tags for FBTestFirebug.js and the test.path

        // Load the empty test frame
        this.browser.loadURI(testURL);
    },

    frameProgressListener: extend(BaseProgressListener,
    {
        onStateChange: function(progress, request, flag, status)
        {
            if (FBTrace.DBG_FBTEST)
            {
                    FBTrace.sysout("-> frameProgressListener.onStateChanged for: "+safeGetName(request)+
                        ", win: "+progress.DOMWindow.location.href+ " "+getStateDescription(flag));
            }

            if (safeGetName(request) === "about:blank")
                return;

            if (flag & Ci.nsIWebProgressListener.STATE_IS_DOCUMENT && flag & Ci.nsIWebProgressListener.STATE_TRANSFERRING)
            {
                var win = progress.DOMWindow;

                if (FBTestApp.TestRunner.eventListener)
                {
                    try
                    {
                        FBTestApp.TestRunner.win.removeEventListener("load", FBTestApp.TestRunner.eventListener, true);
                    }
                    catch(e)
                    {
                        // I don't understand why we get here
                    }
                }

                FBTestApp.TestRunner.eventListener = FBTestApp.TestRunner.loadAndRun;
                FBTestApp.TestRunner.win = win;

                // Inject FBTest object into the test page before we get to the script tag compiles.
                win.FBTest = FBTestApp.FBTest;
                win.FBTrace = FBTrace;

                win.addEventListener("load", FBTestApp.TestRunner.eventListener, true);

                if (FBTrace.DBG_FBTEST)
                {
                    FBTrace.sysout("-> frameProgressListener.onStateChanged set load handler for: "+safeGetName(request)+
                                ", win: "+progress.DOMWindow.location.href+ " "+getStateDescription(flag));
                }
            }
        }
    }),

    onUnloadTestFrame: function(event)
    {
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("onUnloadTestFrame ", event);
        var testFrame = $("testFrame");
        var outerWindow =  testFrame.contentWindow;

        FBTestApp.TestRunner.win.removeEventListener("load", FBTestApp.TestRunner.eventListener, true);
        delete FBTestApp.TestRunner.eventListener;

        FBTestApp.TestRunner.win.removeEventListener("unload", FBTestApp.TestRunner.onUnloadTestFrame, true);
    },

    getDefaultTestTimeout: function()
    {
        return Firebug.getPref(FBTestApp.prefDomain, "testTimeout");
    },

    /*
     * Called by the 'load' event handler set in the onStateChange for nsIProgressListener
     */
    onLoadTestFrame: function( event, test )
    {
        var testURL = test.path;
        var testTitle = test.desc;
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("FBTest.onLoadTestFrame; url: "+testURL+" win: " +FBTestApp.TestRunner.win+" wrapped: "+FBTestApp.TestRunner.win.wrappedJSObject);

        var win = FBTestApp.TestRunner.win;
        if (win.wrappedJSObject)
            win = win.wrappedJSObject;

        var testDoc = win.document;
        testDoc.title = testTitle;
        var title = win.document.getElementById("testTitle");
        if (title)
            title.innerHTML = testTitle;

        // Hook the unload to clean up
        FBTestApp.TestRunner.win.addEventListener("unload", FBTestApp.TestRunner.onUnloadTestFrame, true);

        // Execute a "runTest" method, that must be implemented within the test driver.
        FBTestApp.TestRunner.runTestCase(win);
    },

    appendScriptTag: function(doc, srcURL)
    {
        var scriptTag = doc.createElementNS("http://www.w3.org/1999/xhtml", "script");
        scriptTag.setAttribute("src", srcURL);
        var body = doc.getElementsByTagName("body")[0];
        body.appendChild(scriptTag);
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("FBTest.appendScriptTag "+srcURL, doc);
    },

    runTestCase: function(win)
    {
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
            //$("testFrame").contentWindow.location = "about:blank";
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

        if (FBTestApp.TestConsole.noTestTimeout)
            return;

        FBTestApp.FBTest.testTimeout = FBTestApp.TestRunner.defaultTestTimeout;
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
            FBTrace.sysout("TestRunner set timeout="+FBTestApp.FBTest.testTimeout+" testTimeoutID "+this.testTimeoutID);
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

        var testFirebugLibURL = FBTestApp.TestConsole.chromeToUrl(
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
                var value = Firebug.getPref(Firebug.prefDomain, prefName);
                if (typeof(value) != 'undefined')
                    this.values[prefName] = value;
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
function safeGetName(request)
{
    try
    {
        return request.name;
    }
    catch (exc)
    {
        return null;
    }
}
// ************************************************************************************************
}});
