/* See license.txt for terms of usage */

// ************************************************************************************************
// Constants

const CLASS_ID = Components.ID("{287716D2-140B-11DE-912E-E0FC55D89593}");
const CLASS_NAME = "@@@Chromebug Startup Observer Service";
const CONTRACT_ID = "@getfirebug.com/chromebug-startup-observer;1";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const STARTUP_TOPIC = "profile-after-change";

var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
var categoryManager = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);


const reXUL = /\.xul$|\.xml$|^XStringBundle$/;
const trace = false;

const PrefService = Components.classes["@mozilla.org/preferences-service;1"];
const nsIPrefBranch2 = Components.interfaces.nsIPrefBranch2;
const prefs = PrefService.getService(nsIPrefBranch2);

// ************************************************************************************************
// Startup Request Observer implementation
//Components.utils.reportError("Chromebug startup observer start top level");
function StartupObserver()
{
    this.observers = [];
}

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

var gStartupObserverSingleton = null;

StartupObserver.prototype =
{
    /* XPCOM voodoo */
    classID: Components.ID("{287716D2-140B-11DE-912E-E0FC55D89593}"),
    contractID: CONTRACT_ID,
    QueryInterface: XPCOMUtils.generateQI([Ci.nsISupports,Ci.nsIObserverService,Ci.nsIObserver]),

    _xpcom_categories: [ {category: STARTUP_TOPIC, entry: CLASS_NAME, value: CONTRACT_ID, service: true} ],

    _xpcom_factory:
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
        lockFactory: function(){}, // no-op
    },
    /* end XPCOM voodoo */

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
        if (trace) Components.utils.reportError("chromebug starting jsd");
        var DebuggerService = Cc["@mozilla.org/js/jsd/debugger-service;1"];
        var jsdIDebuggerService = Ci["jsdIDebuggerService"];
        jsd = DebuggerService.getService(jsdIDebuggerService);

        if (jsd.asyncOn)
        {
            jsd.asyncOn({
                onDebuggerActivated: this.onDebuggerActivated
            });
        }
        else
        {
            jsd.on();
            this.onDebuggerActivated();
        }


    },

    onDebuggerActivated: function()
    {
        jsd.flags |= jsd.DISABLE_OBJECT_TRACE;
        if (jsd.initAtStartup)
            jsd.initAtStartup = false;

        var self = StartupObserver.prototype;

        self.setJSDFilters(jsd);

        self.hookJSDContexts(jsd,  self.getJSDState());

        Components.utils.reportError("FYI: Chromebug onDebuggerActivated jsd engine; JIT will be disabled ");
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

       if (trace)
       {
           jsd.enumerateFilters({ enumerateFilter: function(filter)
           {
               Components.utils.reportError("gStartupObserverSingleton filter "+filter.urlPattern+" "+filter.flags+"\n");
           }});
       }
   },

   hookJSDContexts: function(jsd, jsdState)
   {
       // This is a minature version of the double hook in firebug-service.js
       jsdState._chromebug = {};
       jsdState._chromebug.globalTagByScriptTag = {};
       jsdState._chromebug.globalTagByScriptFileName = {};
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

                var cb = jsdState._chromebug;
                if (!cb)
                {
                     // Somehow the hook can be called before the jsdState object is updated?
                     //if (trace) jsdState.dump("onScriptCreated No jsdState._chromebug for script:"+script.fileName+"\n");
                     return;
                }
                if ( reXUL.test(script.fileName) )
                {
                    if (!(script.fileName in cb.xulScriptsByURL))
                        cb.xulScriptsByURL[script.fileName] = [];
                    cb.xulScriptsByURL[script.fileName].push(script); // test for valid when removed
                    if (!cb.breakpointedScripts)
                        cb.breakpointedScripts = {};

                    cb.breakpointedScripts[script.tag] = script;
                    script.setBreakpoint(0);
                    //gStartupObserverSingleton.trackFiles.add(script,"XUL");
                    return;
                }
                if (!script.functionName) // top or eval-level
                {
                    if (cb.breakpointedScripts)  // should never be false but is once
                    {
                        cb.breakpointedScripts[script.tag] = script;
                        script.setBreakpoint(0);
                        //gStartupObserverSingleton.trackFiles.add(script, "bp");
                        return;
                    }
                }
                cb.innerScripts.push(script);
                //gStartupObserverSingleton.trackFiles.add(script, "inner");
                return;
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
               frame.script.clearBreakpoint(0);
               var script = frame.script;
               //if (trace) jsdState.dump("breakpointHook script "+script.tag+"\n");
               var cb = jsdState._chromebug;
               var broken = cb.breakpointedScripts[script.tag];
               if (broken)
               {
                   delete cb.breakpointedScripts[script.tag];
               }

               if ( reXUL.test(script.fileName) ) // we set a bp in every script with these names
               {
                  // here we are treating the first bp that hits as the outer script
                   var scripts = cb.xulScriptsByURL[script.fileName];
                   for (var i = 0; i < scripts.length; i++)
                   {
                       var s = scripts[i];
                       s.clearBreakpoint(0);
                       delete cb.breakpointedScripts[s.tag];
                       if (s.tag === script.tag)
                           scripts.splice(i,1); // remove the 'outerscript' so the inner ones remain
                   }
                   var saveInner = [];
                   for (var i = 0; i < cb.innerScripts.length; i++)
                       saveInner[i] = cb.innerScripts[i];

                   cb.innerScripts = scripts;
                   analyzeScope(cb, frame, jsdState);
                   cb.innerScripts = saveInner;
               }
               if (!frame.callingFrame) // then top-level
               {
                   if (frame.scope)
                       analyzeScope(cb, frame, jsdState);
                   else // no scope, looks like this is where command line handlers end up
                       if (trace) Components.utils.reportError("no callingFrame and no executionContext for "+frame.script.fileName+"\n");
               }

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

    getSingleton: function()
    {
        return gStartupObserverSingleton;
    },

    getJSDState: function()
    {
       if (!gStartupObserverSingleton.jsdState)
           gStartupObserverSingleton.jsdState = {};
       return gStartupObserverSingleton.jsdState;
    },

   /*  END API */
    initialize: function()
    {
        if(!gStartupObserverSingleton)
        {
            gStartupObserverSingleton = new StartupObserver();
            gStartupObserverSingleton.wrappedJSObject = gStartupObserverSingleton;
            //Components.utils.reportError("StartupObserver created singleton "+gStartupObserverSingleton.wrappedJSObject);
        }

        gStartupObserverSingleton.startJSDOnce();
    },

    shutdown: function()
    {

    },

    /* nsIObserve */
    observe: function(subject, topic, data)
    {
        Components.utils.reportError("StartupObserver "+topic);
        if (topic == STARTUP_TOPIC) {
            if (trace) Components.utils.reportError("StartupObserver "+topic);
            var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
            observerService.addObserver(this, "command-line-startup", false);
            var chromebugLaunch = prefs.getBoolPref("extensions.chromebug.launch");

            if (chromebugLaunch)
            {
                Components.utils.reportError("Chromebug "+topic+" extensions.chromebug.launch: "+chromebugLaunch);
                this.initialize();
            }
            else
            {
                Components.utils.reportError("Chromebug "+topic+" extensions.chromebug.launch: "+chromebugLaunch);
            }

            return;
        }
        else if (topic === "command-line-startup")
        {
            return;
            Components.utils.reportError("Chromebug "+topic+" command-line-startup");
             if (subject instanceof Ci.nsICommandLine)
             {
                 var cmdLine = Cc["@mozilla.org/toolkit/command-line;1"].createInstance(Ci.nsICommandLine);
                 if (Ci.nsICommandLineRunner)
                 {
                     Components.utils.reportError("Chromebug nsICommandLineRunner Exists");
                     if (cmdLine instanceof Ci.nsICommandLineRunner)
                         Components.utils.reportError("Chromebug nsICommandLineRunner isa");
                 }
                 else
                     Components.utils.reportError("Chromebug nsICommandLineRunner NOT");

                 for (var p in cmdLine)
                     Components.utils.reportError("Chromebug cmdLine."+p+"="+ cmdLine[p]);
                 //subject.preventDefault = true;
                 Components.utils.reportError("Chromebug subject.preventDefault"+ subject.preventDefault);
             }
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

    trackFiles: {
            allFiles: {},

            add: function(script, comment)
            {
                var name = new String(script.fileName);
                if (!this.allFiles[name])
                    this.allFiles[name] = [script.tag+(comment?comment:"")];
                else
                    this.allFiles[name].push(script.tag+(comment?comment:""));
            },

            drop: function(fileName, mismatch)
            {
                var name = new String(fileName);
                this.allFiles[name].push("dropped because of "+mismatch);
            },
            def: function(scriptFileName, scopeName, scriptTag, frameGlobalTag)
            {
                var name = new String(scriptFileName);
                if (! (name in this.allFiles))
                    this.allFiles[name]=["no onScriptCreated for this filename"];

                this.allFiles[name].push("[cbso] "+scopeName+" outer script tag: "+scriptTag+" frameGlobalTag: "+frameGlobalTag);
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

const reObject = /\[object ([^\]]*)/;

function getGlobalName(global)
{
    var label = safeToString(global);          // eg [object XPCWrappedNative [object foo
    var m = reObject.exec(label);
    var n = null;
    if (m)
        n = reObject.exec(m[1]);
    if (n)
        return n[1];

    return m ? m[1] : label;
}

function safeToString(ob)
{
    try
    {
        if (ob && (typeof (ob['toString']) == "function") )
            return ob.toString();
    }
    catch (exc)
    {
    }
    return "[object has no toString() function]";
};
var fbs = {
        getOutermostScope: function(frame)
        {
            var scope = frame.scope;
            if (scope)
            {
                while(scope.jsParent)
                    scope = scope.jsParent;

                // These are just determined by trial and error.
                if (scope.jsClassName == "Window" || scope.jsClassName == "ChromeWindow" || scope.jsClassName == "ModalContentWindow")
                {
                    lastWindowScope = wrapIfNative(scope.getWrappedValue());
                    return  lastWindowScope;
                }

              if (scope.jsClassName == "Sandbox")
                {
                    var proto = scope.jsPrototype;
                    if (proto.jsClassName == "XPCNativeWrapper")  // this is the path if we have web page in a sandbox
                    {
                        proto = proto.jsParent;
                        if (proto.jsClassName == "Window")
                            return wrapIfNative(proto.getWrappedValue());
                    }
                    else
                    {
                        return wrapIfNative(scope.getWrappedValue());
                    }
                }

                return wrapIfNative(scope.getWrappedValue());  // not a window or a sandbox
            }
            else
            {
                return null;
            }
        },

};

function wrapIfNative(obj)
{
    try
    {
        if (obj instanceof Ci.nsISupports)
            return XPCNativeWrapper(obj);
        else
            return obj;
    }
    catch(exc)
    {
    }
}

function analyzeScope(cb, frame, jsdState)
{
    var scope = frame.scope;
    while(scope.jsParent) // walk to the oldest scope
        scope = scope.jsParent;

    var frameGlobal = fbs.getOutermostScope(frame);
    var frameGlobalTag = cb.globals.indexOf(frameGlobal);
    if (frameGlobalTag < 0)
    {
        cb.globals.push(frameGlobal);
        frameGlobalTag = cb.globals.indexOf(frameGlobal);
    }

    var scopeName = getLocationSafe(frameGlobal);
    if (!scopeName)
    {
        var globalName = getGlobalName(frameGlobal);
        if (globalName)
            scopeName = "noWindow://"+globalName;
    }
    if (false) //jsdState.avoidSelf(scopeName))
    {
        //gStartupObserverSingleton.trackFiles.drop(frame.script.fileName, scopeName);

        if (trace) Components.utils.reportError("dropping "+frameGlobalTag+" with location "+scopeName+"\n");
    }
    else
    {
        if (trace) Components.utils.reportError("assigning "+frameGlobalTag+" to "+frame.script.fileName+"\n");

        cb.globalTagByScriptTag[frame.script.tag] = frameGlobalTag;
        cb.globalTagByScriptFileName[frame.script.fileName] = frameGlobalTag;
        // add the unassigned innerscripts
        for (var i = 0; i < cb.innerScripts.length; i++)
        {
            var script = cb.innerScripts[i];
            if (script.fileName != frame.script.fileName)  // so what frameGlobalTag then?
                if (trace) Components.utils.reportError("innerscript "+script.fileName+" mismatch "+frame.script.fileName+"\n");
            cb.globalTagByScriptTag[script.tag] = frameGlobalTag;
        }
        //gStartupObserverSingleton.trackFiles.def(frame.script.fileName, scopeName+" with "+cb.innerScripts.length, frame.script.tag, cb.globalTagByScriptTag[frame.script.tag]);
    }
    cb.innerScripts = [];
}

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([StartupObserver]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([StartupObserver]);

function getTmpFile()
{
    var file = Components.classes["@mozilla.org/file/directory_service;1"].
        getService(Components.interfaces.nsIProperties).
        get("TmpD", Components.interfaces.nsIFile);
    file.append("gstartup.tmp");
    file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);
    if (trace) Components.utils.reportError("chromebug-startup-observer opened tmp file "+file.path+"\n");
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
//Components.utils.reportError("Chromebug startup observer top level");