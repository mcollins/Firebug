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
    window.initWithParams(args);

    // Register strings so, Firebug's localization APIs can be used. This also
    // must be done before namespaces are initialized.
    if (Firebug.registerStringBundle)
        Firebug.registerStringBundle("chrome://fbtest/locale/fbtest.properties");

    for (var i=0; i<namespaces.length; i+=2) 
    {
        var fn = namespaces[i];
        var ns = namespaces[i+1];
        fn.apply(ns);
    }

    // Set the Firebug window now. In case of a new window we have to wait
    // till all nemespaces are initialized.
    FBTestApp.FBTest.FirebugWindow = args.firebugWindow;

    // Now we can initialize entire console.
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

// Helper method for passing arguments into an existing window.
window.initWithParams = function(args)
{
    FBTrace = args.firebugWindow.FBTrace;
    Firebug = args.firebugWindow.Firebug;
    FBTestApp.defaultTestList = args.testListURI;

    // The FBTest object might exist if an existing window is initializing 
    // with new parameters.
    if (FBTestApp.FBTest)
        FBTestApp.FBTest.FirebugWindow = args.firebugWindow;
}

}).apply(FBTestApp);

// ************************************************************************************************
