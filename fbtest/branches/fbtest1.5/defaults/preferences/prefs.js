pref("extensions.fbtest.showPass", true);
pref("extensions.fbtest.showFail", true);
pref("extensions.fbtest.testTimeout", 10000);      // Break timeout for stuck unit tests, 0 == disabled. [10 sec by default].
pref("extensions.fbtest.defaultTestSuite", "");
pref("extensions.fbtest.defaultTestcaseServer", "");
pref("extensions.fbtest.haltOnFailedTest", false);
pref("extensions.firebug.alwaysOpenTestConsole", false); //xxxHonza: set by Firebug, but must not be part of Firebug branche.
pref("extensions.fbtest.randomTestSelection", false);
pref("extensions.fbtest.history", "");
pref("extensions.fbtest.serverHistory", "http://getfirebug.com/tests/content/,http://localhost:7080/");

// Support for tracing console
pref("extensions.firebug.DBG_FBTEST", false);            // Tracing from FBTest internal framework.
pref("extensions.firebug.DBG_TESTCASE", false);          // Tracing from actual unit-test files.

// Support for shortcuts
pref("extensions.firebug.key.shortcut.openTestConsole", "shift t");
