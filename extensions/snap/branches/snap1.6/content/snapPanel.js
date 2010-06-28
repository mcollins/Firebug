/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Shortcuts

const ReportView = Firebug.Snap.ReportView;

// ************************************************************************************************
// Snapshots Panel implementation

/**
 * @panel Represents the Snapshots panel, main Snapshotsbug UI.
 */
Firebug.Snap.Panel = function SnapPanel() {}
Firebug.Snap.Panel.prototype = extend(Firebug.Panel,
/** @lends Firebug.Snap.Panel */
{
    name: "snap",
    title: $STR("snap.Snapshots"),

    initialize: function(context, doc)
    {
        Firebug.Panel.initialize.apply(this, arguments);

        appendStylesheet(doc, "snapStyles");

        //var history = Firebug.Snap.getHistory(context);
        var template = Firebug.Snap.Content;
        template.render(this.panelNode);
    },

    show: function(state)
    {
        Firebug.Panel.show.apply(this, arguments);

        this.showToolbarButtons("fbSnapButtons", true);
    },

    hide: function()
    {
        Firebug.Panel.hide.apply(this, arguments);

        this.showToolbarButtons("fbSnapButtons", false);
    },

    refresh: function()
    {
        var binary = Firebug.Snap.Profiler.getBinaryComponent();
        if (!binary)
        {
            Firebug.Console.log("Snapshots Profiler: Required binary component not found! " +
                "One may not be available for your OS and Firefox version.");

            Firebug.Snap.NoJetpack.render(this.panelNode);
            return;
        }

        var profileData = Firebug.Snap.Profiler.profile(this.context);
        this.table = ReportView.render(profileData, this.panelNode);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Selection

    hasObject: function(object)  // beyond type testing, is this object selectable?
    {
        if (FBTrace.DBG_SNAP)
            FBTrace.sysout("snap.SnapshotsPanel.hasObject;", object);

        return false;
    },

    navigate: function(object)
    {
        if (FBTrace.DBG_SNAP)
            FBTrace.sysout("snap.SnapshotsPanel.navigate;", object);
    },

    updateLocation: function(object)  // if the module can return null from getDefaultLocation, then it must handle it here.
    {
        if (FBTrace.DBG_SNAP)
            FBTrace.sysout("snap.SnapshotsPanel.updateLocation;", object);
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
            if (FBTrace.DBG_SNAP || FBTtrace.DBG_ERRORS)
                FBTrace.sysout("snap.SnapshotsPanel.updateSelection; EXCEPTION:", e);
        }
    },

    doUpdateSelection: function(selection)
    {
        if (FBTrace.DBG_SNAP)
            FBTrace.sysout("snap.SnapshotsPanel.updateSelection; Shot:", selection);

        if (!selection || !(selection instanceof Firebug.Snap.Shot))
            return;

        if (!this.table)
            return;

        if (this.selectedRow)
            removeClass(this.selectedRow, "selected");

        // The passed objects is an instance of Snap.Shot, let's get the target JS object.
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

        if (FBTrace.DBG_SNAP)
            FBTrace.sysout("snap.SnapshotsPanel.updateSelection; Path: ", searcher.path);

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
        // The tooltip is not displayed for the last part of the reference (snap) link.
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
        return object instanceof Firebug.Snap.Shot ||
            object instanceof Firebug.Snap.Member;
    },
});


function appendStylesheet(doc)
{
    // Make sure the stylesheet isn't appended twice.
    if (!$("snapStyles", doc))
    {
        var styleSheet = createStyleSheet(doc, "chrome://snap/skin/snap.css");
        styleSheet.setAttribute("id", "snapStyles");
        addStyleSheet(doc, styleSheet);
    }
}

// ************************************************************************************************

/**
 * @domplate Default template displayed within empty Snapshots panel.
 */
Firebug.Snap.Content = domplate(Firebug.Rep,
{
    tag:
        TABLE({"class": "snapTable", cellpadding: 0, cellspacing: 0},
            TBODY(
                TR({"class": "snapShotRow"},
                    TD({"class": "snapShotName"},
                        BUTTON({"class": "snapLoadBtn", onclick: "$loadSnapShot"},
                            $STR("snap.button.loadsnapshot")
                        )
                    )
                )
            )
        ),

    loadSnapShot: function(event)
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
// Registration

Firebug.registerPanel(Firebug.Snap.Panel);
Firebug.registerStringBundle("chrome://snap/locale/snap.properties");

// ************************************************************************************************
}});
