/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

const extensionManager = CCSV("@mozilla.org/extensions/manager;1", "nsIExtensionManager");

// ************************************************************************************************
// Module implementation

/**
 *
 */
Firebug.BugPilot = extend(Firebug.Module,
{
    initialize: function(owner)
    {
        Firebug.Module.initialize.apply(this, arguments);

        if (Firebug.TraceModule)
            Firebug.TraceModule.addListener(this.TraceListener);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        if (Firebug.TraceModule)
            Firebug.TraceModule.removeListener(this.TraceListener);
    },

    internationalizeUI: function(doc)
    {
        if (FBTrace.DBG_BUGPILOT)
            FBTrace.sysout("bugpilot.internationalizeUI");

        var elements = ["bugPilotMenu", "bugPilotSendReport", "bugPilotAbout",
            "bugPilotHelp"];

        for (var i=0; i<elements.length; i++)
        {
            var element = $(elements[i], doc);
            FBL.internationalize(element, "label");
            FBL.internationalize(element, "tooltiptext");
            FBL.internationalize(element, "buttontooltiptext");
        }
    },

    initContext: function(context)
    {
        context.bugPilot = {};
    },

    onSendReport: function()
    {
        //xxxHonza: send collected data.
    },

    onHelp: function(event)
    {
        // xxxHonza: create wiki page with documentation
        //openNewTab("http://getfirebug.com/wiky/bugpilot");
    },

    onAbout: function(context)
    {
        var parent = context.chrome.window;
        parent.openDialog("chrome://mozapps/content/extensions/about.xul", "",
            "chrome,centerscreen,modal", "urn:mozilla:item:bugpilot@getfirebug.com",
            extensionManager.datasource);
    },
});

// ************************************************************************************************

Firebug.BugPilot.TraceListener =
{
    onLoadConsole: function(win, rootNode)
    {
        var doc = rootNode.ownerDocument;
        var styleSheet = createStyleSheet(doc, 
            "chrome://bugpilot/skin/bugPilot.css");
        styleSheet.setAttribute("id", "bugPilotLogs");
        addStyleSheet(doc, styleSheet);
    },

    onDump: function(message)
    {
        var index = message.text.indexOf("bugpilot.");
        if (index == 0)
            message.type = "DBG_BUGPILOT";
    }
};

// ************************************************************************************************
// Registration

Firebug.registerStringBundle("chrome://bugpilot/locale/bugPilot.properties");
Firebug.registerModule(Firebug.BugPilot);

// ************************************************************************************************
}});
