/* See license.txt for terms of usage */

define(
        ["firebug/ToolsInterface",
         "firebug/firebug",
         "firebug/lib/options",
         "crossfireModules/crossfire-client",
         "arch/browser",
         "arch/compilationunit"
        ], function(
                ToolsInterface,
                Firebug,
                Options,
                CrossfireClient,
                Browser,
                CompilationUnit
                ) {

    // add crossfire client to our tools interface
    //var ToolsInterface = {};
    ToolsInterface.crossfireClient = new CrossfireClient();

// Classes
    ToolsInterface.CompilationUnit = CompilationUnit;

    ToolsInterface.Browser = Browser;

// Create a connection object
    Object.defineProperty(ToolsInterface, 'browser', {value: new Browser(), writable: false, enumerable: true});
    //ToolsInterface.browser = new Browser();

   // ToolsInterface.BrowserContext = CrossfireBrowserContext;
    FBTrace.sysout("Crossfire client tools has Options: " + Options, Options);

    ToolsInterface.browser.addListener(Firebug);

 // Listen for preference changes. This way options module is not dependent on tools
 // xxxHonza: can this be in Browser interface?
 Options.addListener(
 {
     updateOption: function(name, value)
     {
         ToolsInterface.browser.dispatch("updateOption", [name, value]);
     }
 });

Firebug.Options = Options;
// Object.defineProperty(Firebug, "Options", {value: Options, writable:false, enumerable: true});

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

return ToolsInterface;

});