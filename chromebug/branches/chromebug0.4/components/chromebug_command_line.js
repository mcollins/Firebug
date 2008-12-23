/* See license.txt for terms of usage */

const  nsIAppShellService    = Components.interfaces.nsIAppShellService;
const  nsISupports           = Components.interfaces.nsISupports;
const  nsICategoryManager    = Components.interfaces.nsICategoryManager;
const  nsIComponentRegistrar = Components.interfaces.nsIComponentRegistrar;
const  nsICommandLine        = Components.interfaces.nsICommandLine;
const  nsICommandLineHandler = Components.interfaces.nsICommandLineHandler;
const  nsIFactory            = Components.interfaces.nsIFactory;
const  nsIModule             = Components.interfaces.nsIModule;
const  nsIWindowWatcher      = Components.interfaces.nsIWindowWatcher;
const  jsdIExecutionHook 	 = Components.interfaces.jsdIExecutionHook;
const  jsdIFilter            = Components.interfaces.jsdIFilter;

const PrefService = Components.classes["@mozilla.org/preferences-service;1"];
const nsIPrefBranch2 = Components.interfaces.nsIPrefBranch2;
const prefs = PrefService.getService(nsIPrefBranch2);

const iosvc = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
const chromeReg = Components.classes["@mozilla.org/chrome/chrome-registry;1"].getService(Components.interfaces.nsIToolkitChromeRegistry);

const  clh_contractID = "@mozilla.org/commandlinehandler/general-startup;1?type=chromebug";
const appInfo =  Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);

const  clh_CID = Components.ID("{B5D5631C-4FE1-11DB-8373-B622A1EF5492}");

// category names are sorted alphabetically. Typical command-line handlers use a
// category that begins with the letter "m".
const  clh_category = "b-chromebug";

const  nsIWindowMediator = Components.interfaces.nsIWindowMediator;

/**
 * The XPCOM component that implements nsICommandLineHandler.
 * It also implements nsIFactory to serve as its own singleton factory.
 */
