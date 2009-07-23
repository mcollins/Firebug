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

        if (FBTrace.DBG_STARTER)
            FBTrace.sysout("starter.initialize " + prefDomain, prefNames);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        if (FBTrace.DBG_STARTER)
            FBTrace.sysout("starter.shutdown");
    }
});

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.FireStarter);

// ************************************************************************************************
}});
