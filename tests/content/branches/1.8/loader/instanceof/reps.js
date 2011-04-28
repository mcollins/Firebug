/* See license.txt for terms of usage */

define([], function() {

// ********************************************************************************************* //

var Reps =
{
    instanceOf: function(obj, type)
    {
        return obj instanceof type;
    },

    XW_instanceOf: function(FBL, obj, type)
    {
        return FBL.XW_instanceof(obj, type);
    }
}

// ********************************************************************************************* //

return Reps;

// ********************************************************************************************* //
});
