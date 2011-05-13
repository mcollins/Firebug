//Inside scripts/main.js
function getModuleLoaderConfig(baseConfig)
{
    // Set configuration defaults.
    baseConfig.baseLoaderUrl = baseConfig.baseLoaderUrl || "resource://moduleLoader/";
    baseConfig.prefDomain = baseConfig.prefDomain || "extensions.chromebug";
    baseConfig.arch = baseConfig.arch ||  "firebug_rjs/inProcess";
    baseConfig.baseUrl = baseConfig.baseUrl || "resource://";
    baseConfig.paths = baseConfig.paths || {"arch": "fb4cb/inProcess", "firebug": "fb4cb", "chromebug": "chromebug_rjs"};

    // to give each XUL window its own loader (for now)
    var uid = Math.random();

    var config =
    {
        context: "Chromebug " + uid, // TODO XUL window id on FF4.0+
        baseUrl: baseConfig.baseUrl,
        paths: baseConfig.paths,
        onDebug: function()
        {
            try
            {
                if (!this.FBTrace)
                {
                    // traceConsoleService is a global of |window| frome trace.js.
                    // on the first call we use it to get a ref to the Cu.import module object
                    this.FBTrace = traceConsoleService.getTracer(baseConfig.prefDomain);
                }

                if (this.FBTrace.DBG_MODULES)
                    this.FBTrace.sysout.apply(this.FBTrace,arguments);
            }
            catch(exc)
            {
                var msg = "";
                for (var i = 0; i < arguments.length; i++)
                    msg += arguments[i]+", ";

                Components.utils.reportError("Loader; onDebug:"+msg);  // put something out for sure
                window.dump("Loader; onDebug:"+msg+"\n");
            }
        },
        onError: function(exc)
        {
            var msg = exc.toString() +" "+(exc.fileName || exc.sourceName) + "@" + exc.lineNumber;

            Components.utils.reportError("Loader; Error: "+msg);  // put something out for sure
            window.dump("Loader; onError:"+msg+"\n");
            if (!this.FBTrace)
            {
                // traceConsoleService is a global of |window| frome trace.js.
                // on the first call we use it to get a ref to the Cu.import module object
                this.FBTrace = traceConsoleService.getTracer(baseConfig.prefDomain);
            }

            if (this.FBTrace.DBG_ERRORS || this.FBTrace.DBG_MODULES)
                this.FBTrace.sysout("Loader; Error: "+msg, exc);

            if (exc instanceof Error)
                throw arguments[0];
            else
                throw new Error(msg);
        },
    };

    return config;
}


var config = getModuleLoaderConfig(window._firebugArchConfig || {});
require.onError = config.onError;

if (FBTrace.DBG_INITIALIZE || FBTrace.DBG_MODULES)
{
    if (FBTrace.DBG_MODULES)
        config.debug = true;

    FBTrace.sysout("chromebug main.js; Loading Firebug modules...");
    var startLoading = new Date().getTime();
}

require( config, [
                  "firebug/chrome", // must be first to match arg ChromeFactory
                  "firebug/firefox/firefox",
                  "chromebug/ChromebugOverrides",
                  "firebug/lib",
                  "firebug/domplate",
                  "firebug/firebug",
                  "firebug/lib/options",
                  "arch/tools",
                  "arch/firebugadapter",
                  "firebug/debugger",
                  "arch/javascripttool",
                  "firebug/traceModule",
                  "firebug/lib/xpcom",
                  "firebug/dragdrop",
                  "firebug/tabWatcher",
                  "firebug/sourceBox",
                  "firebug/scriptPanel",
                  "firebug/memoryProfiler",
                  "firebug/commandLine",
                  "firebug/navigationHistory",
                  "firebug/htmlPanel",
                  "firebug/cssPanel",
                  "firebug/consoleInjector",
                  "firebug/inspector",
                  "firebug/layout",
                  "firebug/netPanel",
                  "firebug/knownIssues",
                  "firebug/tabCache",
                  "firebug/activation",
                  "firebug/sourceFile",
                  "firebug/navigationHistory",
                  "firebug/a11y",
                  "firebug/shortcuts",
                  "firebug/start-button/startButtonOverlay",
                  "firebug/external/externalEditors",
                  "firebug/callstack",
                  "firebug/spy",
                  "firebug/tableRep",
                  "firebug/commandLinePopup",
                  "firebug/commandLineExposed",
                  "firebug/panelActivation",
                  "firebug/consoleExposed",
                  "chromebug/platform",
                  "chromebug/xulapp",
                  "chromebug/domWindowContext",
      ],
function(ChromeFactory, Firefox, ChromebugOverrides)
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
    });

});