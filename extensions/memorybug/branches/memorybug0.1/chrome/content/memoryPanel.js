/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Memory Panel implementation

/**
 * @panel Represents the Memory panel, main Memorybug UI.
 */
Firebug.MemoryBug.Panel = function MemoryBugPanel() {}
Firebug.MemoryBug.Panel.prototype = extend(Firebug.Panel,
/** @lends Firebug.MemoryBug.Panel */
{
    name: "memory",
    title: $STR("memorybug.Memory"),

    initialize: function(context, doc)
    {
        Firebug.Panel.initialize.apply(this, arguments);

        appendStylesheet(doc, "memoryBugStyles");

        Firebug.MemoryBug.DefaultContent.tag.replace({}, this.panelNode);
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
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Selection

    hasObject: function(object)  // beyond type testing, is this object selectable?
    {
        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.MemoryPanel.hasObject;", object);

        return false;
    },

    navigate: function(object)
    {
        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.MemoryPanel.navigate;", object);
    },

    updateLocation: function(object)  // if the module can return null from getDefaultLocation, then it must handle it here.
    {
        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.MemoryPanel.updateLocation;", object);
    },

    select: function(object, forceUpdate)
    {
        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.MemoryPanel.select;", object);

        Firebug.Panel.select.apply(this, arguments);
    },

    updateSelection: function(object)
    {
        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.MemoryPanel.updateSelection;", object);

        if (!object)
            return;

        /*if (file)
        {
            scrollIntoCenterView(file.row);
            if (!hasClass(file.row, "opened"))
                NetRequestEntry.toggleHeadersRow(file.row);
        }*/
    },

    getDefaultSelection: function(context)
    {
        return null;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Options & Popups

    getOptionsMenuItems: function()
    {
        return null;
    },

    getPopupObject: function(target)
    {
        return Firebug.getRepObject(target);
    },

    getTooltipObject: function(target)
    {
        return Firebug.getRepObject(target);
    },

    showInfoTip: function(infoTip, x, y)
    {

    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Context menu

    getContextMenuItems: function(object, target)
    {
        return [];
    },

    supportsObject: function(object, type)
    {
        return object instanceof Firebug.MemoryBug.MemoryLink;
    },
});

// ************************************************************************************************

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

/**
 * @domplate Default template displayed within empty Memory panel.
 */
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
// Registration

Firebug.registerPanel(Firebug.MemoryBug.Panel);
Firebug.registerStringBundle("chrome://memorybug/locale/memorybug.properties");
Firebug.registerModule(Firebug.MemoryBug);

// ************************************************************************************************
}});
