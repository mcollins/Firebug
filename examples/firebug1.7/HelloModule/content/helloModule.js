/* See license.txt for terms of usage */

(function() {

// ************************************************************************************************
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cu = Components.utils;

// ************************************************************************************************
// Initialization

var HelloModule =
{
    initialize: function()
    {
        // Dynamically register a menu item handler.
        var command = document.getElementById("menu_LoadModules");
        command.addEventListener("command", function() {
            HelloModule.loadModules();
        }, false);
    },

    loadModules: function()
    {
        var loader = getLoader();

        // Connection to the Firebug trace console.
        var FBTrace = loader.require("firebug-trace").FBTrace;

        // Load 'add' module - sync.
        var module = loader.require("add");
        FBTrace.sysout("1 + 2 = " + module.add(1, 2));

        //var module = loader.require("subtract");
        //FBTrace.sysout("3 - 1 = " + module.subtract(3, 1));

        // Load 'subtract' module - async.
        loader.require(["subtract"], function(module)
        {
            FBTrace.sysout("3 - 1 = " + module.subtract(3, 1));
        });

        FBTrace.sysout("helloModule; All modules loaded!");
    },

    shutdown: function()
    {
    },
};

// ************************************************************************************************
// Loader

function getLoader()
{
    var SecurableModule = {};
    Cu["import"]("resource://hellomodule/securable-module-requirejs.js", SecurableModule);

    // var rootPath = resourceToFile("resource://hellomodule/");
    var rootPath = "resource://hellomodule/";
    return new SecurableModule.Loader({defaultPrincipal: "system", rootPath: rootPath});
}

function resourceToFile(resourceURL)
{
    var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    var resHandler = ioService.getProtocolHandler("resource")
        .QueryInterface(Ci.nsIResProtocolHandler);

    var justURL = resourceURL.split("resource://")[1];
    var splitted = justURL.split("/");
    var sub = splitted.shift();

    var path = resHandler.getSubstitution(sub).spec;
    return path + splitted.join("/");
}

// ************************************************************************************************
// Registration

window.addEventListener("load", function() { HelloModule.initialize(); }, false);
window.addEventListener("unload", function() { HelloModule.shutdown(); }, false);

// ************************************************************************************************
})();
