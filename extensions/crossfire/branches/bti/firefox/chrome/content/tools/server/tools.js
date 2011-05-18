/* see license.txt for terms of use. */

define(
        [ "firebug/ToolsInterface",
          "firebug/firebug",
          "crossfireModules/crossfire-server",
          "arch/browser",
          "arch/compilationunit"],
          //"crossfireModules/bti/CrossfireCompilationUnit"],
          function(ToolsInterface, Firebug, CrossfireServer, Browser, CompilationUnit) {

    Browser.onDebug = function()
    {
        FBTrace.sysout.apply(FBTrace, arguments);
    }

    // add crossfire to our tools interface
    //var ToolsInterface = {};

    ToolsInterface.server = new CrossfireServer();

    ToolsInterface.Browser = Browser;
    ToolsInterface.CompilationUnit = CompilationUnit;

    // Create a connection object
    //ToolsInterface.browser = new Browser();
    Object.defineProperty(ToolsInterface, 'browser', {value: new Browser(), writable: false, enumerable: true});
    ToolsInterface.browser.addListener(Firebug);

    // Listen for preference changes. This way options module is not dependent on tools
    // xxxHonza: can this be in Browser interface?
    Firebug.Options.addListener(
    {
        updateOption: function(name, value)
        {
            ToolsInterface.browser.dispatch("updateOption", [name, value]);
        }
    });

    // FIXME eventually we want the dependency system to pass around the ToolsInterface
    Firebug.ToolsInterface = ToolsInterface;

    return ToolsInterface;

});