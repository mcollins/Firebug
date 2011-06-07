/* See license.txt for terms of usage */

define(
        [
         "firebug/lib/trace",
         "firebug/firebug",
         "crossfireModules/crossfire-client",
         "arch/browser",
         //"firebug_rjs/bti/inProcess/browser",
         "arch/compilationunit"
        ], function(
                FBTrace,
                Firebug,
                CrossfireClient,
                Browser,
                CompilationUnit
                ) {

    // add crossfire client to our tools interface
    var ToolsInterface = {};

    ToolsInterface.crossfireClient = new CrossfireClient();

// Classes
    ToolsInterface.CompilationUnit = CompilationUnit;

    ToolsInterface.Browser = Browser;

    //Create a connection object
    Firebug.connection = ToolsInterface.browser = new Browser();

    Firebug.connection.connect();

   // ToolsInterface.BrowserContext = CrossfireBrowserContext;
    FBTrace.sysout("Crossfire client tools: " + ToolsInterface.crossfireClient, ToolsInterface.crossfireClient);

    return ToolsInterface;

});