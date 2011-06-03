/* See license.txt for terms of usage */

define([
    "firebug/lib/trace",
    "helloworld/myPanel"
],
function(FBTrace) {

// ********************************************************************************************* //
// The application/extension object

var theApp =
{
    initialize: function()
    {
        // xxxHonza: defaults/preferences/helloworld.js prefs file is not loaded
        // if the extensions is bootstrapped.
        if (FBTrace.DBG_HELLOWORLD)
            FBTrace.sysout("helloWorld; my extension initialized!");
    }
}

return theApp;

// ********************************************************************************************* //
});
