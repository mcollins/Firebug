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
        if (typeof(DomTree) == "undefined")
            return;

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

        // Replace securable module loader (from Jatpack) by a RequireJS.
        // RequireJS itself is loaded using ModuleLoader.
        //
        //var loader = new SecurableModule.Loader({principal: "system",
        //    rootPath: "resource://hellomodule/modules"});
        //function require() { return loader.require.apply(loader, arguments); };

        // Get ModuleLoader implementation (it's Mozilla JS code module)
        Components.utils.import("resource://hellomodule/ModuleLoader.js");

        // Create Module Loader implementation for specific path.
        var require = (new ModuleLoader("resource://hellomodule/")).require;

        // Import all necesasry modules for this application (running in Firefox chrome space).
        //var DomTree = require({baseUrl:'resource://'}, ["hellomodule/dom-tree"], function(){}).DomTree;
        //var DomTree = require("resource://hellomodule/dom-tree.js").DomTree;
        //var add = require("resource://hellomodule/add").add;
        //var subtract = require("resource://hellomodule/subtract.js").subtract;

        require([
            "resource://hellomodule/dom-tree.js",
            "resource://hellomodule/add.js",
            "resource://hellomodule/subtract.js"],
            function(DomTree, add, subtract)
            {
                try
                {
                    FBTrace.sysout("helloModule; All modules loaded!");
                    FBTrace.sysout("1 + 2 = " + add(1, 2));
                    FBTrace.sysout("3 - 1 = " + subtract(3, 1));
                }
                catch (err)
                {
                    FBTrace.sysout("helloModule; EXCEPTION " + err, err);
                }
            }
        );
    }
});

// ********************************************************************************************* //
// Registration

Firebug.registerPanel(HelloModulePanel);
Firebug.registerModule(Firebug.HelloModuleModel);
Firebug.registerStylesheet("chrome://hellomodule/skin/domTree.css");

// ********************************************************************************************* //
}});
