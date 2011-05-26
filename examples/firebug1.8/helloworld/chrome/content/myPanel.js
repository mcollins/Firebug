/* See license.txt for terms of usage */

define([
    "firebug/lib/object",
    "firebug/lib/trace",
],
function(Obj, FBTrace) {

// ********************************************************************************************* //
// Panel

var panelName = "helloworld";

function MyPanel() {}
MyPanel.prototype = Obj.extend(Firebug.Panel,
{
    name: panelName,
    title: "Hello World!",

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Initialization

    initialize: function()
    {
        Firebug.Panel.initialize.apply(this, arguments);
    },

    destroy: function(state)
    {
        Firebug.Panel.destroy.apply(this, arguments);
    },

    show: function(state)
    {
        Firebug.Panel.show.apply(this, arguments);

        if (FBTrace.DBG_HELLOWORLD)
            FBTrace.sysout("helloWorld; MyPanel.show");
    }
});

// ********************************************************************************************* //
// Registration

Firebug.registerPanel(MyPanel);
Firebug.registerStylesheet("resource://helloworld/skin/classic/helloworld.css");

return MyPanel;

// ********************************************************************************************* //
});
