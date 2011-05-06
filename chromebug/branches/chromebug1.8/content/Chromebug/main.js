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
        onError: function()
        {
            var msg = "";
            for (var i = 0; i < arguments.length; i++)
                msg += arguments[i]+", ";

            Components.utils.reportError("Loader; onError:"+msg);  // put something out for sure
            window.dump("Loader; onError:"+msg+"\n");
            if (!this.FBTrace)
            {
                // traceConsoleService is a global of |window| frome trace.js.
                // on the first call we use it to get a ref to the Cu.import module object
                this.FBTrace = traceConsoleService.getTracer(baseConfig.prefDomain);
            }

            if (this.FBTrace.DBG_ERRORS || this.FBTrace.DBG_MODULES)
                this.FBTrace.sysout.apply(this.FBTrace, arguments);

            throw arguments[0];
        },
    };

    return config;
}


var config = getModuleLoaderConfig(window._firebugArchConfig || {});
require.onError = config.onError;

require( config, [
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
                  "firebug/script",
                  "firebug/memoryProfiler",
                  "firebug/commandLine",
                  "firebug/navigationHistory",
                  "firebug/html",
                  "firebug/css",
                  "firebug/consoleInjector",
                  "firebug/inspector",
                  "firebug/layout",
                  "firebug/net",
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
                  "firebug/consoleExposed",
                  "chromebug/platform",
                  "chromebug/xulapp"
      ], function(someModule) {
    if (FBTrace.DBG_INITIALIZE || FBTrace.DBG_MODULES)
        FBTrace.sysout("chromebug main.js require!\n");
    Components.utils.reportError("Chromebug main.js callback running");
    Firebug.Options.initialize("extensions.chromebug");
    FirebugChrome.waitForPanelBar(true);
});