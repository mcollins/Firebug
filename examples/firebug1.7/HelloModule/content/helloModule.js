/* See license.txt for terms of usage */

(function() {

// ************************************************************************************************
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cc = Components.classes;

var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

// Module loader
var SecurableModule = {};
Components.utils["import"]("resource://hellomodule/securable-module-requirejs.js", SecurableModule);

// ************************************************************************************************
// Initialization

var HelloModule =
{
    initialize: function()
    {
        try
        {
            this.loadModules();
        }
        catch (err)
        {
            sysout(err);
        }
    },

    loadModules: function()
    {
        var loader = getLoader();

        // Load 'add' module - sync.
        var module = loader.require("add");
        sysout("1 + 2 = " + module.add(1, 2));

        // Load 'subtract' module - async.
        loader.require(["subtract"], function(module)
        {
            sysout("3 - 1 = " + module.subtract(3, 1));
        });
    },

    shutdown: function()
    {
    },
};

// ************************************************************************************************
// Loader

function getLoader()
{
    var rootPath = resourceToFile("resource://hellomodule/");
    return new SecurableModule.Loader({defaultPrincipal: "system", rootPath: rootPath});
}

function resourceToFile(resourceURL)
{
    var resHandler = ioService.getProtocolHandler("resource")
        .QueryInterface(Ci.nsIResProtocolHandler);

    var justURL = resourceURL.split("resource://")[1];
    var splitted = justURL.split("/");
    var sub = splitted.shift();

    var path = resHandler.getSubstitution(sub).spec;
    return path + splitted.join("/");
}

// ************************************************************************************************
// Logging

function sysout(msg)
{
    Components.utils.reportError(msg);
    dump(msg + "\n");
}

// ************************************************************************************************
// Registration

window.addEventListener("load", function() { HelloModule.initialize(); }, false);
window.addEventListener("unload", function() { HelloModule.shutdown(); }, false);

// ************************************************************************************************
})();
