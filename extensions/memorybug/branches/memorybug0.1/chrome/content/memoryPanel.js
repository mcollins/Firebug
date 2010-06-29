/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Shortcuts

const ReportView = Firebug.MemoryBug.ReportView;

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

        var binary = Firebug.MemoryBug.Profiler.getBinaryComponent();
        var template = binary ? Firebug.MemoryBug.DefaultContent : Firebug.MemoryBug.NoJetpack;
        template.render(this.panelNode);
    },

    show: function(state)
    {
        Firebug.Panel.show.apply(this, arguments);

        this.showToolbarButtons("fbMemoryButtons", true);
    },

    hide: function()
    {
        Firebug.Panel.hide.apply(this, arguments);

        this.showToolbarButtons("fbMemoryButtons", false);
    },

    refresh: function()
    {
        var binary = Firebug.MemoryBug.Profiler.getBinaryComponent();
        if (!binary)
        {
            Firebug.Console.log("Memory Profiler: Required binary component not found! " +
                "One may not be available for your OS and Firefox version.");

            Firebug.MemoryBug.NoJetpack.render(this.panelNode);
            return;
        }

        var profileData = Firebug.MemoryBug.Profiler.profile(this.context);
        this.table = ReportView.render(profileData, this.panelNode);
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
        Firebug.Panel.select.apply(this, arguments);
    },

    updateSelection: function(object)
    {
        try
        {
            this.doUpdateSelection(object);
        }
        catch (e)
        {
            if (FBTrace.DBG_MEMORYBUG || FBTtrace.DBG_ERRORS)
                FBTrace.sysout("memorybug.MemoryPanel.updateSelection; EXCEPTION:", e);
        }
    },

    doUpdateSelection: function(selection)
    {
        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.MemoryPanel.updateSelection; Selection:", selection);

        if (!selection || !(selection instanceof Firebug.MemoryBug.Selection))
            return;

        if (!this.table)
            return;

        if (this.selectedRow)
            removeClass(this.selectedRow, "selected");

        // The passed objects is an instance of MemorySelection, let's get the target JS object.
        var object = selection.object;

        var profileData = this.table.repObject;
        var searcher = new ObjectSearcher(object);
        for (var m in profileData.globals)
        {
            var member = profileData.globals[m];
            var found = searcher.search(member.value);
            if (found)
                break;
        }

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.MemoryPanel.updateSelection; Path: ", searcher.path);

        if (!found)
            return;

        // Expand the view if necessary, select the object and scroll so, it's visible.
        var firstRow = this.table.querySelector(".viewRow");
        for (var p in searcher.path)
        {
            var particle = searcher.path[p];
            while (firstRow)
            {
                if (firstRow.repObject.value === particle.object)
                {
                    if (particle.object === object)
                    {
                        // Alright we have it, select, scroll and bail out.
                        this.selectedRow = firstRow;
                        setClass(firstRow, "selected");
                        scrollIntoCenterView(firstRow);
                        return;
                    }

                    // Open if not opened
                    if (!hasClass(firstRow, "opened"))
                        firstRow = ReportView.toggleRow(firstRow);

                    break;
                }
                firstRow = firstRow.nextSibling;
            }
        }
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
        // The tooltip is not displayed for the last part of the reference (memory) link.
        // The last part of the reference is the object itself (represented by the row).
        if (hasClass(target, "noTooltip"))
            return null;

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
        return object instanceof Firebug.MemoryBug.Selection ||
            object instanceof Firebug.MemoryBug.Member;
    },
});

// ************************************************************************************************

function ObjectSearcher(object, callback)
{
    this.object = object;
    this.objects = new Array();
    this.path = [];
}

ObjectSearcher.prototype =
{
    search: function(parent)
    {
        var length = this.path.push({object: parent});

        if (this.object === parent)
            return true;

        for (var p in parent)
        {
            var value = unwrapObject(parent[p]);
            if (typeof(value) !== "object")
                continue;

            // We have seen this object.
            if (this.objects.indexOf(value) != -1)
                continue;

            // Remember the object.
            this.objects.push(value);

            this.path[length-1].propName = p;

            if (this.search(value))
                return true;
        }

        this.path.pop();
    },
}

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
        panel.refresh();
    },

    render: function(parentNode)
    {
        this.tag.replace({}, parentNode, this);
    }
});

// ************************************************************************************************

/**
 * @domplate Default template displayed within empty Memory panel.
 */
Firebug.MemoryBug.NoJetpack = domplate(Firebug.Rep,
{
    tag:
        TABLE({"class": "memoryProfilerDefaultTable", cellpadding: 0, cellspacing: 0},
            TBODY(
                TR({"class": "memoryProfilerDefaultRow"},
                    TD({"class": "memoryProfilerDefaultCol", onclick: "$onLinkClick"},
                        SPAN({"class": "message"})
                    )
                )
            )
        ),

    onLinkClick: function(event)
    {
        var target = event.target;
        if (target && target.tagName && target.tagName.toLowerCase() == "a")
            openNewTab("https://addons.mozilla.org/cs/firefox/addon/12025");
    },

    render: function(parentNode)
    {
        var table = this.tag.replace({}, parentNode, this);
        var message = table.querySelector(".message");
        message.innerHTML = $STR("memorybug.msg.nojetpack");
    }
});

// ************************************************************************************************
// Registration

Firebug.registerPanel(Firebug.MemoryBug.Panel);
Firebug.registerStringBundle("chrome://memorybug/locale/memorybug.properties");

// ************************************************************************************************
}});
