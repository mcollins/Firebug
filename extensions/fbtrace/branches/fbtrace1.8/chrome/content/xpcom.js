/* See license.txt for terms of usage */

define([], function() { with (FBL) {

// ************************************************************************************************
// Shorcuts and Services

var Cc = Components.classes;
var Ci = Components.interfaces;

// ************************************************************************************************
// Shorcuts and Services

TraceConsole.XPCOM =
{
    toSupportsString: function(string)
    {
        var wrapper = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
        wrapper.data = string;
        return wrapper; 
    }
}

// ************************************************************************************************

return TraceConsole.XPCOM;

// ************************************************************************************************
}});
