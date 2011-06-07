/* See license.txt for terms of usage */

(function() {
// ************************************************************************** //

var Firebug = window.parent.Firebug;

// don't load server modules if we are remote client
if ( Firebug && !window.CrossfireRemote) {

    FBTrace.sysout("Crossfire main.js onModulePreload: " + Firebug.onModulePreLoad, Firebug);

    Firebug.onModulePreLoad(function crossfirePreLoad( config) {
        FBTrace.sysout("Crossfire onModulePreload: config => " +config, config);
        config.debug = true;

        config.paths.arch = "crossfireModules/tools/server";
        config.paths.crossfireModules = "crossfireModules";

        return config;
    });
}

// ************************************************************************** //
}());
