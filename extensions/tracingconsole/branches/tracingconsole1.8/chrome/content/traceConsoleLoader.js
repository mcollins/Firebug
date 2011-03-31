/* See license.txt for terms of usage */

// ************************************************************************************************
// Shorcuts and Services

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Trace Console Loader

var TraceConsoleLoader =
{
    initialize: function()
    {
        var args = window.arguments[0];

        try
        {
            Components.utils["import"]("resource://tracingconsole-firebug/moduleLoader.js");

            // Require JS configuration
            var config = {};
            config.prefDomain = args.prefDomain;
            config.baseUrl = "chrome://tracingconsole/content/";
            config.paths = {"arch": "inProcess"};

            // Defalt globals for all modules loaded using this loader.
            var firebugScope =
            {
                window : window,
                Firebug: Firebug,
                fbXPCOMUtils: fbXPCOMUtils,
                FBL: FBL,
                FirebugReps: FirebugReps,
                domplate: domplate,
            };

            // Create loader and load tracing module.
            var loader = new ModuleLoader(firebugScope, config);
            loader.define(["traceModule.js"], function(traceModule)
            {
                traceModule.openConsole(config.prefDomain);
            });
        }
        catch (err)
        {
            window.dump("FBTrace; EXCEPTION " + err + "\n");
        }
    },

    shutdown: function()
    {
    },
};

// ************************************************************************************************
