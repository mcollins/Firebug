/* See license.txt for terms of usage */

define([
    "firebug/lib/trace",
    "dojo/ui/panels"
], function(FBTrace) {
        
    
// ********************************************************************************************* //
// The application/extension object

var theApp =
{
    initialize: function()
    {
        // xxxHonza: defaults/preferences/helloworld.js prefs file is not loaded
        // if the extensions is bootstrapped.
        console.log("Patricio");
        if (FBTrace) {
            FBTrace.sysout("Dojo extension initialized");
        }
    }
};

return theApp;

// ********************************************************************************************* //
});