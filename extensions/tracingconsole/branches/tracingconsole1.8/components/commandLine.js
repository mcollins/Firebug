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

        window.dump("FBTrace; command line handler INIT\n");

        if (cmdLine.findFlag(CMDLINE_FLAG, false) < 0)
            return;

        try
        {
            // Handle flag with test URI specified. This throws an exception
            // if the parameter isn't specified.
            cmdLine.handleFlag(CMDLINE_FLAG, false);
            this.startOnStartup();
        }
        catch (e)
        {
            window.dump("FBTrace; command line handler EXCEPTION " + e + "\n");
        }
    },

    startOnStartup: function()
    {
        // This info will be used by FBTest overlay as soon as the browser window is loaded.
        this.openFBTraceConsole = true;

        window.dump("FBTrace; Firebug Tracing console will be opened.\n");
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
