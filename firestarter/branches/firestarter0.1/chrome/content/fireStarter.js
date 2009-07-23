/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Module implementation

Firebug.FireStarter = extend(Firebug.Module,
{
    initialize: function(prefDomain, prefNames)
    {
        Firebug.Module.initialize.apply(this, arguments);

        this.internationalizeUI();

        if (FBTrace.DBG_STARTER)
            FBTrace.sysout("starter.initialized " + prefDomain, prefNames);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        if (FBTrace.DBG_STARTER)
            FBTrace.sysout("starter.shutdown");
    },

    internationalizeUI: function()
    {
        var elements = ["menu_logAnnotations"];
        for (var i=0; i<elements.length; i++)
        {
            var element = $(elements[i]);
            FBL.internationalize(element, "label");
            FBL.internationalize(element, "tooltiptext");
        }
    }
});

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.FireStarter);

// ************************************************************************************************
}});
