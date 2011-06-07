/* see license.txt for terms of use. */

define(
        [ "firebug/lib/trace",
          "firebug/firebug",
          "crossfireModules/crossfire-server",
          "firebug_rjs/bti/inProcess/browser",
          "arch/compilationunit",
          "firebug/firefox/tabWatcher"],
          function( FBTrace,
                    Firebug,
                    CrossfireServer,
                    Browser,
                    CompilationUnit,
                    TabWatcher) {

    FBTrace.sysout("Loading Crossfire Server tools.js, Firebug => " + Firebug, Firebug);

    var ToolsInterface = {};
    Browser.onDebug = function()
    {
        FBTrace.sysout.apply(FBTrace, arguments);
    };

    ToolsInterface.server = new CrossfireServer();

    ToolsInterface.Browser = Browser;
    ToolsInterface.CompilationUnit = CompilationUnit;

    //Create a connection object
    Firebug.connection = ToolsInterface.browser = new Browser();

    Firebug.connection.connect();

    return ToolsInterface;

});