/* See license.txt for terms of usage */

// ************************************************************************************************
// Tracing Console Overlay Implementation

/**
 * This overlay is intended to append a new menu-item into the Firebug's icon menu.
 * This menu is used to open the Tracing Console.
 */
var FBTraceFirebugOverlay = {};

(function() {

var Cc = Components.classes;
var Ci = Components.interfaces;

this.initialize = function()
{
    window.removeEventListener("load", FBTraceFirebugOverlay.initialize, false);

    var cmd = Cc["@mozilla.org/commandlinehandler/general-startup;1?type=FBTrace"].
        getService(Ci.nsICommandLineHandler);

    // Open console if the command line says so or if the pref says so.
    // xxxHonza: implement the pref.
    var cmd = cmd.wrappedJSObject ? cmd.wrappedJSObject : cmd;
    if (cmd.openFBTraceConsole)
        FBTraceFirebugOverlay.openConsole(cmd.testListURI);
};

this.onToggleOption = function(target)
{
    FirebugChrome.onToggleOption(target);

    // Open automatically if set to "always open", close otherwise.
    if (Firebug.Options.getPref(Firebug.prefDomain, "alwaysOpenTraceConsole"))
        this.openConsole();
    else
        this.closeConsole();
};

this.openConsole = function(prefDomain, windowURL)
{
    if (!prefDomain)
        prefDomain = this.prefDomain;

    var self = this;
    FBL.iterateBrowserWindows("FBTraceConsoleX", function(win) {
        if (win.TraceConsole && win.TraceConsole.prefDomain == prefDomain) {
            self.consoleWindow = win;
            return true;
        }
    });

    // Try to connect an existing trace-console window first.
    if (this.consoleWindow && this.consoleWindow.TraceConsole) {
        this.consoleWindow.focus();
        return;
    }

    if (!windowURL)
        windowURL = this.getTraceConsoleURL();

    if (FBTrace.DBG_OPTIONS)
        FBTrace.sysout("traceModule.openConsole, prefDomain: " + prefDomain);

    var self = this;
    var args = {
        prefDomain: prefDomain,
    };

    if (FBTrace.DBG_OPTIONS) {
        for (var p in args)
            FBTrace.sysout("tracePanel.openConsole prefDomain:" +
                prefDomain +" args["+p+"]= "+ args[p]+"\n");
    }

    this.consoleWindow = window.openDialog(
        windowURL,
        "FBTraceConsole." + prefDomain,
        "chrome,resizable,scrollbars=auto,minimizable,dialog=no",
        args);
},

this.closeConsole = function(prefDomain)
{
    if (!prefDomain)
        prefDomain = this.prefDomain;

    var consoleWindow = null;
    FBL.iterateBrowserWindows("FBTraceConsoleX", function(win) {
        if (win.TraceConsole && win.TraceConsole.prefDomain == prefDomain) {
            consoleWindow = win;
            return true;
        }
    });

    if (consoleWindow)
        consoleWindow.close();
},

this.getTraceConsoleURL = function()
{
    return "chrome://tracingconsole/content/traceConsole.xul";
}

// Register load listener for command line arguments handling.
window.addEventListener("load", FBTraceFirebugOverlay.initialize, false);

}).apply(FBTraceFirebugOverlay);

// ************************************************************************************************
