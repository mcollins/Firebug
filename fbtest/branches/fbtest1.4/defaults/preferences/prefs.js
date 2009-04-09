pref("extensions.firebug.fbtest.showPass", true);
pref("extensions.firebug.fbtest.showFail", true);
pref("extensions.firebug.fbtest.testTimeout", 10000);      // Break timeout for stuck unit tests, 0 == disabled. [10 sec by default].
pref("extensions.firebug.fbtest.defaultTestSuite", "");
pref("extensions.firebug.fbtest.haltOnFailedTest", false);
pref("extensions.firebug.alwaysOpenTestConsole", false);

// Support for tracing console
pref("extensions.firebug.DBG_FBTEST", false);              // Tracing from FBTest internal framework.
pref("extensions.firebug.DBG_TESTCASE", false);          // Tracing from actual unit-test files.
