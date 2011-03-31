/* See license.txt for terms of usage */

// ********************************************************************************************* //
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const categoryManager = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
const appShellService = Cc["@mozilla.org/appshell/appShellService;1"].getService(Ci.nsIAppShellService);

const CMDLINE_FLAG = "fbtrace";

Components.utils["import"]("resource://gre/modules/XPCOMUtils.jsm");

// ********************************************************************************************* //
// Command Line Handler

function CommandLineHandler()
{
    this.wrappedJSObject = this;
};

CommandLineHandler.prototype =
{
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // XPCOM

    classID: Components.ID("{FBDD01C3-6D09-494c-B086-C5D56F346658}"),
    classDescription: "FBTrace Command Line Handler",
    contractID: "@mozilla.org/commandlinehandler/general-startup;1?type=FBTrace",

    QueryInterface: XPCOMUtils.generateQI([
        Ci.nsISupports,
        Ci.nsICommandLineHandler
    ]),

    _xpcom_categories: [{
        category: "command-line-handler",
        entry: "_firebugtracing",
    }],

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // nsICommandLineHandler

    openFBTraceConsole: false,

    handle: function(cmdLine)
    {
        window = appShellService.hiddenDOMWindow;

        if (cmdLine.findFlag(CMDLINE_FLAG, false) < 0)
            return;

        try
        {
            // Handle flag with preference domain specified. This throws an exception
            // if the parameter isn't specified.
            var prefDomain = cmdLine.handleFlagWithParam(CMDLINE_FLAG, false);
            this.openConsole(window, prefDomain);
        }
        catch (e)
        {
            // So, the parameter isn't probably there. Try to handle at least the flag.
            // The default pref domain is used.
            if (cmdLine.handleFlag(CMDLINE_FLAG, false))
                this.openConsole(window, "extensions.firebug");
        }

        try
        {
            // Handle flag with test URI specified. This throws an exception
            // if the parameter isn't specified.
        }
        catch (e)
        {
            window.dump("FBTrace; command line handler EXCEPTION " + e + "\n");
        }
    },

    openConsole: function(window, prefDomain)
    {
        // This info will be used by FBTest overlay as soon as the browser window is loaded.
        this.openFBTraceConsole = true;

        var releaser =
        {
            url: "chrome://tracingconsole/content/blocker.xul",
            unblock: null, // set by blocker.xul, called by TraceConsole.xul
            prefDomain: prefDomain,
        }

        var tracingWindow = this.openWindow(window, "FBTraceConsoleX",
            "chrome://tracingconsole/content/traceConsole.xul", releaser);

        // Open blocker window (to block Chromebug or browser window opening till
        // the tracin console window is ready to receive logs).
        win = window.openDialog(releaser.url, "_blank",
            "modal,resizable,dialog=no,centerscreen",
            releaser);

        window.dump("FBTrace; Command line: The tracing console window should be fulle ready now!\n\n");

        return tracingWindow;
    },

    openWindow: function(window, windowType, url, params)
    {
        var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
        var win = wm.getMostRecentWindow(windowType);

        if (win)
        {
            if ("initWithParams" in win)
                win.initWithParams(params);

            win.focus();
        }
        else
        {
            win = window.openDialog(url, "_blank",
                "chrome,resizable,scrollbars=auto,minimizable,dialog=no",
                params);
        }

        return win;
    },

    // The text should have embedded newlines which wrap at 76 columns, and should include
    // a newline at the end. By convention, the right column which contains flag descriptions
    // begins at the 24th character.
    // xxxHonza: weird is that if I run Firefox with -help parameter the second column
    // begins on 33th character.
    helpInfo: "  -" + CMDLINE_FLAG + " Open Firebug Tracing console \n"
};

// ********************************************************************************************* //

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([CommandLineHandler]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([CommandLineHandler]);

// ********************************************************************************************* //
