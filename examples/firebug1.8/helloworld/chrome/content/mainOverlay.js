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

if (!Firebug || !Firebug.getModuleLoaderConfig)
{
    FBTrace.sysout("Firebug Overlay; 'chrome://firebug/content/moduleConfig.js' must be included!");
    return;
}

var config = Firebug.getModuleLoaderConfig();
config.paths[extensionName] = "helloworld/content";

// Load main.js module (the entry point of the extension) + a support for tracing.
Firebug.require(config, [
    extensionName + "/main",
    "firebug/lib/trace"
],
function(Extension, FBTrace)
{
    try
    {
        // Initialize the extension object. Extension intialization procedure
        // should be within this method (in main.js).
        Extension.initialize();

        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("Firebug Overlay; Extension '" + extensionName + "' loaded!");
    }
    catch (err)
    {
        if (FBTrace.DBG_ERRORS)
            FBTrace.sysout("Firebug Overlay; ERROR " + err);
    }
});

return {};

// ********************************************************************************************* //
})();
