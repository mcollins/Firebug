/* See license.txt for terms of usage */

(function() {
// ************************************************************************** //

    FBTrace.sysout("Crossfire Remote Client main.js onModulePreload: " + Firebug.onModulePreLoad, Firebug);

    Firebug.onModulePreLoad(function crossfirePreLoad( config) {
        FBTrace.sysout("Crossfire Remote Client  onModulePreload: config => " +config, config);
        config.debug = true;

        config.modules = [
           "firebug/trace/traceModule",
           //"firebug/chrome/navigationHistory",
           //"firebug/chrome/knownIssues",
           "firebug/js/sourceFile",
           "firebug/chrome/shortcuts",
           "firebug/firefox/start-button/startButtonOverlay",
           //"firebug/editor/external/externalEditors",
           "firebug/firefox/firebugMenu",
           "firebug/chrome/panelActivation",
           //"firebug/console/memoryProfiler",
           "firebug/chrome/tableRep",
           "firebug/html/htmlPanel",
           "firebug/console/commandLinePopup",
           //"firebug/accessible/a11y",
           "firebug/js/scriptPanel",
           "firebug/js/callstack",
           //"firebug/console/consoleInjector",
           //"firebug/net/spy",
           //"firebug/js/tabCache",
           //"firebug/chrome/activation",
           "arch/tools",
           "crossfireRemote/crossfire-remote-client"
        ];

        config.paths.arch = "crossfireModules/tools/client";
        config.paths.crossfireModules = "crossfireModules";
        config.paths.crossfireRemote = "crossfire_remote_rjs";

        return config;
    });

// ************************************************************************** //
}());

