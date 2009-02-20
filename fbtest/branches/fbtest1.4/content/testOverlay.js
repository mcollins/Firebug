/* See license.txt for terms of usage */

// ************************************************************************************************
// Test Console Overlay Implementation

/**
 * This overlay is only intended to append a context menu into Firebug icon menu.
 * This menu is used to open the Test Console (test runner window).
 */
var FirebugTestConsoleOverlay =
{
    open: function(windowURL)
    {
        var consoleWindow = null;
        FBL.iterateBrowserWindows("FBTestConsole", function(win) {
            consoleWindow = win;
            return true;
        });

        // Try to connect an existing trace-console window first.
        if (consoleWindow) {
            consoleWindow.focus();
            return;
        }

        if (!windowURL)
            windowURL = "chrome://fbtest/content/testConsole.xul";

        var self = this;
        var args = {
            FirebugWindow: window
        };

        consoleWindow = window.openDialog(
            windowURL,
            "FBTestConsole",
            "chrome,resizable,scrollbars=auto,minimizable,dialog=no",
            args);

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.TestConsoleOverlay.open", consoleWindow);
    }
};

// ************************************************************************************************
