    // Firebug dev support
    Components.utils.import("resource://firebug/firebug-trace-service.js");
    var FBTrace = traceConsoleService.getTracer("extensions.chromebug");

// allow this file to be loaded via resource url eg resource://firebug/ModuleLoader.js
var EXPORTED_SYMBOLS = ["ModuleLoader", "require", "define"];

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cu = Components.utils;


// Similar to: http://wiki.ecmascript.org/doku.php?id=strawman:module_loaders

/*
 * @param load: a hook that filters and transforms MRL’s for loading. OMITTED
 * @param global: the global object to use for the execution context associated with the module loader.
 */

function ModuleLoader(global) {
    this.global = global;

    this.registry = {};
    this.totalEvals = 0;

    ModuleLoader.currentModuleLoader = this;
    ModuleLoader.instanceCount = 0;

    if (!ModuleLoader.loaders) {
        ModuleLoader.loaders = [];
    }
    ModuleLoader.loaders.push(this);
}
/*
 * @return the current module loader for the current execution context.
 */
ModuleLoader.current = function getCurrentModuleLoader() {
    return ModuleLoader.currentModuleLoader;
}

ModuleLoader.get = function(name) {
    for (var i = 0; i < ModuleLoader.loaders.length; i++) {
        if (ModuleLoader.loaders[i].getModuleLoaderName() === name) {
            return ModuleLoader.loaders[i];
        }
    }
}

ModuleLoader.systemPrincipal = Cc["@mozilla.org/systemprincipal;1"].createInstance(Ci.nsIPrincipal);
ModuleLoader.mozIOService = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);

ModuleLoader.bootStrap = function(requirejsPath) {
    var global;

    isBrowser = !!(typeof window !== "undefined" && navigator && document);

    if (isBrowser)
        global = window;

    var primordialLoader = new ModuleLoader(global);
    var unit = primordialLoader.loadModule(requirejsPath);
    // require.js does not export so we need to fix that
    unit.module = {
        require: unit.sandbox.require,
        define: unit.sandbox.define
    };
    // attach to requirejs using http://requirejs.org/docs/api.html#config
    unit.module.require({context:primordialLoader.getModuleLoaderName()});

    return unit.module;
}

ModuleLoader.prototype = {
    /*
     *  @return produces the global object for the execution context associated with moduleLoader.
     */
    globalObject: function () {
        return this.global;
    },
    /*
     * @return registers a frozen object as a top-level module in the module loader’s registry. The own-properties of the object are treated as the exports of the module instance.
     */
    attachModule: function(name, module) {
        this.registry[name] = module;  // its a lie, we register compilation units
    },
    /*
     * @return the module instance object registered at name, or null if there is no such module in the registry.
     */
    getModule: function(name) {
        return this.registry[name].module;
    },
    /*
     * @param unit compilation unit: {
     * 	source: a string of JavaScript source,
     *  url: identifier,
     *  jsVersion: JavaScript version to compile under
     *  staringLineNumber: offset for source line numbers.
     * @return completion value
     */
    evalScript: function(unit) {
        unit.sandbox = this.getSandbox(unit);
        try {
            unit.jsVersion = unit.jsVersion || "1.8";
            unit.url = unit.url || (this.getModuleLoaderName() + this.totalEvals)
            unit.startingLineNumber = unit.startingLineNumber || 1;
            // beforeCompilationUnit
            var evalResult = Cu.evalInSandbox(unit.source, unit.sandbox,  unit.jsVersion, unit.url, unit.startingLineNumber);
            // afterCompilationUnit
            this.totalEvals += 1;
            return evalResult;
        } catch (exc) {
            if (FBTrace.DBG_ERRORS) {
                FBTrace.sysout("ModuleLoader.evalScript ERROR "+exc, {exc: exc, unit: unit});
            }
        }
    },

    loadModule: function(mrl, callback) {
        var unit = {
            source: this.mozReadTextFromFile(mrl),
            url: mrl,
        }
        var moduleInstanceObject = this.evalScript(unit);
        if (callback) {
            callback(moduleInstanceObject);  // this call throws we do not register the module?
        }
        unit.module = moduleInstanceObject;
        this.attachModule(mrl, unit);
        return unit;
    },

    // ****
    getSandbox: function(unit) {
        unit.principal = this.getPrincipal();
        return unit.sandbox = new Cu.Sandbox(unit.principal);
    },

    getPrincipal: function() {
        if (!this.principal) {
            if (this.global && (this.global instanceof Ci.nsIDOMWindow)) {
                this.principal = this.global;
            } else {
                this.principal = ModuleLoader.systemPrincipal;
            }
        }
        return this.principal;
    },

    getModuleLoaderName: function()	{
        if (!this.name)	{
            if (this.global && (this.global instanceof Window) ) {
                this.name = this.safeGetWindowLocation(this.global);
            }
            else {
                ModuleLoader.instanceCount += 1;
                var count = ModuleLoader.instanceCount;
                this.name = "ModuleLoader_"+count;
            }
        }
        return this.name;
    },

    safeGetWindowLocation: function(window)	{
        try {
            if (window) {
                if (window.closed) {
                    return "(window.closed)";
                }
                else if ("location" in window) {
                    return window.location+"";
                }
                else {
                    return "(no window.location)";
                }
            }
            else {
                return "(no context.window)";
            }
        } catch(exc) {
            if (FBTrace.DBG_WINDOWS || FBTrace.DBG_ERRORS)
                FBTrace.sysout("TabContext.getWindowLocation failed "+exc, exc);
                FBTrace.sysout("TabContext.getWindowLocation failed window:", window);
            return "(getWindowLocation: "+exc+")";
        }
    },

    mozReadTextFromFile: function(pathToFile) {
        try {
            var channel = ModuleLoader.mozIOService.newChannel(pathToFile, null, null);
            var inputStream = channel.open();

            var ciStream = Cc["@mozilla.org/intl/converter-input-stream;1"]
                .createInstance(Ci.nsIConverterInputStream);

            var bufLen = 0x8000;
            ciStream.init(inputStream, "UTF-8", bufLen,
                          Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
            var chunk = {};
            var data = "";

            while (ciStream.readString(bufLen, chunk) > 0) {
                data += chunk.value;
            }

            ciStream.close();
            inputStream.close();

            return data;
        } catch (err) {
            if (FBTrace.DBG_ERRORS || FBTrace.DBG_STORAGE)
                FBTrace.sysout("mozReadTextFromFile; EXCEPTION", err);
        }
    },

}

var require = ModuleLoader.bootStrap("resource://hellomodule/require.js").require;
var define = require.def; // see require.js

// Override to connect require.js to our loader
//
require.attach = function (url, moduleLoaderName, moduleName, callback, type) {

    var moduleLoader = ModuleLoader.get(moduleLoaderName);

    if (moduleLoader) {
        moduleLoader.loadModule(url, callback);
        return moduleLoader.get(url);
    } else {
        var defaultContextName = require.defaultContextName;
        if (!defaultContextName) {
            defaultContextName = "_"; // I saw it in the source and copied it here.
        }
        if (moduleLoaderName === defaultContextName) {
            return require.onError( new Error("require not configured: require.attach called with default context name "+moduleLoaderName+" for url "+url), ModuleLoader );
        } else {
            return require.onError( new Error("require.attach called with unknown moduleLoaderName "+moduleLoaderName+" for url "+url), ModuleLoader );
        }
    }

}

require.chainOnError = require.onError;
require.onError = function (err, object) {
    FBTrace.sysout(err+"",{errorObject: err, moreInfo: object});
    require.chainOnError(err);
}