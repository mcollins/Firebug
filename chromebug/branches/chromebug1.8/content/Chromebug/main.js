//Inside scripts/main.js
var config = Firebug.getModuleLoaderConfig();

config.prefDomain = "extensions.chromebug";
config.paths = {"arch": "fb4cb/bti/inProcess", "firebug": "fb4cb", "chromebug": "chromebug_rjs"};
config.context = "Chromebug ";

if (FBTrace.DBG_INITIALIZE || FBTrace.DBG_MODULES)
{
    if (FBTrace.DBG_MODULES)
        config.debug = true;

    FBTrace.sysout("chromebug main.js; Loading Firebug modules with config.debug: "+config.debug);
    var startLoading = new Date().getTime();
}

config.modules =[
                 "firebug/chrome/chrome", // must be first to match arg ChromeFactory
                 "firebug/firefox/firefox",
                 "chromebug/ChromebugOverrides",
                 "chromebug/domWindowContext",
                 "chromebug/platform",
                 "chromebug/xulapp",
                 ].concat(config.modules);

require( config, config.modules, function(ChromeFactory, Firefox, ChromebugOverrides, DomWindowContext)
{
    if (FBTrace.DBG_INITIALIZE || FBTrace.DBG_MODULES)
    {
        var theArgs = {ChromeFactory: ChromeFactory, Firefox: Firefox, ChromebugOverrides: ChromebugOverrides};
        FBTrace.sysout("chromebug main.js require", theArgs);
    }

    Components.utils.reportError("Chromebug main.js callback running");

    Firebug.Options.initialize("extensions.chromebug");

    FBTrace.sysout("chromebug main calling waitForPanelBar()");

    window.panelBarWaiter.waitForPanelBar(ChromeFactory, function completeInitialization(chrome)
    {
        FBTrace.sysout("chromebug main applying overrides");
        ChromebugOverrides.override(Firefox, chrome);
        FBTrace.sysout("main.js DomWindowContext", DomWindowContext);
    });

});