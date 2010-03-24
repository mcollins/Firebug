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

Firebug.MemoryBug = extend(Firebug.Module,
{
    initialize: function(prefDomain, prefNames)
    {
        Firebug.Module.initialize.apply(this, arguments);

        // Initialize MemoryBug preferences in Firebug global object.
        for (var i=0; i<mbPrefNames.length; i++)
            Firebug[mbPrefNames[i]] = Firebug.getPref(prefDomain, mbPrefNames[i]);

        if (Firebug.TraceModule)
            Firebug.TraceModule.addListener(this.TraceListener);

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.initialized " + prefDomain, prefNames);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        if (Firebug.TraceModule)
            Firebug.TraceModule.removeListener(this.TraceListener);

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.shutdown");
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

function MemoryBugPanel() {}
MemoryBugPanel.prototype = extend(Firebug.Panel,
{
    name: "memory",
    title: $STR("memorybug.Memory"),

    initialize: function(context, doc)
    {
        Firebug.Panel.initialize.apply(this, arguments);

        appendStylesheet(doc, "memoryBugStyles");
    },

    show: function(state)
    {
        Firebug.Panel.show.apply(this, arguments);

        this.showToolbarButtons("fbMemoryButtons", true);

        this.refresh();
    },

    hide: function()
    {
        Firebug.Panel.hide.apply(this, arguments);

        this.showToolbarButtons("fbMemoryButtons", false);
    },

    refresh: function()
    {
        Firebug.MemoryBug.DefaultContent.tag.replace({}, this.panelNode);
    }
});

// ************************************************************************************************

Firebug.MemoryBug.DefaultContent = domplate(Firebug.Rep,
{
    tag:
        TABLE({"class": "memoryProfilerDefaultTable", cellpadding: 0, cellspacing: 0},
            TBODY(
                TR({"class": "memoryProfilerDefaultRow"},
                    TD({"class": "memoryProfilerDefaultCol"},
                        BUTTON({"class": "memoryProfilerDefaultBtn", onclick: "$onRefresh"},
                            $STR("memorybug.button.memorysnapshot")
                        )
                    )
                )
            )
        ),

    onRefresh: function(event)
    {
        var panel = Firebug.getElementPanel(event.target);
        Firebug.MemoryBug.Profiler.profile(panel.context);
    }
});

// ************************************************************************************************

Firebug.MemoryBug.TraceListener = 
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

function appendStylesheet(doc)
{
    // Make sure the stylesheet isn't appended twice.
    if (!$("memoryBugStyles", doc))
    {
        var styleSheet = createStyleSheet(doc, "chrome://memorybug/skin/memorybug.css");
        styleSheet.setAttribute("id", "memoryBugStyles");
        addStyleSheet(doc, styleSheet);
    }
}

// ************************************************************************************************
// Registration

Firebug.registerPanel(MemoryBugPanel);
Firebug.registerStringBundle("chrome://memorybug/locale/memorybug.properties");
Firebug.registerModule(Firebug.MemoryBug);

// ************************************************************************************************
}});
