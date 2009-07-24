/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Black and White lists implementation

Firebug.FireStarter.Lists = function()
{
    this.blackList = [];
    this.whiteList = [];
}

// ************************************************************************************************
// Black and White lists template

Firebug.FireStarter.ListsRep = domplate(Firebug.Rep,
{
    className: "fireStarter-lists",

    tag: null,

    supportsObject: function(object)
    {
        return (object instanceof Firebug.FireStarter.Lists);
    },

    getRealObject: function(event, context)
    {
        return null;
    },

    getContextMenuItems: function(event)
    {
        return null;
    }
});

// ************************************************************************************************
// Registration

Firebug.registerRep(Firebug.FireStarter.ListsRep);

// ************************************************************************************************
}});
