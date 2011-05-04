/* see license.txt for terms of use. */

define("ToolsInterface", ["crossfireModules/crossfire-server.js", "arch/compilationunit"], function(CrossfireServer, CompilationUnit) {

    // use crossfire as our tools interface
    var ToolsInterface = new CrossfireServer();

// Classes
    ToolsInterface.CompilationUnit = CompilationUnit;

// Create a connection object
    ToolsInterface.browser = ToolsInterface;//new Browser();


    // FIXME eventually we want the dependency system to pass around the ToolsInterface
    Firebug.ToolsInterface = ToolsInterface;

    return ToolsInterface;

});