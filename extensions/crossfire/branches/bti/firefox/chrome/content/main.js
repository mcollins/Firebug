/* See license.txt for terms of usage */

(function() {
// ********************************************************************************************* //

// don't load server modules if we are remote client
if ( !window.CrossfireRemote) {

    var config = {
        baseUrl: "resource://",

        paths: {"arch": "crossfireModules/tools/server", "firebug": "firebug_rjs", "crossfireModules":"crossfireModules"}
    };

    require(config, [
        "firebug/lib/trace",
        "arch/tools"
    ],
    function(FBTrace, ToolsInterface)
    {
        FBTrace.sysout("crossfire-server loaded");
        FBTrace.sysout("tools interface is => " + ToolsInterface, ToolsInterface);
    });

}
// ********************************************************************************************* //
}());
