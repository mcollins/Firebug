/* See license.txt for terms of usage */

// ************************************************************************************************
// Constants

const CLASS_ID = Components.ID("{287716D2-140B-11DE-912E-E0FC55D89593}");
const CLASS_NAME = "@@@Chromebug Startup Observer Service";
const CONTRACT_ID = "@getfirebug.com/chromebug-startup-observer;1";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const STARTUP_TOPIC = "app-startup";

var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
var categoryManager = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);

const reXUL = /\.xul$|\.xml$|^XStringBundle$|\/modules\//;
const trace = true;
// ************************************************************************************************
// Startup Request Observer implementation

var FBTrace = null;


function StartupObserver()
{
    // Get firebug-trace service for logging (the service should be already
    // registered at this moment).
    FBTrace = Cc["@joehewitt.com/firebug-trace-service;1"]
       .getService(Ci.nsISupports).wrappedJSObject.getTracer("extensions.firebug");
    this.jsdState = {};
    this.observers = [];
}

StartupObserver.prototype =
{
   debug: false,

   getWindow: function()
   {
       if (!gStartupObserverSingleton.window)
       {
           var appShellService = Cc["@mozilla.org/appshell/appShellService;1"].getService(Ci.nsIAppShellService);
           gStartupObserverSingleton.window = appShellService.hiddenDOMWindow;
       }
       return gStartupObserverSingleton.window;
   },

   startJSD: function()
   {
       Components.utils.reportError("chromebug starting jsd");
       var DebuggerService = Cc["@mozilla.org/js/jsd/debugger-service;1"];
       var jsdIDebuggerService = Ci["jsdIDebuggerService"];
       jsd = DebuggerService.getService(jsdIDebuggerService);

       jsd.on();
       jsd.flags |= jsdIDebuggerService.DISABLE_OBJECT_TRACE;
       jsd.initAtStartup = false;

       this.setJSDFilters(jsd);

       this.hookJSDContexts(jsd,  gStartupObserverSingleton.jsdState);
   },

   setJSDFilters: function(jsd)
   {
       var passDebuggerHalter = {
               globalObject: null,
               flags: Ci.jsdIFilter.FLAG_ENABLED | Ci.jsdIFilter.FLAG_PASS,
               urlPattern: "*/debuggerHalter.js",
               startLine: 0,
               endLine: 0
           };
       var filterChromebug =
       {
            globalObject: null,
               flags: Ci.jsdIFilter.FLAG_ENABLED,
               urlPattern: "chrome://chromebug/*",
               startLine: 0,
               endLine: 0
           };
       var filterfb4cb = {
               globalObject: null,
               flags: Ci.jsdIFilter.FLAG_ENABLED,
               urlPattern: "chrome://fb4cb/*",
               startLine: 0,
               endLine: 0
           };
       var filterTrace = {
                globalObject: null,
                flags: Ci.jsdIFilter.FLAG_ENABLED,
                urlPattern: "chrome://firebug/content/trace*",
                startLine: 0,
                endLine: 0
            };
       jsd.appendFilter(passDebuggerHalter); // first in, first compared
       jsd.appendFilter(filterChromebug);
       jsd.appendFilter(filterfb4cb);
       jsd.appendFilter(filterTrace);

       jsd.enumerateFilters({ enumerateFilter: function(filter)
           {
               Components.utils.reportError("gStartupObserverSingleton filter "+filter.urlPattern+" "+filter.flags+"\n");
           }});
   },

   hookJSDContexts: function(jsd, jsdState)
   {
       // This is a minature version of the double hook in firebug-service.js
       jsdState._chromebug = {};
       jsdState._chromebug.globalTagByScriptTag = {};
       jsdState._chromebug.globals = [];
       jsdState._chromebug.breakpointedScripts = {};
       jsdState._chromebug.innerScripts = [];
       jsdState._chromebug.xulScriptsByURL = {};
       jsdState.getAllTrackedFiles = function() { return gStartupObserverSingleton.trackFiles.allFiles; }
       jsdState.avoidSelf = function(URI)
       {
           return (URI.indexOf("/chromebug/") != -1 || URI.indexOf("/fb4cb/") != -1);
       };

       jsd.scriptHook =
       {
           onScriptCreated: function(script)
           {
               if (jsdState.avoidSelf(script.fileName))
                   return;
                gStartupObserverSingleton.trackFiles.add(script);

                var cb = jsdState._chromebug;
                if (!cb)
                {
                     // Somehow the hook can be called before the jsdState object is updated?
                     //if (trace) jsdState.dump("onScriptCreated No jsdState._chromebug for script:"+script.fileName+"\n");
                     return;
                }
                if (!script.functionName) // top or eval-level
                {
                    if (cb.breakpointedScripts)  // should never be false but is once
                    {
                        cb.breakpointedScripts[script.tag] = script;
                        script.setBreakpoint(0);
                        return;
                    }
                }
                else if ( reXUL.test(script.fileName) )
                {
                    if (!(script.fileName in cb.xulScriptsByURL))
                        cb.xulScriptsByURL[script.fileName] = [];
                    cb.xulScriptsByURL[script.fileName].push(script); // test for valid when removed
                    return;
                }
                cb.innerScripts.push(script);
           },
           onScriptDestroyed: function(script)
           {
               if (jsdState.avoidSelf(script.fileName))
                   return;
               var cb = jsdState._chromebug;

               if (!script.functionName) // top or eval-level
               {
                   var cb = jsdState._chromebug;
                   if (!cb || !cb.breakpointedScripts)
                   {
                       // about 4 of these can come out, some timing bug in mozilla.
                       //if (trace) jsdState.dump("onScriptDestroyed No jsdState._chromebug for script:"+script.fileName+"\n");
                       return;
                   }
                   var broken = cb.breakpointedScripts[script.tag];
                   if(broken)
                   {
                       delete cb.breakpointedScripts[script.tag];
                       return;
                   }
                }
                if (cb)
                {
                    var i = cb.innerScripts.indexOf(script);
                    if (i) delete cb.innerScripts[i];
                }
           },
       };

       jsd.breakpointHook =
       {
           onExecute: function(frame, type, val)
           {
               gStartupObserverSingleton.trackFiles.def(frame);

               frame.script.clearBreakpoint(0);
               var script = frame.script;
               //if (trace) jsdState.dump("breakpointHook script "+script.tag+"\n");
               var cb = jsdState._chromebug;
               var broken = cb.breakpointedScripts[script.tag];
               if (broken)
               {
                   delete cb.breakpointedScripts[script.tag];
               }

               if (!frame.callingFrame) // then top-level
               {
                   var scope = frame.scope;
                   if (scope)
                   {
                       while(scope.jsParent) // walk to the oldest scope
                           scope = scope.jsParent;

                       var frameGlobal = scope.getWrappedValue();
                       var tag = cb.globals.indexOf(frameGlobal);
                       if (tag < 0)
                           tag = cb.globals.push(frameGlobal) - 1;

                       var scopeName = getLocationSafe(frameGlobal);
                       if (!scopeName || !jsdState.avoidSelf(scopeName))
                       {
                           if (trace) Components.utils.reportError("assigning "+tag+" to "+frame.script.fileName+"\n");
                           cb.globalTagByScriptTag[frame.script.tag] = tag;

                           // add the unassigned innerscripts
                           for (var i = 0; i < cb.innerScripts.length; i++)
                           {
                               var script = cb.innerScripts[i];
                               if (script.fileName != frame.script.fileName)  // so what tag then?
                                   if (trace) Components.utils.reportError("innerscript "+script.fileName+" mismatch "+frame.script.fileName+"\n");
                               cb.globalTagByScriptTag[script.tag] = tag;
                           }
                       }
                       else
                       {
                           if (trace) Components.utils.reportError("dropping "+tag+" with location "+scopeName+"\n");
                       }
                       cb.innerScripts = [];
                   }
                   else // looks like this is where command line handlers end up
                       if (trace) Components.utils.reportError("no callingFrame and no executionContext for "+frame.script.fileName+"\n");
               }
               else // looks like .xml/.xul ends up here.
                   if (trace) Components.utils.reportError("callingFrame for "+frame.script.fileName+"\n");
               return Ci.jsdIExecutionHook.RETURN_CONTINUE;
           }
       };

       jsd.errorHook =
       {
           onError: function(message, fileName, lineNo, pos, flags, errnum, exc)
           {
               Components.utils.reportError("errorHook: "+message+"@"+ fileName +"."+lineNo+"\n");
               return true;
           }
       };

   },

   startJSDOnce: function()
   {
       if (!this.started)
           this.startJSD();
       this.started = true;
   },

   /* API */
   startOnStartupNextTime: function()
   {
       return;
       var catMan = Components.classes["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
       catMan.addCategoryEntry(STARTUP_TOPIC, CLASS_NAME,
               "service," + CONTRACT_ID, true, true);
       Components.utils.reportError("chromebug registered to listen for "+STARTUP_TOPIC+" components next time this program runs");
   },

   dontStartOnStartupNextTime: function()
   {
       return;
       var catMan = Components.classes["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
       catMan.deleteCategoryEntry(STARTUP_TOPIC, CLASS_NAME, true);
       Components.utils.reportError("chromebug deregistered to listen for "+STARTUP_TOPIC+" components next time this program runs");
   },

   getJSDState: function()
   {
       return gStartupObserverSingleton.jsdState;
   },

   /*  END API */
    initialize: function()
    {
       gStartupObserverSingleton.startJSDOnce();
    },

    shutdown: function()
    {

    },

    /* nsIObserve */
    observe: function(subject, topic, data)
    {
        if (topic == STARTUP_TOPIC) {
            Components.utils.reportError("StartupObserver "+topic);
            this.initialize();
            Components.utils.reportError("StartupObserver done");
            return;
        }
        else if (topic == "quit-application") {
            this.shutdown();
            return;
        }

    },

    /* nsIObserverService */
    addObserver: function(observer, topic, weak)
    {
        if (topic != "firebug-http-event")
            throw Cr.NS_ERROR_INVALID_ARG;

        this.observers.push(observer);
    },

    removeObserver: function(observer, topic)
    {
        if (topic != "firebug-http-event")
            throw Cr.NS_ERROR_INVALID_ARG;

        for (var i=0; i<this.observers.length; i++) {
            if (this.observers[i] == observer) {
                this.observers.splice(i, 1);
                break;
            }
        }
    },

    notifyObservers: function(subject, topic, data)
    {
        for (var i=0; i<this.observers.length; i++)
            this.observers[i].observe(subject, topic, data);
    },

    enumerateObservers: function(topic)
    {
        return null;
    },

    /* nsISupports */
    QueryInterface: function(iid)
    {
        if (iid.equals(Ci.nsISupports) ||
            iid.equals(Ci.nsIObserverService) ||
            iid.equals(Ci.nsIObserver)) {
            return this;
        }

        throw Cr.NS_ERROR_NO_INTERFACE;
    },

    trackFiles: {
            allFiles: {},

            add: function(script)
            {
                var name = new String(script.fileName);
                this.allFiles[name] = [script.functionName];
            },
            drop: function(fileName)
            {
                var name = new String(fileName);
                this.allFiles[name].push("dropped");
            },
            def: function(frame)
            {
                var scopeName = "noJSContext";
                var jscontext = frame.executionContext;
                if (jscontext)
                {
                    frameGlobal = jscontext.globalObject.getWrappedValue();
                    scopeName = getLocationSafe(frameGlobal);
                    if (!scopeName)
                        scopeName = "noGlobalObjectLocationInJSContext:"+(jscontext?jscontext.tag:"none");
                }

                var name = new String(frame.script.fileName);
                if (! (name in this.allFiles))
                    this.allFiles[name]=["not added"];

                this.allFiles[name].push(scopeName+" (from cbcl)");
            },
            dump: function()
            {
                var n = 0;
                for (var p in this.allFiles)
                {
                    tmpout( (++n) + ") "+p);
                    var where = this.allFiles[p];
                    if (where.length > 0)
                    {
                        for (var i = 0; i < where.length; i++)
                        {
                            tmpout(", "+where[i]);
                        }
                        tmpout("\n");
                    }
                    else
                        tmpout("     bp did not hit\n");

                }
            },
        },

}

function getLocationSafe(global)
{
    try
    {
        if (global && global.location)  // then we have a window, it will be an nsIDOMWindow, right?
            return global.location.toString();
        else if (global && global.tag)
            return "global_tag_"+global.tag;
    }
    catch (exc)
    {
        // FF3 gives (NS_ERROR_INVALID_POINTER) [nsIDOMLocation.toString]
    }
    return null;
}

// ************************************************************************************************
// Service factory

var gStartupObserverSingleton = null;
var StartupObserverFactory =
{
    createInstance: function (outer, iid)
    {
        if (outer != null)
            throw Cr.NS_ERROR_NO_AGGREGATION;

        if (iid.equals(Ci.nsISupports) ||
            iid.equals(Ci.nsIObserverService) ||
            iid.equals(Ci.nsIObserver))
        {
            if (!gStartupObserverSingleton)
                gStartupObserverSingleton = new StartupObserver();
            gStartupObserverSingleton.wrappedJSObject = gStartupObserverSingleton;
            return gStartupObserverSingleton.QueryInterface(iid);
        }

        throw Cr.NS_ERROR_NO_INTERFACE;
    },

    QueryInterface: function(iid)
    {
        if (iid.equals(Ci.nsISupports) ||
            iid.equals(Ci.nsISupportsWeakReference) ||
            iid.equals(Ci.nsIFactory))
            return this;

        throw Cr.NS_ERROR_NO_INTERFACE;
    }
};

// ************************************************************************************************
// Module implementation

var StartupObserverModule =
{
    registerSelf: function (compMgr, fileSpec, location, type)
    {
        compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
        compMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME,
            CONTRACT_ID, fileSpec, location, type);

        categoryManager.addCategoryEntry(STARTUP_TOPIC, CLASS_NAME,
            "service," + CONTRACT_ID, true, true);
    },

    unregisterSelf: function(compMgr, fileSpec, location)
    {
        compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
        compMgr.unregisterFactoryLocation(CLASS_ID, location);

        categoryManager.deleteCategoryEntry(STARTUP_TOPIC, CLASS_NAME, true);
    },

    getClassObject: function (compMgr, cid, iid)
    {
        if (!iid.equals(Ci.nsIFactory))
            throw Cr.NS_ERROR_NOT_IMPLEMENTED;

        if (cid.equals(CLASS_ID))
            return StartupObserverFactory;

        throw Cr.NS_ERROR_NO_INTERFACE;
    },

    canUnload: function(compMgr)
    {
        return true;
    }
};

// ************************************************************************************************

function NSGetModule(compMgr, fileSpec)
{
    return StartupObserverModule;
}


function getTmpFile()
{
    var file = Components.classes["@mozilla.org/file/directory_service;1"].
        getService(Components.interfaces.nsIProperties).
        get("TmpD", Components.interfaces.nsIFile);
    file.append("gstartup.tmp");
    file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);
    Components.utils.reportError("chromebug-startup-observer opened tmp file "+file.path+"\n");
    return file;
}

function getTmpStream(file)
{
    // file is nsIFile, data is a string
    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                             createInstance(Components.interfaces.nsIFileOutputStream);

    // use 0x02 | 0x10 to open file for appending.
    foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
    // write, create, truncate
    // In a c file operation, we have no need to set file mode with or operation,
    // directly using "r" or "w" usually.

    return foStream;
}
