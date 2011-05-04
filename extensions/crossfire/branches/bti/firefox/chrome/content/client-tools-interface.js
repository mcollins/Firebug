/* See license.txt for terms of usage */

define("ToolsInterface",
        ["crossfireModules/crossfire-client",
         "crossfireModules/bti/CrossfireBrowserContext",
         "crossfireModules/bti/CrossfireProxy",
         "crossfireModules/bti/CrossfireCompilationUnit"
        ], function(
                CrossfireClient,
                CrossfireBrowserContext,
                CrossfireProxy,
                CrossfireCompilationUnit
                ) {

    // use crossfire as our tools interface
    var ToolsInterface = new CrossfireClient();

// Classes
ToolsInterface.CompilationUnit = CrossfireCompilationUnit;

// Create a connection object
    ToolsInterface.browser = ToolsInterface;//new Browser();

    ToolsInterface.crossfireClient = ToolsInterface;

    ToolsInterface.BrowserContext = CrossfireBrowserContext;

    ToolsInterface.Proxy = CrossfireProxy;

//ToolsInterface.browser.addListener(Firebug)
    ToolsInterface.browser.addListener(ToolsInterface.JavaScript);
/*
//FIXME: copied from javascripttool.js
    ToolsInterface.JavaScript.onCompilationUnit = function(context, url, kind)
    {
         var compilationUnit = new ToolsInterface.CompilationUnit(url, context);

         compilationUnit.kind = kind;

         context.compilationUnits[url] = compilationUnit;
         FBTrace.sysout("ToolsInterface.JavaScript.onCompilationUnit "+url+" added to "+context.getName(), compilationUnit);
    };
*/

// FIXME eventually we want the dependency system to pass around the ToolsInterface
Firebug.ToolsInterface = ToolsInterface;

return ToolsInterface;

});