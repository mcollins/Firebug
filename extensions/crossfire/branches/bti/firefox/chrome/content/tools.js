/* See license.txt for terms of usage */

define("ToolsInterface", ["crossfireModules/crossfire-client.js"], function(CrossfireClient) {

//var ToolsInterface = new CrossfireClient();

//ToolsInterface.CompilationUnit = Crossfire.CompilationUnit;


//Browser.onDebug = function()
//{
//   FBTrace.sysout.apply(FBTrace, arguments);
//}

//var ToolsInterface = {};

    // use crossfire as our tools interface
    var ToolsInterface = new CrossfireClient();

// Classes
//CrossfireClient.Browser = Browser;
//ToolsInterface.CompilationUnit = CompilationUnit;

// Create a connection object
    ToolsInterface.browser = ToolsInterface;//new Browser();

//ToolsInterface.browser.addListener(Firebug)
    ToolsInterface.browser.addListener(ToolsInterface.JavaScript);


// FIXME eventually we want the dependency system to pass around the ToolsInterface
Firebug.ToolsInterface = ToolsInterface;

return ToolsInterface;

});