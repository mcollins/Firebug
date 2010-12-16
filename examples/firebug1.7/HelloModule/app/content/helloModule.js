/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) { 

// ********************************************************************************************* //
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cu = Components.utils;

// Chrome module loader initialization
var loader = new SecurableModule.Loader({defaultPrincipal: "system",
    rootPath: "resource://hellomodule/modules"});
function require() { return loader.require.apply(loader, arguments); };

// ********************************************************************************************* //
// Imports

var DomTree = require("dom-tree").DomTree;
var add = loader.require("add").add;
var subtract = loader.require("subtract").subtract;

// ********************************************************************************************* //
// Firebug Panel

var panelName = "HelloModule";

/**
 * Panel implementation
 */
function HelloModulePanel() {} 
HelloModulePanel.prototype = extend(Firebug.Panel,
{
    name: panelName,
    title: "Hello Module!",

    initialize: function()
    {
        Firebug.Panel.initialize.apply(this, arguments);
    },

    show: function(state)
    {
        var domTree = new DomTree(FBL.unwrapObject(this.context.window));
        domTree.append(this.panelNode);
    }
}); 

// ********************************************************************************************* //

Firebug.HelloModuleModel = extend(Firebug.Module, 
{ 
    onLoadModules: function(context)
    {
        FBTrace.sysout("1 + 2 = " + add(1, 2));
        FBTrace.sysout("3 - 1 = " + subtract(3, 1));
        FBTrace.sysout("helloModule; All modules loaded!");
    }
});

// ********************************************************************************************* //
// Registration

Firebug.registerPanel(HelloModulePanel);
Firebug.registerModule(Firebug.HelloModuleModel); 
Firebug.registerStylesheet("chrome://hellomodule/skin/domTree.css");

// ********************************************************************************************* //
}});
