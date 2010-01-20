/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Module implementation

/**
 * This module implements an Export feature that allows to save all Net panel
 * data into a file using HTTP Archive format.
 * http://groups.google.com/group/firebug-working-group/web/http-tracing---export-format
 */
Firebug.NetExport = extend(Firebug.Module,
{
    initialize: function(owner)
    {
        Firebug.Module.initialize.apply(this, arguments);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);
    },

    internationalizeUI: function(doc)
    {
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.internationalizeUI");

        var elements = ["netExport", "netExportCompress", "netExportAuto", "netExportLogDir"];
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
        context.netExport = {};
    },

    // Handle Export toolbar button.
    exportData: function(context)
    {
        this.Exporter.exportData(context);
    },

    // Handle Import toolbar button.
    importData: function(context)
    {
        alert("TBD");
    },

    // Options
    onToggleOption: function(event, menuitem)
    {
        FirebugChrome.onToggleOption(menuitem);

        // Don't bubble up so, the main command (executed when the menu-button
        // itself is pressed) is not fired.
        cancelEvent(event);
    },

    onDefaultLogDirectory: function(event)
    {
        cancelEvent(event);
    },

    // Auto export
    toggleAutoExport: function(context)
    {
        if (this.Automation.isActive())
            this.Automation.deactivate();
        else
            this.Automation.activate();
    }
});

// ************************************************************************************************
// Registration

Firebug.registerStringBundle("chrome://netexport/locale/netExport.properties");
Firebug.registerModule(Firebug.NetExport);

// ************************************************************************************************
}});
