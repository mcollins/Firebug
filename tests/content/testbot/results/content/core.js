/* See license.txt for terms of usage */

var CDB = {};
(function() {

/*************************************************************************************************/

// Basic support for namespaces.
var namespaces = [];
this.ns = function(fn)
{
    var ns = {};
    namespaces.push(fn, ns);
    return ns;
};

// Application init procedure
this.initialize = function()
{
    // Initialize registered namespaces.
    for (var i=0; i<namespaces.length; i+=2) {
        var fn = namespaces[i];
        var ns = namespaces[i+1];
        fn.apply(ns);
    }

    // Initialize registered modules
    CDB.dispatch(this.modules, "initialize", []);
};


// Support for modules.
this.modules = [];
this.registerModule = function(module)
{
    this.modules.push(module);
};

// Entry point
$(document).ready(function()
{
    CDB.initialize();
});

/*************************************************************************************************/
}).apply(CDB);
