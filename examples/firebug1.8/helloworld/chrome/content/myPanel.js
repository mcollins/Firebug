/* See license.txt for terms of usage */

define([
    "firebug/lib/extend",
],
function(Extend) {

// ********************************************************************************************* //
// Panel

var panelName = "helloworld";

function MyPanel() {}
MyPanel.prototype = Extend.extend(Firebug.Panel,
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
});

// ********************************************************************************************* //
// Registration

Firebug.registerPanel(MyPanel);
Firebug.registerStylesheet("chrome://helloworld/skin/helloworld.css");

return MyPanel;

// ********************************************************************************************* //
});
