/* See license.txt for terms of usage */

(function() {
// ********************************************************************************************* //
var config = {
    baseUrl: "resource://",

    paths: {"arch": "crossfireModules/tools/client", "firebug": "firebug_rjs", "crossfireModules":"crossfireModules", "crossfireRemoteModules": "crossfire_remote_rjs"}
};

require(config, [
    "firebug/lib/trace",
    "crossfireRemoteModules/crossfire-remote-client"
],
function(FBTrace, CrossfireRemoteClient)
{

    FBTrace.sysout("crossfire-remote-clent loaded");
    window.CrossfireRemote = CrossfireRemoteClient;
});

// ********************************************************************************************* //
}());

