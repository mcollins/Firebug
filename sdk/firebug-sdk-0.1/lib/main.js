/* See license.txt for terms of usage */

var Firebug = require("firebug");
var Panel = require("firebug-panel").Panel;
var FBTrace = require("firebug-trace").FBTrace;
var FBL = require("firebug-lib").FBL;

// ************************************************************************************************
// Custom Panel

FBTrace.sysout("Hello from my FirebugPack extension");

function MyPanel() {}
MyPanel.prototype = FBL.extend(Panel,
{
    name: "myPanel",
    title: "My Panel",

    initialize: function()
    {
        Panel.initialize.apply(this, arguments);

        FBTrace.sysout("MyPanel.initialize;");

        template.tag.replace({}, this.panelNode);
    },

    destroy: function()
    {
        Panel.destroy.apply(this, arguments);

        FBTrace.sysout("MyPanel.initialize;");
    }
})

// ************************************************************************************************
// Registration

Firebug.registerPanel(MyPanel);

