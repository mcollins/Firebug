/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

var autoExportButton = $("netExportAuto");

// ************************************************************************************************
// Controller for automatic export.

Firebug.NetExport.Automation = extend(Firebug.Module,
{
    active: false,

    initialize: function(owner)
    {
        
    },

    shutdown: function()
    {
        
    },

    initContext: function(context)
    {
        context.netExport.autoExport = this.active;
    },

    destroyContext: function(context)
    {
        
    },

    showPanel: function(browser, panel)
    {
        if (panel.name == "net")
            this.updateUI();
    },

    // Activation
    isActive: function()
    {
        return this.active;
    },

    activate: function()
    {
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Automation: Auto export activated.");

        this.active = true;
        this.updateUI();
    },

    deactivate: function()
    {
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Automation: Auto export deactivated.");

        this.active = false;
        this.updateUI();
    },

    updateUI: function()
    {
        autoExportButton.setAttribute("state", this.active ? "active" : "inactive");
        autoExportButton.setAttribute("tooltiptext", this.active ?
            $STR("netexport.menu.tooltip.Deactivate Auto Export") :
            $STR("netexport.menu.tooltip.Activate Auto Export"));
    }
});

// ************************************************************************************************

Firebug.registerModule(Firebug.NetExport.Automation);

// ************************************************************************************************
}});
