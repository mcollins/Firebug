/* See license.txt for terms of usage */

// ************************************************************************************************
// Constants

const CLASS_ID = Components.ID("{F483275E-ECC6-4028-B375-92498C0AD76F}");
const CLASS_NAME = "FBTest Command Line Handler";
const CONTRACT_ID = "@mozilla.org/commandlinehandler/general-startup;1?type=FBTest";
const CLD_CATEGORY = "m-FBTest";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const categoryManager = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
const appShellService = Cc["@mozilla.org/appshell/appShellService;1"].getService(Ci.nsIAppShellService);

const CMDLINE_FLAG = "runFBTests";

// ************************************************************************************************
// Command Line Handler

var CommandLineHandler =
{
    runFBTests: false,
    testListURI: null,

    /* nsISupports */
    QueryInterface: function(iid)
    {
        if (iid.equals(Ci.nsICommandLineHandler) ||
            iid.equals(Ci.nsIFactory) ||
            iid.equals(Ci.nsISupports))
            return this;

        throw Cr.NS_ERROR_NO_INTERFACE;
    },

    /* nsICommandLineHandler */
    handle: function(cmdLine)
    {
        window = appShellService.hiddenDOMWindow;

        if (cmdLine.findFlag(CMDLINE_FLAG, false) < 0)
            return;

        try
        {
            // Handle flag with test URI specified. This throws an exception
            // if the parameter isn't specified.
            var testListURI = cmdLine.handleFlagWithParam(CMDLINE_FLAG, false);
            this.startOnStartup(testListURI);
        }
        catch (e)
        {
            // So, the parameter isn't probably there. Try to handle at least the flag.
            // The default test list URI will be used.
            if (cmdLine.handleFlag(CMDLINE_FLAG, false))
                 this.startOnStartup(null);
        }
    },

    startOnStartup: function(testListURI)
    {
        if (!testListURI)
            window.dump("FBTest; No test list URI specified.");

        // This info will be used by FBTest overlay as soon as the browser window is loaded.
        this.runFBTests = true;
        this.testListURI = testListURI;

        window.dump("FBTest; FBTests will be executed as soon as Firefox is ready.\n");
        window.dump("FBTest; Test List URI: " + testListURI + "\n");
    },

    // The text should have embedded newlines which wrap at 76 columns, and should include
    // a newline at the end. By convention, the right column which contains flag descriptions
    // begins at the 24th character.
    // xxxHonza: weird is that if I run Firefox with -help parameter the second column
    // begins on 33th character.
    helpInfo: "  -" + CMDLINE_FLAG + " <test-list-uri>   Automatically run all Firebug tests \n" +
              "                                chrome://firebug/content/testList.html\n",

    /* nsIFactory */
    createInstance: function (outer, iid)
    {
        if (outer != null)
            throw Cr.NS_ERROR_NO_AGGREGATION;

        this.wrappedJSObject = this;
        return this.QueryInterface(iid);
    },

    lockFactory: function(lock)
    {
    }
};

// ************************************************************************************************
// Module implementation

var CommandLineModule =
{
    QueryInterface: function(iid)
    {
        if (iid.equals(Ci.nsIModule) ||
            iid.equals(Ci.nsISupports))
            return this;

        throw Cr.NS_ERROR_NO_INTERFACE;
    },

    /* nsIModule */
    getClassObject: function(compMgr, cid, iid)
    {
        if (cid.equals(CLASS_ID))
            return CommandLineHandler.QueryInterface(iid);

        throw Cr.NS_ERROR_NOT_REGISTERED;
    },

    registerSelf: function(compMgr, fileSpec, location, type)
    {
        compMgr.QueryInterface(Ci.nsIComponentRegistrar);
        compMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME,
            CONTRACT_ID, fileSpec, location, type);

        categoryManager.addCategoryEntry("command-line-handler",
            CLD_CATEGORY, CONTRACT_ID, true, true);
      },

    unregisterSelf: function(compMgr, location, type)
    {
        compMgr.QueryInterface(Ci.nsIComponentRegistrar);
        compMgr.unregisterFactoryLocation(CLASS_ID, location);

        categoryManager.deleteCategoryEntry("command-line-handler", CLD_CATEGORY);
    },

    canUnload: function(compMgr)
    {
        return true;
    }
};

// ************************************************************************************************

function NSGetModule(comMgr, fileSpec)
{
    return CommandLineModule;
}