const  chromebugCommandLineHandler = {

    debug: false,

    openWindow: function(opener, windowType, url, w, h, params)
    {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
                    getService(Components.interfaces.nsIWindowMediator);

        var win = windowType ? wm.getMostRecentWindow(windowType) : null;

        if (win)
        {
            if ("initWithParams" in win)
                  win.initWithParams(params);
            win.focus();
            Components.utils.reportError("chromebugCommandLineHandler reused a window");
        }
        else
        {

            if (!w)
                w = opener.screen.availWidth;
            if (!h)
                h = opener.screen.availHeight;

            var features = "outerWidth="+w+","+"outerHeight="+h;

            var winFeatures = "resizable,dialog=no,centerscreen" + (features != "" ? ("," + features) : "");
            if (chromebugCommandLineHandler.debug)
            {
                Components.utils.reportError("chromebug_command_line opening window with features: "+features);
            }
            win = opener.openDialog(url, "_blank", winFeatures, params);
        }
        return win;
    },

    startJSD: function(window)
    {
        var DebuggerService = Components.classes["@mozilla.org/js/jsd/debugger-service;1"];
        var jsdIDebuggerService = Components.interfaces["jsdIDebuggerService"]
        jsd = DebuggerService.getService(jsdIDebuggerService);

        prefs.setBoolPref("extensions.firebug-service.filterSystemURLs", false);  // See firebug-service.js

        if (jsd.isOn)
            return;

        
        window.dump("chromebug_command_line version: "+appInfo.version+" gets jsd service, isOn:"+jsd.isOn+" initAtStartup:"+jsd.initAtStartup+"\n");		/*@explore*/

        prefs.setBoolPref("browser.dom.window.dump.enabled", true);  // Allows window.dump()
        prefs.setBoolPref("nglayout.debug.disable_xul_cache", true);
        prefs.setBoolPref("nglayout.debug.disable_xul_fastload", true);
        window.dump("WARNING: set nglayout.debug.disable_xul_fastload  and nglayout.debug.disable_xul_cache true\n");

        jsd.on();
        jsd.flags |= jsdIDebuggerService.DISABLE_OBJECT_TRACE;
        jsd.initAtStartup = true;
        
        this.setJSDFilters(jsd);
        this.hookJSDContexts(jsd, window);

        window.dump("chromebug_command_line sets jsd service, isOn:"+jsd.isOn+" initAtStartup:"+jsd.initAtStartup+"\n");		/*@explore*/
    },

    setJSDFilters: function(jsd)
    {
        var passDebuggerHalter = {
                globalObject: null,
                flags: jsdIFilter.FLAG_ENABLED | jsdIFilter.FLAG_PASS,
                urlPattern: "*/debuggerHalter.js",
                startLine: 0,
                endLine: 0
            };
        var filterChromebug = 
        {
             globalObject: null,
                flags: jsdIFilter.FLAG_ENABLED,
                urlPattern: "chrome://chromebug/*",
                startLine: 0,
                endLine: 0
            };
        var filterfb4cb = {
                globalObject: null,
                flags: jsdIFilter.FLAG_ENABLED,
                urlPattern: "chrome://fb4cb/*",
                startLine: 0,
                endLine: 0
            };
        var filterTrace = {
        		 globalObject: null,
                 flags: jsdIFilter.FLAG_ENABLED,
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
                window.dump("chromebug_command_line filter "+filter.urlPattern+" "+filter.flags+"\n");
            }});
    },
    
    hookJSDContexts: function(jsd, hiddenWindow)
    {
        // This is a minature version of the double hook in firebug-service.js
        hiddenWindow._chromebug = {};
        hiddenWindow._chromebug.scriptsByJSContextTag = {};
        hiddenWindow._chromebug.jsContext = {};
        hiddenWindow._chromebug.breakpointedScripts = {};

        jsd.scriptHook =
        {
            onScriptCreated: function(script)
            {
                 if (!script.functionName) // top or eval-level
                 {
                     var cb = hiddenWindow._chromebug;
                     if (!cb)
                     { 
                         // Somehow the hook can be called before the hiddenWindow object is updated?
                        //hiddenWindow.dump("onScriptCreated No hiddenWindow._chromebug for script:"+script.fileName+"\n");
                        return;
                     }
                     if (cb.breakpointedScripts)  // should never be false but is once
                     {
                         cb.breakpointedScripts[script.tag] = script;
                         script.setBreakpoint(0);
                     }
                 }
            },
            onScriptDestroyed: function(script)
            {
                if (!script.functionName) // top or eval-level
                {
                    var cb = hiddenWindow._chromebug;
                    if (!cb || !cb.breakpointedScripts)
                    {
                        // about 4 of these can come out, some timing bug in mozilla.
                        //hiddenWindow.dump("onScriptDestroyed No hiddenWindow._chromebug for script:"+script.fileName+"\n");
                        return;
                    }
                    var broken = cb.breakpointedScripts[script.tag];
                    if(broken)
                    {
                        delete cb.breakpointedScripts[script.tag];
                    }
                 }
            },
        };

        jsd.breakpointHook =
        {
            onExecute: function(frame, type, val)
            {
                frame.script.clearBreakpoint(0);
                var script = frame.script;
                var cb = hiddenWindow._chromebug;
                var broken = cb.breakpointedScripts[script.tag];
                if (broken)
                {
                    delete cb.breakpointedScripts[script.tag];
                }

                if (!frame.callingFrame) // then top-level
                {
                    if (frame.executionContext)
                    {
                        var tag = frame.executionContext.tag;
                        if(!cb.scriptsByJSContextTag[tag])
                        {
                            cb.scriptsByJSContextTag[tag] = [];
                            cb.jsContext[tag] = frame.executionContext;
                        }
                        cb.scriptsByJSContextTag[tag].push(frame.script);
                    }
                }
                return jsdIExecutionHook.RETURN_CONTINUE;
            }
        };

        jsd.errorHook =
        {
            onError: function(message, fileName, lineNo, pos, flags, errnum, exc)
            {
                hiddenWindow.dump("errorHook: "+message+"@"+ fileName +"."+lineNo+"\n");
                return true;
            }
        };

    },

    openChromebug: function(window)
    {
        var inType = "chromebug:ui"; // MUST BE windowType on chromebug.xul
        var url = "chrome://chromebug/content/chromebug.xul";
        var title = "ChromeBug";

        var prefedWidth = prefs.getIntPref("extensions.chromebug.outerWidth");
        var prefedHeight = prefs.getIntPref("extensions.chromebug.outerHeight");

        var chromeBugWindow = this.openWindow(window, inType, url, prefedWidth, prefedHeight);
        chromeBugWindow.document.title = title;

        if (chromebugCommandLineHandler.debug)
        {
            var chromeURI = iosvc.newURI(url, null, null);
            var localURI = chromeReg.convertChromeURL(chromeURI);
            Components.utils.reportError(title+" maps "+url+' to '+localURI.spec);
            Components.utils.reportError("ChromeBug x,y,w,h = ["+chromeBugWindow.screenX+","+chromeBugWindow.screenY+","+
               chromeBugWindow.width+","+chromeBugWindow.height+"]");
        }

        return chromeBugWindow;
    },

    openNow: function(window)
    {
        this.useExistingWindows = true;
        return this.openChromebug(window);
    },

  /* nsISupports */
  QueryInterface : function clh_QI(iid)
  {
    if (iid.equals(nsICommandLineHandler) ||
        iid.equals(nsIFactory) ||
        iid.equals(nsISupports))
    {
        this.wrappedJSObject = this;
        return this;
    }

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  /* nsICommandLineHandler */

    handle : function clh_handle(cmdLine)
    {
        try
        {
            var appShellService = Components.classes["@mozilla.org/appshell/appShellService;1"].
                getService(Components.interfaces.nsIAppShellService);
            window = appShellService.hiddenDOMWindow;

            chromebugCommandLineHandler.startJSD(window);

            window.dump("Chromebug Command Line Handler taking arguments from state:"+cmdLine.state+"\n");
            for (var i = 0; i < cmdLine.length; i++)
                window.dump("Chromebug Command Line Handler arguments on cmdLine: "+cmdLine.length+"."+i+")"+cmdLine.getArgument(i)+"\n");

            if (cmdLine.state == cmdLine.STATE_REMOTE_AUTO) // FF is already running
            {
                var skipChrome = cmdLine.handleFlagWithParam("chrome", false); // take ourselves out
                window.dump("Chromebug Command Line Handler removing chrome arguments from command line:"+skipChrome+"\n");
                var noFF = cmdLine.handleFlag("firefox", false); // take out the flag but not the URL if any
                var noProfile = cmdLine.handleFlagWithParam("p", false); // remove annoying messages about -p
            }
            else  // New chromebug that may launch FF
            {
                try 
                {
                    var launchChromebug = cmdLine.handleFlag("chromebug", false);
                    if (launchChromebug)
                        chromebugCommandLineHandler.openChromebug(window);
                }
                catch (e)
                {
                }
                try
                {
                    this.firefoxURL = cmdLine.handleFlagWithParam("firefox", false);
                }
                catch (e)
                {
                    // either there was no url or we had a exception, we'll never know which
                }

                if (this.firefoxURL)
                    this.firefox = true;
                else  // try form without URL
                    this.firefox = cmdLine.handleFlag("firefox", false);

                try
                {
                    this.appURL = cmdLine.handleFlagWithParam("app", false);
                    if (this.appURL)
                    {
                    	this.firefox = true;
                    	this.firefoxURL = this.appURL; // same api anyway
                    }
                }
                catch (e)
                {
                }
                
                if (this.firefox)
                	window.dump("Chromebug Command line sees firefox with url:"+this.firefoxURL+"\n");
            }
        }
        catch (e)
        {
            Components.utils.reportError("Chromebug Command Line Handler FAILS: "+e);
            return;
        }
    },

    getFFURL: function(cmdLine)
    {
           if (cmdLine.length > 0)
           {
               var requestedSpec = cmdLine.getArgument(cmdLine.length - 1); // last arg may be URL
               if (requestedSpec.indexOf("-") != 0 && requestedSpec.indexOf(":") != -1)
               {
                   try
                   {
                       var url = iosvc.newURI(requestedSpec, null, null);
                       // if we got here then we have a URL

                       var spec = url.spec;

                       window.dump("Chromebug Command Line Handler taking argument: "+spec+"\n");
                       cmdLine.removeArguments(cmdLine.length - 1, cmdLine.length - 1);
                       return spec;
                   }
                   catch (exc)
                   {
                       window.dump("Chromebug Command Line Handler did not find a URL from requestedSpec:"+requestedSpec+"\n");
                       return false;
                   }
               }
           }
    },

  // CHANGEME: change the help info as appropriate, but
  // follow the guidelines in nsICommandLineHandler.idl
  // specifically, flag descriptions should start at
  // character 24, and lines should be wrapped at
  // 72 characters with embedded newlines,
  // and finally, the string should end with a newline
  //          01234567890123456789001234
  helpInfo : "  -chrome                 chrome://chromebug/content/chromebug.xul   Launch chromebug \n"+
             "  -firefox                <url> chromebug should start Firefox with <url>\n"+
             "  -chromebug              start chromebug then continue as normal\n",

  /* nsIFactory */

  createInstance : function clh_CI(outer, iid)
  {
    if (outer != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;

    return this.QueryInterface(iid);
  },

  lockFactory : function clh_lock(lock)
  {
    /* no-op */
  }
};

/**
 * The XPCOM glue that implements nsIModule
 */
const  chromebugCommandLineHandlerModule = {
  /* nsISupports */
  QueryInterface : function mod_QI(iid)
  {
    if (iid.equals(nsIModule) ||
        iid.equals(nsISupports))
      return this;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  /* nsIModule */
  getClassObject : function mod_gch(compMgr, cid, iid)
  {
    if (cid.equals(clh_CID))
      return chromebugCommandLineHandler.QueryInterface(iid);

    throw Components.results.NS_ERROR_NOT_REGISTERED;
  },

  registerSelf : function mod_regself(compMgr, fileSpec, location, type)
  {
    compMgr.QueryInterface(nsIComponentRegistrar);

    compMgr.registerFactoryLocation(clh_CID,
                                    "chromebugCommandLineHandler",
                                    clh_contractID,
                                    fileSpec,
                                    location,
                                    type);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
      getService(nsICategoryManager);
    catMan.addCategoryEntry("command-line-handler",
                            clh_category,
                            clh_contractID, true, true);
  },

  unregisterSelf : function mod_unreg(compMgr, location, type)
  {
    compMgr.QueryInterface(nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation(clh_CID, location);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
      getService(nsICategoryManager);
    catMan.deleteCategoryEntry("command-line-handler", clh_category);
  },

  canUnload : function (compMgr)
  {
    return true;
  }
};

/* The NSGetModule function is the magic entry point that XPCOM uses to find what XPCOM objects
 * this component provides
 */
function NSGetModule(comMgr, fileSpec)
{
  return chromebugCommandLineHandlerModule;
}
