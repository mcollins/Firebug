/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ********************************************************************************************* //
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cu = Components.utils;


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
        // Chrome module loader initialization
        /*
        var loader = new SecurableModule.Loader({principal: "system",
            rootPath: "resource://hellomodule/modules"});
        function require() { return loader.require.apply(loader, arguments); };
*/

        Components.utils.import("resource://hellomodule/ModuleLoader.js");
        var require = (new ModuleLoader("resource://hellomodule/")).require;
        // ********************************************************************************************* //
        // Imports

        //var DomTree = require({baseUrl:'resource://'}, ["hellomodule/dom-tree"], function(){}).DomTree;
        var DomTree = require( ["resource://hellomodule/dom-tree.js"]).DomTree;
         var add = require(["resource://hellomodule/add"]).add;
        var subtract = require("resource://hellomodule/subtract.js").subtract;

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
