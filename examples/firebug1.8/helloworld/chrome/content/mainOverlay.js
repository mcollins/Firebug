/* See license.txt for terms of usage */

(function() {

// ********************************************************************************************* //
// Use this file in case your extension uses an overlay and you want to load
// its main.js module. You just need to include this file into the overlay
// as follows:
//
// <script type="application/x-javascript" src="chrome://<ext-id>/content/mainOverlay.js"/>

// TODO: Replace with your <ext-id>
var extensionName = "helloworld"; 

// ********************************************************************************************* //

var config = Firebug.getModuleLoaderConfig();
config.paths[extensionName] = "helloworld/content";

// Load main.js module (the entry point of the extension).
Firebug.require(config, [
    "firebug/lib/trace",
    extensionName + "/main"
],
function(FBTrace, Extension)
{
    try
    {
        Extension.initialize();

        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("Firebug Bootstrap; Extension '" + extensionName + "' loaded!");
    }
    catch (err)
    {
        if (FBTrace.DBG_ERRORS)
            FBTrace.sysout("Firebug Bootstrap; ERROR " + err);
    }
});

return {};

// ********************************************************************************************* //
})();
