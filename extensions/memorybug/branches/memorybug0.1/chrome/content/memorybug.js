/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// Memorybug preferences.
const mbPrefNames =
[
];

// ************************************************************************************************

Firebug.registerStringBundle("chrome://memorybug/locale/memorybug.properties");

// ************************************************************************************************
// Module implementation

/**
 * @module Represents Memorybug model responsible for standard initialization such as
 * internationalization of respective UI.
 */
Firebug.MemoryBug = extend(Firebug.Module,
/** @lends Firebug.MemoryBug */
{
    initialize: function(prefDomain, prefNames)
    {
        // Registers tracing listener for trace logs customization.
        if (Firebug.TraceModule)
            Firebug.TraceModule.addListener(this.TraceListener);

        Firebug.Module.initialize.apply(this, arguments);

        // Initialize MemoryBug preferences in Firebug global object.
        for (var i=0; i<mbPrefNames.length; i++)
            Firebug[mbPrefNames[i]] = Firebug.getPref(prefDomain, mbPrefNames[i]);

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.initialized " + prefDomain, prefNames);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.shutdown");

        if (Firebug.TraceModule)
            Firebug.TraceModule.removeListener(this.TraceListener);
    },

    internationalizeUI: function(doc)
    {
        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.internationalizeUI");

        var elements = ["mbRefresh"];
        for (var i=0; i<elements.length; i++)
        {
            var element = $(elements[i], doc);
            FBL.internationalize(element, "label");
            FBL.internationalize(element, "tooltiptext");
        }
    },

    refresh: function(context)
    {
        Firebug.MemoryBug.Profiler.profile(context);
    },
});

// ************************************************************************************************

/**
 * @class Implements a tracing listener responsible for colorization of all trace logs
 * coming from this extension. All logs should use "memorybug." prefix.
 */
Firebug.MemoryBug.TraceListener = 
/** @lends Firebug.MemoryBug.TraceListener */
{
    onLoadConsole: function(win, rootNode)
    {
        var doc = rootNode.ownerDocument;
        var styleSheet = createStyleSheet(doc, 
            "chrome://memorybug/skin/memorybug.css");
        styleSheet.setAttribute("id", "MemoryBugLogs");
        addStyleSheet(doc, styleSheet);
    },

    onDump: function(message)
    {
        var index = message.text.indexOf("memorybug.");
        if (index == 0)
            message.type = "DBG_MEMORYBUG";
    }
};

// ************************************************************************************************
// Registration

Firebug.registerPanel(MemoryBugPanel);
Firebug.registerStringBundle("chrome://memorybug/locale/memorybug.properties");
Firebug.registerModule(Firebug.MemoryBug);

// ************************************************************************************************
}});
