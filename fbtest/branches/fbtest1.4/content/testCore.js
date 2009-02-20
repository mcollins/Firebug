/* See license.txt for terms of usage */

// ************************************************************************************************
// Test Console singleton object

var FBTestApp = {};

(function() {

// Registration
var namespaces = [];
this.ns = function(fn) 
{
    var ns = {};
    namespaces.push(fn, ns);
    return ns;
};

// Initialization
this.initialize = function() 
{
    // Initialize global variables before all the namespaces are initialized.
    var args = window.arguments[0];
    FBTrace = args.FirebugWindow.FBTrace;
    Firebug = args.FirebugWindow.Firebug;

    for (var i=0; i<namespaces.length; i+=2) 
    {
        var fn = namespaces[i];
        var ns = namespaces[i+1];
        fn.apply(ns);
    }

    FBTestApp.TestConsole.initialize();
};

// Clean up
this.shutdown = function() 
{
    window.removeEventListener("load", FBTestApp.initialize, false);
    window.removeEventListener("unload", FBTestApp.shutdown, false);

    FBTestApp.TestConsole.shutdown();
};

// Register handlers to maintain extension life cycle.
window.addEventListener("load", FBTestApp.initialize, false);
window.addEventListener("unload", FBTestApp.shutdown, false);

}).apply(FBTestApp);

// ************************************************************************************************
