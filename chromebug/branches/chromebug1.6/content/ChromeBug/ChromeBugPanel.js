/* See license.txt for terms of usage */

/*
 * This file has a lot of experimental code, partly because I am unsure about the model and partly because so
 * much of this is unknown to anyone.
 *
 * For the most part Chromebug is a wrapper around Firebug. You can see from the UI it is Firebug with an extra
 * top toolbar.
 *
 * The biggest difference is that Firebug deals with neatly contained windows whose life time in contained with in
 * browser.xul. Chromebug deals multiple XUL windows and components, some with lifetimes similar to Chromebug itself.
 *
 * Firebug creates a meta-data object called "context" for each web page. (So it incorrectly mixes iframe info)
 * Chromebug creates a context for each nsIDOMWondow plus one for components.
 *
 * Most of Chromebug works on any XUL application. A few uses of DTD or CSS files from 'browser' causes problems
 * however.
 *
 */

FBL.ns(function chromebug() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;
const windowWatcher = CCSV("@mozilla.org/embedcomp/window-watcher;1", "nsIWindowWatcher");
const windowMediator = CCSV("@mozilla.org/appshell/window-mediator;1", "nsIWindowMediator");
const nsIDOMWindow = Ci.nsIDOMWindow;
const nsIDOMDocument = Ci.nsIDOMDocument;
const nsIXULWindow = Ci.nsIXULWindow;
const nsIDocShellTreeItem = Ci.nsIDocShellTreeItem;
const nsIDocShell = Ci.nsIDocShell;
const nsIInterfaceRequestor = Ci.nsIInterfaceRequestor;
const nsIWebProgress = Ci.nsIWebProgress;
const nsISupportsWeakReference = Ci.nsISupportsWeakReference;
const nsISupports = Ci.nsISupports;
const nsISupportsCString = Ci.nsISupportsCString;
const jsdIExecutionHook = Components.interfaces.jsdIExecutionHook;

const NOTIFY_ALL = nsIWebProgress.NOTIFY_ALL;
const nsIObserverService = Ci.nsIObserverService
const observerService = CCSV("@mozilla.org/observer-service;1", "nsIObserverService");



const iosvc = CCSV("@mozilla.org/network/io-service;1", "nsIIOService");
const chromeReg = CCSV("@mozilla.org/chrome/chrome-registry;1", "nsIToolkitChromeRegistry");
const directoryService = CCSV("@mozilla.org/file/directory_service;1", "nsIProperties");
const Application = Cc["@mozilla.org/fuel/application;1"].getService(Ci.fuelIApplication);


const PrefService = Cc["@mozilla.org/preferences-service;1"];
const nsIPrefBranch2 = Components.interfaces.nsIPrefBranch2;
const prefs = PrefService.getService(nsIPrefBranch2);
const nsIPrefService = Components.interfaces.nsIPrefService;
const prefService = PrefService.getService(nsIPrefService);

const reComponents = /:\/(.*)\/components\//; // chrome:/ or file:/
const reExtensionInFileURL = /file:.*\/extensions\/([^\/]*)/;
const reResource = /resource:\/\/([^\/]*)\//;
const reModules = /:\/\/(.*)\/modules\//; // chrome:// or file://
const reWeb = /(^http:|^ftp:|^mailto:|^https:|^ftps:)\//;
const reXUL = /\.xul$|\.xml$|^XStringBundle$/;

const fbBox = $("fbContentBox");
const interfaceList = $("cbInterfaceList");
const inspectClearProfileBar = $("fbToolbar");
const appcontent = $("appcontent");
const cbContextList = $('cbContextList');
const cbPackageList = $('cbPackageList');
const versionURL = "chrome://chromebug/content/branch.properties";
const fbVersionURL = "chrome://firebug/content/branch.properties";

const statusText = $("cbStatusText");
this.namespaceName = "ChromeBug";

var previousContext = {global: null};

//*******************************************************************************

top.Chromebug = {}; // our namespace

function GlobalScopeInfo(context)
{
    this.context = context;
    this.kindOfInfo = "Info";
}

GlobalScopeInfo.prototype =
{
    getContext: function()
    {
        return this.context;
    },
    getObjectDescription: function()
    {
        return {path: "global:", name:"?"}
    },
    getObjectLocation: function()
    {
        var d = this.getObjectDescription();
        return d.path+d.name;
    },
    getGlobal: function()
    {
        throw "GlobalScopeInfo: must override";
    }

}

// Global Scopes - Visible

Chromebug.ContainedDocument = function(xul_window, context)
{
    this.xul_window = xul_window;
    this.context = context;
    this.kindOfInfo = "Contained";
};

function ChromeRootGlobalScopeInfo(xul_window, context)
{
    this.docShell = xul_window.docShell;  // nsiDOMWindow
    this.xul_window = xul_window;
    this.context = context;
    this.kindOfInfo = "ChromeRoot";
};

Chromebug.ContainedDocument.prototype = extend(GlobalScopeInfo.prototype,
{

    //**********************************************************
    // Global Scope
    getContext: function()
    {
        return this.context;
    },

    getObjectDescription: function()
    {
        var xul_window = this.getContainingXULWindow();
        var index = Chromebug.XULAppModule.getXULWindowIndex(xul_window) + 1;
        var win = Chromebug.XULAppModule.getDOMWindowByXULWindow(xul_window);
        var title = index +". "+this.getDocumentType()+" in "+" ("+(win?win.document.title:"?no window?")+")";
        return {path: title, name: this.getDocumentLocation() }
    },

    //*************************************************************
    getDocumentType: function()
    {
        var docShell = this.getDocShell();
        if (docShell instanceof nsIDocShellTreeItem)
        {
            var typeIndex = this.getDocShell().itemType;
            return docShellTypeNames[typeIndex];
        }
        else
            FBTrace.sysout("Chromebug.getDocumentType, docShell is not a nsIDocShellTreeItem:", docShell);
    },

    getDocumentLocation: function()
    {
        var doc = this.getDocument();
        if (doc)
            return doc.location.href;
        else
            FBTrace.sysout("getDocumentLocation no document in this.docShell", this.docShell);
    },

    getContainingXULWindow: function()
    {
        return this.xul_window;
    },

    getDocument: function() // nsIDOMDocument
    {
        return this.getDOMWindow().document;
    },

    getDocShell: function()
    {
        if (!this.docShell)
        {
            this.docShell = Chromebug.XULAppModule.getDocShellByDOMWindow(this.getDOMWindow());
        }
        return this.docShell;
    },

    getDOMWindow: function()
    {
        return this.context.window;  // pkg:
    },

    getGlobal: function()
    {
        return this.getDOMWindow();
    },

    getRootDOMWindow: function()  // maybe a container hierarchy?
    {
        return  Chromebug.XULAppModule.getDOMWindowByXULWindow(this.xul_window);
    },

});

ChromeRootGlobalScopeInfo.prototype = Chromebug.ContainedDocument.prototype;

function HiddenWindow(domWindow, context)
{
    this.domWindow = domWindow;
    this.context = context;
    this.kindOfInfo = "Hidden";
}

HiddenWindow.prototype = extend( GlobalScopeInfo.prototype,
{
    getObjectDescription: function()
    {
        var path = "Hidden Window";
        var name = this.context.window.location.href; // pkg:
        return {path: path, name: name}
    },

    getContext: function()
    {
        return this.context;
    },

    getGlobal: function()
    {
        return this.domWindow;
    }
});

function FrameGlobalScopeInfo(global, context)  // came first from debugger frame
{
    this.domWindow = global;  // maybe
    this.global = global;
    this.context = context;
    this.kindOfInfo = "Frame";
}

FrameGlobalScopeInfo.prototype = extend (HiddenWindow.prototype,
{
    getObjectDescription: function()
    {
        var path = "Frame://";
        var name = "no valid window location";
        try
        {
            if (this.context.window.location)
                name = this.context.window.location.href;

        }
        catch (exc)
        {
            FBTrace.sysout("FrameGlobalScopeInfo location.href fails, status:"+(this.context.window?this.context.window.status:"no window"), exc);
            FBTrace.sysout("FrameGlobalScopeInfo global", this.global);
        }
        return {path: path, name: name}
    },
    getContext: function()
    {
        return this.context;
    },

    getGlobal: function()
    {
        return this.global;
    }
});

function JSContextScopeInfo(jsClassName, global, context, jsContext)  // came first from debugger frame
{
    this.domWindow = null;  // maybe
    this.global = global;
    this.jsClassName = jsClassName;
    this.context = context;
    this.kindOfInfo = "JSContext";
    this.jsContextTag = (jsContext ? jsContext.tag : 0);
}

JSContextScopeInfo.prototype = extend (FrameGlobalScopeInfo.prototype,
{
    getObjectDescription: function()
    {
        return {path: this.jsClassName, name: " "+this.jsContextTag };
    }
});

Chromebug.globalScopeInfos =
{
    allGlobalScopeInfos: [],

    getGlobalScopeInfos: function()
    {
        return this.allGlobalScopeInfos;
    },

    add: function(context, gs)
    {
        this.allGlobalScopeInfos.push( gs );
        context.globalScope = gs;  // pkg: this creates a one:one

        if(!FirebugContext)
                FirebugContext = context;  // pkg: currently focused context

        Chromebug.packageList.assignContextToPackage(context);

        Firebug.loadedContext(context);
        if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("globalScopeInfos add "+ gs.kindOfInfo+" for context "+context.uid+", "+context.getName() );
    },

    addHiddenWindow: function(hidden_window)
    {
        var context = Firebug.Chromebug.getOrCreateContext(hidden_window);  // addHiddenWindow
        this.hiddenWindow = new HiddenWindow(hidden_window, context);
        this.add(context, this.hiddenWindow);
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("addHiddenWindow as context "+context.getName());
        return context;
    },

    getComponentInfo: function()
    {
        return this.hiddenWindow;
    },

    getGlobalScopeInfoByContext: function(context)
    {
        if (context.globalScope)
            return context.globalScope;

        for (var i = 0; i < this.allGlobalScopeInfos.length; i++)
        {
            if (this.allGlobalScopeInfos[i].getContext() == context)
                return this.allGlobalScopeInfos[i];
        }
    },

    getGlobalScopeInfoByGlobal: function(global)
    {
        for(var i = 0; i < this.allGlobalScopeInfos.length; i++)
        {
            var globalScopeInfo = this.allGlobalScopeInfos[i];
            if (globalScopeInfo.getGlobal() == global)
                return globalScopeInfo;
        }
    },

    remove: function(gs)
    {
        if (gs)
            remove(this.allGlobalScopeInfos, gs);
        if (gs && FBTrace.DBG_CHROMEBUG) FBTrace.sysout("globalScopeInfos remove "+ gs.kindOfInfo+ " "+gs.context.uid+", "+gs.context.getName());
    },

    destroy: function(context)
    {
        var gs = this.getGlobalScopeInfoByContext(context);
        this.remove(gs);
    }

}

// ************************************************************************************************

Chromebug.ProgressListener = function(xul_window, xul_watcher)
{
    this.xul_window = xul_window;
    this.xul_watcher = xul_watcher;
    this.outerDOMWindow = this.xul_watcher.getDOMWindowByXULWindow(this.xul_window);
    this.FBTrace = FBTrace;
    this.Chromebug = Firebug.Chromebug;
}

Chromebug.ProgressListener.prototype =
{
    QueryInterface: function(iid)
    {
        if (iid.equals(Components.interfaces.nsIWebProgressListener)
            || iid.equals(Components.interfaces.nsISupportsWeakReference)
            || iid.equals(Components.interfaces.nsISupports))
        {
            return this;
        }

        throw Components.results.NS_NOINTERFACE;
    },
    safeName: function(request)
    {
        try
        {
            if (request && request.name)
                return request.name;
        }
        catch (exc)
        {
        }
        return null;
    },
    traceWindow: function(webProgress, request)
    {
        var name = this.safeName(request);
        var progress = "\"" + webProgress.DOMWindow.document.title +"\" ("+ webProgress.DOMWindow.location.href+") in XUL window ";
        return progress + "\""+this.outerDOMWindow.document.title+"\" ("+this.outerDOMWindow.location.href+") "+(name?name:"no-name")+" ";
    },
    stateIsRequest: false,
    onLocationChange: function(webProgress, request, uri)
    {
            if (FBTrace.DBG_WINDOWS)
                FBTrace.sysout("Chromebug.ProgressListener.onLocationChange "+this.traceWindow(webProgress, request)+" to uri=\'"                                        /*@explore*/
                                          +(uri?uri.spec:"null location")+"\'\n");


    },
    onStateChange : function(webProgress, request, flags, status)
    {
        if (FBTrace.DBG_WINDOWS)
            FBTrace.sysout("Chromebug.ProgressListener.onStateChange: "+this.traceWindow(webProgress, request)+" "+getStateDescription(flags)+"\n");
    },

    onProgressChange : function(webProgress, request, curSelfProgress, maxSelfProgress, curTotalProgress, maxTotalProgress)
    {
        if (FBTrace.DBG_WINDOWS)
            FBTrace.sysout("Chromebug.ProgressListener.onProgressChange: "+this.traceWindow(webProgress, request)+" current: "+
                curSelfProgress+"/"+maxSelfProgress+" total: "+curTotalProgress+"/"+maxTotalProgress+"\n");
    },
    onStatusChange : function(webProgress, request, flags, status)
    {
        if (FBTrace.DBG_WINDOWS)
            FBTrace.sysout("Chromebug.ProgressListener.onStatusChange: "+this.traceWindow(webProgress, request)+" "+getStateDescription(flags)+"\n");
    },
    onSecurityChange : function(webProgress, request, flags)
    {
        if (FBTrace.DBG_WINDOWS)
            FBTrace.sysout("Chromebug.ProgressListener.onSecurityChange: "+this.traceWindow(webProgress, request)+" "+getStateDescription(flags)+"\n");
    },
    onLinkIconAvailable : function(aBrowser)
    {
        FBTrace.sysout("Chromebug.ProgressListener.onLinkIconAvailable: "+this.traceWindow(webProgress, request), aBrowser);
    },
};

// We register a Module so we can get initialization and shutdown signals and so we can monitor context activities
//
Firebug.Chromebug = extend(Firebug.Module,
{
    // This is our interface to TabWatcher
    fakeTabBrowser: {browsers: []},

    getBrowsers: function()
    {
         return Firebug.Chromebug.fakeTabBrowser.browsers;
    },

    getCurrentBrowser: function()
    {
        return this.fakeTabBrowser.selectedBrowser;
    },

    onXULWindowAdded: function(xul_window, outerDOMWindow)
    {
        try
        {
            var context = Firebug.Chromebug.getOrCreateContext(outerDOMWindow);
            context.xul_window = xul_window;
            var gs = new ChromeRootGlobalScopeInfo(xul_window, context);
            Chromebug.globalScopeInfos.add(context, gs);

            if (Chromebug.XULAppModule.stateReloader)  // TODO this should be per xul_window
                outerDOMWindow.addEventListener("DOMContentLoaded", Firebug.Chromebug.stateReloader, true);

            // 'true' for capturing, so all of the sub-window loads also trigger
            context.onLoad = bind(context.loadHandler, context);
            outerDOMWindow.addEventListener("DOMContentLoaded", context.onLoad, true);

            context.onUnload = bind(context.unloadHandler, context)
            outerDOMWindow.addEventListener("unload", context.onUnload, true);

            outerDOMWindow.addEventListener("keypress", bind(Chromebug.XULAppModule.keypressToBreakIntoWindow, this, context), true);
        }
        catch(exc)
        {
            FBTrace.sysout("onXULWindowAdded FAILS "+exc, exc);
        }
    },

    // Browsers in ChromeBug hold our context info

    createBrowser: function(global, fileName)
    {
        var browser = document.createElement("browser");  // in chromebug.xul
        // Ok, this looks dubious. Firebug has a context for every browser (tab), we have a tabbrowser but don;t use the browser really.
        browser.persistedState = null;
        browser.showFirebug = true;
        browser.detached = true;
        browser.webProgress =
        {
            isLoadingDocument: false // we are already in Firefox so we must not be loading...
        };
        browser.addProgressListener = function() {}
        browser.contentWindow = global;
        browser.tag = this.fakeTabBrowser.browsers.length;

        var browserName = null;
        var browserNameFrom = "global.location";
        if (global && global instanceof Window && global.location)
        {
            var browserName = safeToString(global.location);
        }
        else if (isDataURL(browserName))
        {
            var props = splitDataURL(browserName);
            FBTrace.sysout('isDataURL props ', props);
            browserNameFrom = "dataURL";
            browserName = props['decodedfileName'];
        }
        else if (fileName)
        {
            browserNameFrom = "fileName";
            if (fileName.indexOf('jetpack') > 0) // hack around jetpack hack
            {
                browserName = "chrome://jetpack/content/js/jquery-sandbox.js"
            }
            else
                browserName = fileName;
        }
        else
        {
            browserNameFrom = "fake tag";
            var browserName = "chrome://chromebug/fakeTabBrowser/"+browser.tag;
        }

        browser.currentURI = makeURI(browserName);

        if (!browser.currentURI)
        {
            FBTrace.sysout("createBrowser create name from "+browserNameFrom+" gave browserName "+browserName+' FAILED makeURI ' + (global?safeToString(global):"no global") );
        }

        this.fakeTabBrowser.browsers[browser.tag] = browser;
        this.fakeTabBrowser.selectedBrowser = this.fakeTabBrowser.browsers[browser.tag];
        this.fakeTabBrowser.currentURI = browser.currentURI; // allows tabWatcher to showContext
        FBTrace.sysout("createBrowser "+browser.tag+" global:"+(global?safeToString(global):"no global")+" for browserName "+browserName+' with URI '+browser.currentURI.spec);
        return browser;
    },

    selectBrowser: function(browser)
    {
        this.fakeTabBrowser.selectedBrowser = browser;
        this.fakeTabBrowser.currentURI = browser.currentURI; // allows tabWatcher to showContext
    },

    selectContext: function(context)  // this operation is similar to a user picking a tab in Firefox, but for chromebug
    {
        if (!context)
            return;

        Firebug.Chromebug.selectBrowser(context.browser);
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("selectContext "+context.getName() + " with context.window: "+safeGetWindowLocation(context.window) );

        if (FirebugContext)
            context.panelName = FirebugContext.panelName; // don't change the panel with the context in Chromebug

        if (context.window && context.window instanceof Ci.nsIDOMWindow && !context.window.closed)
            TabWatcher.watchTopWindow(context.window, context.browser.currentURI, false);

        Firebug.showContext(context.browser, context);  // sets FirebugContext and syncs the tool bar

        Chromebug.contextList.setCurrentLocation(context);
    },

    dispatchName: "chromebug",

    onOptionsShowing: function(menu)
    {
        FBTrace.sysout("Firebug.Chromebug.onOptionsShowing\n");
    },

    getProfileURL: function()
    {
        var profileURL = Firebug.Chromebug.getPlatformStringURL("ProfD");
        return profileURL;
    },

    getPlatformStringURL: function(string)
    {
        var dir = directoryService.get(string, Components.interfaces.nsIFile);
        var URL = FBL.getURLFromLocalFile(dir);
        return URL;
    },

    debug: FBTrace.DBG_CHROMEBUG,

    initialize: function()
    {
        FBTrace.DBG_CHROMEBUG = Firebug.getPref("extensions.chromebug", "DBG_CHROMEBUG");
        FBTrace.DBG_CB_CONSOLE = Firebug.getPref("extensions.chromebug", "DBG_CB_CONSOLE");

        this.fbVersion = Firebug.loadVersion(fbVersionURL);

        this.fullVersion = Firebug.loadVersion(versionURL);
        if (this.fullVersion)
            document.title = "Chromebug "+this.fullVersion +" on Firebug "+this.fbVersion;

        var versionCompat = (parseFloat(this.fbVersion) == parseFloat(this.fullVersion));
        if (!versionCompat)
            document.title =  ">>>>> Chromebug "+this.fullVersion+" requires Firebug "+parseFloat(this.fullVersion)+" but found "+this.fbVersion+" <<<<<";

        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("Chromebug.initialize this.fullVersion: "+this.fullVersion+" in "+document.location+" title:"+document.title);

        this.uid = FBL.getUniqueId();

        if (!this.contexts)
            this.contexts = TabWatcher.contexts;

        window.arguments[0] = {browser: this.fakeTabBrowser};

        Chromebug.XULAppModule.addListener(this);  // XUL window creation monitoring
        Firebug.Debugger.addListener(this);
        Firebug.Debugger.setDefaultState(true);

        Chromebug.packageList.addListener(Chromebug.allFilesList);  // how changes to the package filter are sensed by AllFilesList

        Firebug.TraceModule.addListener(this);

        if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("Chromebug.initialize module "+this.uid+" Firebug.Debugger:"+Firebug.Debugger.fbListeners.length+" window.location="+window.location+"\n");

        var wantIntro = prefs.getBoolPref("extensions.chromebug.showIntroduction");

        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("Chromebug.initializeUI from prefs wantIntro: "+wantIntro+"\n");

        if (wantIntro || !versionCompat)
            fbBox.setAttribute("collapsed", true);
        else
            Firebug.Chromebug.toggleIntroduction();

        this.prepareForCloseEvents();
        this.restructureUI();

        // cause onJSDActivate to be triggered.
        this.initializeDebugger();
        // from this point forward scripts should come via debugger interface

        // Wait to let the initial windows open, then return to users past settings
        this.retryRestoreID = setInterval( bind(Firebug.Chromebug.restoreState, this), 500);
        setTimeout( function stopTrying()
        {
            if(Firebug.Chromebug.stopRestoration())  // if the window is not up by now give up.
            {
                var context = Chromebug.contextList.getCurrentLocation();
                if (context)
                    Chromebug.contextList.setDefaultLocation(context);
                else
                    context = Chromebug.contextList.getDefaultLocation();

                Firebug.Chromebug.selectContext(context);
                if (FBTrace.DBG_INITIALIZE)
                    FBTrace.sysout("Had to stop restoration, set context to "+context.getName());
            }

        }, 5000);

        window.addEventListener("unload", function whyIsThis(event)
        {
            FBTrace.sysout("unloading " + window.location, getStackDump());
        }, true);
    },

    prepareForCloseEvents: function()
    {
        // Prepare for close events
        var chromeBugDOMWindow = document.defaultView; // or window.parentNode.defaultView
        this.onUnloadTopWindow = bind(this.onUnloadTopWindow, this); // set onUnload hook on the domWindow of our chromebug
        chromeBugDOMWindow.addEventListener("close", this.onUnloadTopWindow, true);
    },

    restructureUI: function()
    {
        Firebug.setChrome(FirebugChrome, "detached"); // 1.4
    },

    restoreState: function()  // TODO context+file
    {
        var previousStateJSON = prefs.getCharPref("extensions.chromebug.previousContext");
        if (previousStateJSON && previousStateJSON.length > 2)
        {
            var previousState = parseJSONString(previousStateJSON, window.location.toString());
            if (!previousState)
            {
                FBTrace.sysout("restoreState could not parse previousStateJSON "+previousStateJSON);
                this.stopRestoration();
                return;
            }
            else
            {
                FBTrace.sysout("restoreState parse previousStateJSON "+previousStateJSON, previousState);
            }

            var context = this.restoreContext(previousState);
            if (context)
            {
                var pkg = this.restoreFilter(previousState, context);

                FirebugContext = context;
                this.stopRestoration();

                var panelName = previousState.panelName;
                var sourceLink = previousState.sourceLink;
                // show the restored context, after we let the init finish
                setTimeout( function delayShowContext()
                {
                    if (sourceLink)
                        FirebugChrome.select(sourceLink, panelName);
                    else if (panelName)
                        FirebugChrome.selectPanel(panelName);
                    else
                        FirebugChrome.selectPanel('trace');
                });
            }
            // else keep trying

        }
        else
        {
            if (FBTrace.DBG_INITIALIZE)
                FBTrace.sysout("restoreState NO previousStateJSON ");
            this.stopRestoration(); // no reason to beat our head against the wall...
        }
    },

    restoreContext: function(previousState)
    {
        var name = previousState.contextName;
        var context = Firebug.Chromebug.eachContext(function matchName(context){
            if (context.getName() == name)
                return context;
        });
        if (context)
        {
            Chromebug.contextList.setCurrentLocation( context );
            FBTrace.sysout("restoreState found previousState and set context "+context.getName());
            return context;
        }
        else
        {
            FBTrace.sysout("restoreState did not find context "+name);
            return false;
        }
    },

    restoreFilter: function(previousState, context)
    {
        if (previousState.pkgName)
        {
            var pkg = Chromebug.packageList.getPackageByName(previousState.pkgName);
            if (pkg)
            {
                Chromebug.packageList.setCurrentLocation(pkg.getContextDescription(context));
                FBTrace.sysout("restoreFilter found "+previousState.pkgName+" and set PackageList to ", Chromebug.packageList.getCurrentLocation());
                return pkg;
            }
            else  // we had a package named, but its not available (yet?)
                return false;
        }
        else
        {
            FBTrace.sysout("restoreFilter, no pkgName");
            this.stopRestoration(); // we had a context but no package name, oh well we did our best.
            return false;
        }
    },

    saveState: function(context)  // only call on user operations
    {
        this.stopRestoration();

        var panel = Firebug.chrome.getSelectedPanel();
        if (panel && panel.getSourceLink)
        {
            var sourceLink = panel.getSourceLink();
            if (sourceLink)
                var sourceLinkJSON = sourceLink.toJSON();
        }

        var pkgDescription = Chromebug.packageList.getCurrentLocation();

        var previousContextJSON = "{"+
            " \"contextName\": \"" + context.getName() +"\"," +
            (pkgDescription? (" \"pkgName\": \"" + pkgDescription.pkg.name +"\",") : "") +
            (panel? (" \"panelName\": \"" + panel.name +"\",") : "") +
            (sourceLinkJSON? (" \"sourceLink\": " + sourceLinkJSON+", ") : "") +
            "}";
        prefs.setCharPref("extensions.chromebug.previousContext", previousContextJSON);
        prefService.savePrefFile(null);
        FBTrace.sysout("saveState "+previousContextJSON);
    },

    stopRestoration: function()
    {
        FBTrace.sysout("stopRestoration retryRestoreID: "+this.retryRestoreID);
        if (this.retryRestoreID)
        {
            clearTimeout(this.retryRestoreID);
            delete this.retryRestoreID;
            return true;
        }
        else
            return false;
    },

    setDefaultContext: function()
    {
        Firebug.Chromebug.selectContext(Firebug.Chromebug.contexts[0]);
    },

    initializeDebugger: function()
    {
        fbs.DBG_FBS_FF_START = true;

        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("initializeDebugger start, enabled: "+fbs.enabled+" ******************************");

        Firebug.Debugger.isChromeDebugger = true;
        Firebug.Debugger.wrappedJSObject = Firebug.Debugger;
        Firebug.Debugger.addListener(this);
        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("initializeDebugger complete ******************************");

    },

    onUnloadTopWindow: function(event)
    {
        try
        {
            event.currentTarget.removeEventListener("close", this.onUnloadTopWindow, true);
            FBTrace.sysout("onUnloadTopWindow ", event);
            FirebugChrome.shutdown();
        }
        catch(exc)
        {
            FBTrace.sysout("onUnloadTopWindow FAILS", exc);
        }
    },

    shutdown: function()
    {
        if(Firebug.getPref("extensions.chromebug", 'defaultPanelName')=='ChromeBug')
            Firebug.setPref("extensions.chromebug", 'defaultPanelName','console');
        prefs.setIntPref("extensions.chromebug.outerWidth", window.outerWidth);
        prefs.setIntPref("extensions.chromebug.outerHeight", window.outerHeight);

        if (FBTrace.DBG_CHROMEBUG)
             FBTrace.sysout("Firebug.Chromebug.shutdown set prefs w,h="+window.outerWidth+","+window.outerHeight+")\n");

        window.dump(window.location+ " shutdown:\n "+getStackDump());

        Firebug.shutdown();
        if(FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("ChromeBugPanel.shutdown EXIT\n");
    },

    showPanel: function(browser, panel)
    {
        try {
            if (panel && panel.name == "ChromeBug")
            {
                panel.showPanel();

                if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("showPanel module:"+this.uid+" panel:"+panel.uid+" location:"+panel.location+"\n");
            }
        } catch(e) {
            FBTrace.sysout("chromebug.showPanel error", e);
        }
    },

    // ******************************************************************************
    createContext: function(global, frame)
    {
        var persistedState = null; // TODO
        // domWindow in fbug is browser.contentWindow type nsIDOMWindow.
        // docShell has a nsIDOMWindow interface

        var browser = Firebug.Chromebug.createBrowser(global, (frame?frame.script.fileName:null));
        if (global instanceof Ci.nsIDOMWindow)
        {
            var context = TabWatcher.watchTopWindow(global, safeGetWindowLocation(global), true);

        var url = safeToString(global ? global.location : null);
            if (isDataURL(url))
            {
                var lines = context.sourceCache.load(url);
                var props = splitDataURL(url);
                if (props.fileName)
                    context.sourceCache.storeSplitLines(props.fileName, lines);
                FBTrace.sysout("createContext data url stored in to context under "+(props.fileName?props.fileName+ " & ":"just dataURL ")+url);
            }
        }
        else
        {
            var context = TabWatcher.createContext(global, browser, Chromebug.DomWindowContext);
        }

        if (FBTrace.DBG_ACTIVATION)
            FBTrace.sysout('+++++++++++++++++++++++++++++++++ Chromebug.createContext nsIDOMWindow: '+(global instanceof Ci.nsIDOMWindow)+" name: "+context.getName(), context);
        context.onLoadWindowContent = true; // all Chromebug contexts are active
        return context;
    },

    eachContext: function(fnTakesContext)
    {
        for (var i = 0; i < this.contexts.length; i++)
        {
            var rc = fnTakesContext(this.contexts[i]);
            if (rc)
                return rc;
        }
        return false;
    },

    eachSourceFile: function(fnTakesSourceFile)
    {
        return Firebug.Chromebug.eachContext(function visitSourceFiles(context)
        {
            for (var url in context.sourceFileMap)
            {
                if (context.sourceFileMap.hasOwnProperty(url))
                {
                    var sourceFile = context.sourceFileMap[url];
                    var rc = fnTakesSourceFile(sourceFile);
                    if (rc)
                        return rc;
                }
            }
        });
    },

    getContextByJSContextTag: function(jsContextTag)
    {
         return this.eachContext(function findMatch(context)
         {
             if (context.jsContextTag == jsContextTag)
                 return context;
         });
    },

    getOrCreateContext: function(global, frame)
    {
        var context = Firebug.Chromebug.getContextByGlobal(global);

        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("--------------------------- getOrCreateContext got context: "+(context?context.getName():"to be created"));
        if (!context)
            context = Firebug.Chromebug.createContext(global, frame);

        return context;
    },

    getContextByGlobal: function(global)
    {
        if (!this.contexts)
            this.contexts = TabWatcher.contexts;


        if (global instanceof Window)
        {
            var docShellType = Chromebug.XULAppModule.getDocumentTypeByDOMWindow(global);
            if (docShellType === "Content")
                return TabWatcher.getContextByWindow(global);
        }

        for (var i = 0; i < this.contexts.length; ++i)
        {
            var context = this.contexts[i];
            if (context.global && (context.global == global)) // will that test work?
                return context;
        }

        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("getContextByGlobal; no find and not instanceof Content Window "+safeToString(global));

        return null;
    },

    initContext: function(context)
    {
        if (FBTrace.DBG_CHROMEBUG)
        {
                try {
                    FBTrace.sysout("Firebug.Chromebug.Module.initContext "+this.dispatchName+" context: "+context.uid+", "+context.getName()+" FirebugContext="+(FirebugContext?FirebugContext.getName():"undefined")+"\n");
                    //window.dump(getStackDump());
                } catch(exc) {
                    FBTrace.sysout("Firebug.Chromebug.Module.initContext "+exc+"\n");
                }
        }
    },

    loadedContext: function(context)
    {
         if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("Firebug.Chromebug.Module.loadedContext context: "+context.getName()+"\n");
    },

    showContext: function(browser, context)
    {
        if (context)
        {
            for( var i = 0; i < this.contexts.length; i++)
            {
                if (context == this.contexts[i])
                {
                    var sources = 0;
                    for (var s in context.sourceFileMap)
                        sources++;
                    this.setStatusText("context: "+context.getName()+", "+(i+1)+"/"+this.contexts.length+"; "+sources+" sources");
                    return;
                }
            }

            this.setStatusText("context (unmatched)/"+this.contexts.length);
            Firebug.Chromebug.contextAnalysis(context);
        }
        else
        {
            var context = Chromebug.contextList.getDefaultLocation();
            if (context)
                Firebug.Chromebug.selectContext(context);
            else
            {
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("!!!! CONTEXT IS NULL !!!!!!");
                this.setStatusText("context (>> unset << )/"+this.contexts.length);
            }
        }
    },

    reattachContext: function(browser, context) // FirebugContext from chrome.js
    {
        // this is called after the chromebug window has opened.
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBugPanel. reattachContext for context:"+context.uid+" isChromeBug:"+context.isChromeBug+"\n");
    },

    unwatchWindow: function(context, win)
    {
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBugPanel.unwatchWindow for context:"+context.getName()+"(uid="+context.uid+") isChromeBug:"+context.isChromeBug+"\n");

    },

    destroyContext: function(context)
    {
        if (context.browser)
            delete context.browser.detached;

        Chromebug.packageList.deleteContext(context);
        Chromebug.globalScopeInfos.destroy(context);

        var currentSelection = Chromebug.contextList.getCurrentLocation();

        if ((currentSelection && currentSelection == context) || (!currentSelection) )
        {
         // Pick a new context to be selected.
            var contexts = TabWatcher.contexts;
            for (var i = contexts.length; i; i--)
            {
                nextContext = contexts[i - 1];
                if (!nextContext)
                    FBTrace.sysout("Chromebug destroycontext TabWatcher.contexts has an undefined value at i-1 "+(i-1)+"/"+TabWatcher.contexts.length);
                if (nextContext.window && nextContext.window.closed)
                    continue;
                if (nextContext != context)
                    break;
            }

           if (FBTrace.DBG_CHROMEBUG)
           {
               if (nextContext)
                   FBTrace.sysout("ChromeBugPanel.destroyContext " +context.getName()+" nextContext: "+nextContext.getName());
               else
                   FBTrace.sysout("ChromeBugPanel.destroyContext " +context.getName()+" null nextContext with contexts.length: "+contexts.length);
           }

            Firebug.Chromebug.selectContext(nextContext);
        }
    },


    // ********************************************************
    // implements Firebug.DebuggerListener

    onPauseJSDRequested: function(rejection)
    {
        rejection.push(true);
        FBTrace.sysout("chromebug onPauseJSDRequested: rejection ", rejection);
    },

    onJSDDeactivate: function(active, why)
    {
        FBTrace.sysout("chromebug onJSDDeactivate active: "+active+" why "+why);
    },

    onJSDActivate: function(active, why)  // just before hooks are set in fbs
    {
        if (Firebug.Chromebug.activated)
            return;

        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBug onJSDActivate "+(this.jsContexts?"already have jsContexts":"take the stored jsContexts"));
        try
        {
            var jsdState = Application.storage.get('jsdState', null);
            if (!jsdState || !jsdState._chromebug)
            {
                setTimeout(function waitForFBTrace()
                {
                    FBTrace.sysout("ChromeBug onJSDActivate NO jsdState! Applcation:", Application);
                }, 1500);
                return;
            }
            //https://developer.mozilla.org/En/Working_with_windows_in_chrome_code TODO after FF2 is history, us Application.storage
            if (jsdState._chromebug)
            {
                // For now just clear the breakpoints, could try to put these into fbs .onX
                var bps = jsdState._chromebug.breakpointedScripts;
                for (tag in bps)
                {
                   var script = bps[tag];
                   if (script.isValid)
                       script.clearBreakpoint(0);
                }
                delete 	jsdState._chromebug.breakpointedScripts;

                var globals = jsdState._chromebug.globals; // []
                var globalTagByScriptTag = jsdState._chromebug.globalTagByScriptTag; // globals index by script tag
                var globalTagByScriptFileName = jsdState._chromebug.globalTagByScriptFileName; // globals index by script fileName
                var xulScriptsByURL = jsdState._chromebug.xulScriptsByURL;
                Firebug.Chromebug.buildInitialContextList(globals, globalTagByScriptTag, xulScriptsByURL, globalTagByScriptFileName);

                delete jsdState._chromebug.globalTagByScriptTag;
                delete jsdState._chromebug.jsContexts;

                // We turned on jsd to get initial values. Maybe we don't want it on
                if (!Firebug.Debugger.isAlwaysEnabled())
                    fbs.countContext(false); // connect to firebug-service

            }
            else
                FBTrace.sysout("ChromebugPanel.onJSDActivate: no _chromebug in startupObserver, maybe the command line handler is broken\n");

        }
        catch(exc)
        {
            FBTrace.sysout("onJSDActivate fails "+exc, exc);
        }
        finally
        {
            Firebug.Chromebug.activated = true;
            FBTrace.sysout("onJSDActivate exit");
        }
    },

    isChromebugURL: function(URL)
    {
        if (URL)
            return (URL.indexOf("/chromebug/") != -1 || URL.indexOf("/fb4cb/") != -1 || URL.indexOf("/firebug-service.js") != -1);
        else
            return false;
    },

    buildInitialContextList: function(globals, globalTagByScriptTag, xulScriptsByURL, globalTagByScriptFileName)
    {
        FBL.jsd.enumerateScripts({enumerateScript: function(script)
            {
                var url = normalizeURL(script.fileName);
                if (!url)
                {
                    if (FBTrace.DBG_SOURCEFILES)
                        FBTrace.sysout("buildEnumeratedSourceFiles got bad URL from script.fileName:"+script.fileName, script);
                    return;
                }

                if (script.isValid)
                    script.clearBreakpoint(0);  // just in case

                if (Firebug.Chromebug.isChromebugURL(url))
                {
                    delete globalTagByScriptTag[script.tag];
                    return;
                }

                var globalsTag = globalTagByScriptTag[script.tag];
                if (typeof (globalsTag) == 'undefined' )
                {
                    globalsTag = globalTagByScriptFileName[script.fileName];
                    if ( typeof (globalsTag) == 'undefined' )
                    {
                        //if (FBTrace.DBG_ERRORS)
                            FBTrace.sysout("buildEnumeratedSourceFiles NO globalTag for script tag "+script.tag+" in "+script.fileName);
                        return;
                    }
                    else
                    {
                        FBTrace.sysout("buildEnumeratedSourceFiles globalTag: "+globalsTag+" for "+script.fileName);
                    }
                }

                var global = globals[globalsTag];
                if (global)
                {
                    if (Firebug.Chromebug.isChromebugURL(safeToString(global.location)))
                    {
                        delete globalTagByScriptTag[script.tag];
                        return;
                    }

                    var context = null;
                    if (previousContext.global == global)
                        context = previousContext;
                    else
                        context = Firebug.Chromebug.getOrCreateContext(global);
                }

                if (!context)
                {
                    if (! Firebug.Chromebug.unreachablesContext)
                        Firebug.Chromebug.unreachablesContext = Firebug.Chromebug.createContext();
                        Firebug.Chromebug.unreachablesContext.setName("chrome://unreachable/");
                    context =  Firebug.Chromebug.unreachablesContext;
                    FBTrace.sysout("buildEnumeratedSourceFiles NO context for script tag "+script.tag+" in "+script.fileName+" with globalsTag "+globalsTag);
                }
                previousContext = context;

                var sourceFile = context.sourceFileMap[url];

                if (!sourceFile)
                {
                    sourceFile = new Firebug.EnumeratedSourceFile(url);
                    context.addSourceFile(sourceFile);
                }
                if (FBTrace.DBG_SOURCEFILES)
                    FBTrace.sysout("Using globalsTag "+globalsTag+ " assigned "+script.tag+"|"+url+" to "+ context.getName());
                sourceFile.innerScripts[script.tag] = script;

                delete globalTagByScriptTag[script.tag];
            }});
        if (FBTrace.DBG_SOURCEFILES)
        {
            var lostScriptTags = {};
            for (var scriptTag in globalTagByScriptTag)
            {
                var globalTag = globalTagByScriptTag[scriptTag];
                if (!(globalTag in lostScriptTags))
                    lostScriptTags[globalTag] = [];
                lostScriptTags[globalTag].push(scriptTag);
            }
            for (var globalTag in lostScriptTags)
            {
                FBTrace.sysout("Lost scripts from globalTag "+globalTag+" :"+lostScriptTags[globalTag].join(', '));
            }
        }
    },

    getAppShellService: function()
    {
        if (!this.appShellService)
            this.appShellService = Components.classes["@mozilla.org/appshell/appShellService;1"].
                getService(Components.interfaces.nsIAppShellService);
        return this.appShellService;
    },

    onStop: function(context, frame, type, rv)
    {
        // FirebugContext is not context. Maybe this does not happen in firebug because the user always starts
        // with an active tab with FirebugContext and cause the breakpoints to land in the default context.
        if (FirebugContext != context)
            Firebug.showContext(context.browser, context);

        var stopName = getExecutionStopNameFromType(type);
        FBTrace.sysout("ChromeBugPanel.onStop type: "+stopName+ " context.getName():"+context.getName() + " context.stopped:"+context.stopped );
        try
        {
            var src = frame.script.isValid ? frame.script.functionSource : "<invalid script>";
        } catch (e) {
            var src = "<invalid script>";
        }

        FBTrace.sysout("ChromeBugPanel.onStop script.tag: "+frame.script.tag+" @"+frame.line+":"+frame.pc+" in "+frame.script.fileName, "source:"+src);

        var cbContextList = document.getElementById('cbContextList');
        cbContextList.setAttribute("highlight", "true");

        return -1;
    },

    onResume: function(context)
    {
        var cbContextList = document.getElementById('cbContextList');
        cbContextList.removeAttribute("highlight");

        var panel = context.getPanel("script", true);
        if (panel && panel.location)
        {
            var location = "0@"+panel.location.href;

            if (panel.selectedSourceBox) // see firebug.js buildViewAround
                var lineNo = panel.selectedSourceBox.firstViewableLine + panel.selectedSourceBox.halfViewableLines;

            if (lineNo)
                location = lineNo+"@"+panel.location.href;

            //prefs.setCharPref("extensions.chromebug.previousContext", location);
            //prefService.savePrefFile(null);

            if (FBTrace.DBG_INITIALIZE)
                FBTrace.sysout("ChromeBugPanel.onResume previousContext:"+ location);
        }
        FBTrace.sysout("ChromeBugPanel.onResume context.getName():"+context.getName() + " context.stopped:"+context.stopped );

    },

    onThrow: function(context, frame, rv)
    {
        return false; /* continue throw */
    },

    onError: function(context, frame, error)
    {
    },


    onFunctionConstructor: function(context, frame, ctor_script, url)
    {
        FBTrace.sysout("ChromeBug onFunctionConstructor");
    },

    onSourceFileCreated: function(context, sourceFile)
    {
        var description = Chromebug.parseURI(sourceFile.href);
        var pkg = Chromebug.packageList.getOrCreatePackage(description);
        pkg.appendContext(context);
        if (FBTrace.DBG_SOURCEFILES)
            FBTrace.sysout("onSourceFileCreated sourceFile "+sourceFile.href+" in  "+pkg.name+" context "+context.getName());
    },

    getGlobalByFrame: function(frame)
    {
        return fbs.getOutermostScope(frame);
    },
    //******************************************************************************
    // traceModule listener

    onLoadConsole: function(win, rootNode)
    {
        if (rootNode)
        {
            rootNode.addEventListener("click", function anyClick(event)
            {
                //FBTrace.sysout("Chromebug click on traceConsole ", event);
                var isAStackFrame = hasClass(event.target, "stackFrameLink");
                if (isAStackFrame)
                {
                    var context = FirebugContext;
                    var info = getAncestorByClass(event.target, "messageInfoBody");
                    var message = info.repObject;
                    if (!message && info.wrappedJSObject)
                        message = info.wrappedJSObject.repObject;
                    if (message)
                    {
                        var filename = encodeURI(event.target.text);
                        var line = event.target.getAttribute("lineNumber");

                        var found = Chromebug.allFilesList.eachSourceFileDescription(function findMatching(d)
                        {
                            var testName = d.href;
                            //FBTrace.sysout("click traceConsole filename "+ filename +"=?="+testName);
                            if (testName == filename)
                            {
                                var context = d.context;
                                if (context)
                                {
                                    Firebug.Chromebug.selectContext(context);
                                    FBTrace.sysout("onLoadConsole.eventListener found matching description: "+d+" context set to "+context.getName(), message);
                                    var link = new SourceLink(filename, line, "js" );
                                    FBTrace.sysout("Chromebug click on traceConsole isAStackFrame SourceLink:"+(link instanceof SourceLink), {target: event.target, href: filename, lineNo:line, link:link});
                                    Firebug.chrome.select(link, "script");
                                    return true;
                                }
                                else
                                    FBTrace.sysout("onLoadConsole.eventListener no context in matching description", d);
                            }
                            return false;
                        });
                        if (!found)
                        {
                            if (filename) // Fallback is to just open the view-source window on the file
                                viewSource(filename, line);
                            else
                                FBTrace.sysout("onLoadConsole.eventListener no filename in event target", event);
                        }
                    }
                    else
                        FBTrace.sysout("onLoadConsole.eventListener no message found on info", info);

                    event.stopPropagation();
                }

            },true);
            FBTrace.sysout("Chromebug onLoadConsole set hook");
        }
    },
    //******************************************************************************

    formatLists: function(header, lists)
    {
        var str = header;
        for (listName in lists)
        {
            str += listName + "\n";
            var list = lists[listName];
            for (var i = 0; i < list.length; i++ )
            {
                str += "   "+list[i].toString() + "\n";
            }
        }
        return str;
    },

    createSourceFile: function(sourceFileMap, script)
    {
            var url = normalizeURL(script.fileName);
            if (!url)
            {
                FBTrace.sysout("createSourceFile got bad URL from script.fileName:"+script.fileName, script);
                return;
            }
            var sourceFile = sourceFileMap[url];
            if (!sourceFile)
            {
                sourceFile = new Firebug.EnumeratedSourceFile(url);
                sourceFileMap[url] = sourceFile;
                if (FBTrace.DBG_SOURCEFILES)
                    FBTrace.sysout("Firebug.Chromebug.createSourceFile script.fileName="+url+"\n");
            }
            sourceFile.innerScripts.push(script);
    },

    addComponentScripts: function(sourceFileMap)
    {
        FBL.jsd.enumerateScripts({enumerateScript: function(script)
        {
            var url = normalizeURL(script.fileName);
            var c = reComponents.exec(url);
            if (c)
            {
                var sourceFile = sourceFileMap[url];
                if (!sourceFile)
                {
                    sourceFile = new Firebug.EnumeratedSourceFile(url);
                    sourceFileMap[url] = sourceFile;
                    var name = c[1];
                    sourceFile.component = name;
                    if (FBTrace.DBG_SOURCEFILES)
                        FBTrace.sysout("Firebug.Chromebug.getComponents found script.fileName="+url+"\n");
                }
                sourceFile.innerScripts.push(script);
            }
            else
            {
                if (url.indexOf('/components/') != -1)
                    FBTrace.sysout("Firebug.Chromebug.getComponents missed="+url+"\n");
            }
        }});
    },

    //*****************************************************************************

    watchDocument: function(window)
    {
        var doc = window.document;
        doc.addEventListener("DOMAttrModified", this.onMutateAttr, false);
        doc.addEventListener("DOMCharacterDataModified", this.onMutateText, false);
        doc.addEventListener("DOMNodeInserted", this.onMutateNode, false);
        doc.addEventListener("DOMNodeRemoved", this.onMutateNode, false);
    },

    unWatchDocument: function(window)
    {
        var doc = window.document;
        doc.removeEventListener("DOMAttrModified", this.onMutateAttr, false);
        doc.removeEventListener("DOMCharacterDataModified", this.onMutateText, false);
        doc.removeEventListener("DOMNodeInserted", this.onMutateNode, false);
        doc.removeEventListener("DOMNodeRemoved", this.onMutateNode, false);
    },

    onMutateAttr: function(event) {
        FBTrace.sysout("Firebug.Chromebug.onMutateAttr\n");
    },

    onMutateText: function(event) {
        FBTrace.sysout("Firebug.Chromebug.onMutateText\n");
    },

    onMutateNode: function(event) {
        FBTrace.sysout("Firebug.Chromebug.onMutateNode\n");
    },
    //**************************************************************************************
    // Commands

    toggleIntroductionTrue: function()
    {
        prefs.setBoolPref("extensions.chromebug.showIntroduction", false);
        prefService.savePrefFile(null);
        Firebug.Chromebug.toggleIntroduction();
    },

    showIntroduction: true,

    toggleIntroduction: function()
    {
        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("toggleIntroduction ", "Firebug.Chromebug.showIntroduction "+ Firebug.Chromebug.showIntroduction);
        Firebug.Chromebug.showIntroduction = !Firebug.Chromebug.showIntroduction;

        if (Firebug.Chromebug.showIntroduction)
        {
            $('content').removeAttribute("collapsed");
            fbBox.setAttribute("collapsed", true);
        }
        else
        {
            $('content').setAttribute("collapsed", true);
            fbBox.removeAttribute("collapsed");
        }

    },

    setStatusText: function(text)
    {
         statusText.setAttribute("value", text);
         statusText.setAttribute("collapsed", false);
    },

    reload: function(skipCache)
    {
        // get the window we plan to kill
        var current_location = Chromebug.contextList.getCurrentLocation();
        FBTrace.sysout("Firebug.Chromebug.reload current_location", Chromebug.contextList.getObjectLocation(current_location));
        if (current_location && current_location.getContainingXULWindow)
        {
            var xul_window = current_location.getContainingXULWindow();
            if (xul_window && xul_window instanceof nsIXULWindow)
            {
                var reloadedWindow = Firebug.Chromebug.reloadWindow(xul_window);
                if (reloadedWindow)
                    return;
            }
        }
        // else ask for a window
        cbContextList.showPopup();
    },

    chromeList: function()
    {
        var w = window.screen.availWidth;
        var h = window.screen.availHeight;
        features = "outerWidth="+w+","+"outerHeight="+h;
        var params = "";
        this.chromeList = openWindow('chromelist', "chrome://chromebug/content/chromelist.xul", features, params);
    },

    openXULExplorer: function()
    {FBTrace.sysout("Firebug.Chromebug.xulExplorer\n");
        var w = window.screen.availWidth;
        var h = window.screen.availHeight;
        features = "outerWidth="+w+","+"outerHeight="+h;
        var params = "";
        var chromeURI = makeURI("chrome://explorer/content/explorer.xul");
        try
        {
            var localURI = chromeReg.convertChromeURL(chromeURI);
        }
        catch (exc)
        {
            // wow, what a sucky API, at least one exception means "no find"
        }
        if (localURI)
        {
            prefs.addObserver("toolkit",  this.cleanUpXULExplorer, false);
            prefs.addObserver("javascript", this.avoidStrict, false);
            prefs.clearUserPref("toolkit.defaultChromeURI"); // avoid XULExplorer popups
            this.xulExplorer = openWindow('xulExplorer',"chrome://explorer/content/explorer.xul" , features, params);
        }
        else
            openWindow('getXULExplorer', "chrome://chromebug/content/getXULExplorer.html");

    },

    cleanUpXULExplorer: function(subject, topic, data)
    {
        if (data)
        {
            var c = data.indexOf("defaultChromeURI");
            if (c >= 0)
                prefs.clearUserPref("toolkit.defaultChromeURI"); // avoid XULExplorer popups
            FBTrace.sysout("Firebug.Chromebug.cleanUpXULExplorer prefs\n");
        }
        else
            FBTrace.sysout("Firebug.Chromebug.cleanUpXULExplorer no data for subject", subject);
    },

    openXPCOMExplorer: function()
    {
        var w = window.screen.availWidth;
        var h = window.screen.availHeight;
        features = "outerWidth="+w+","+"outerHeight="+h;
        var args =
        {
                Firebug: Firebug,
                FBL: FBL,
        }
        var xpcomExplorerURL = "chrome://chromebug/content/xpcomExplorer.xul";
        var chromeURI = iosvc.newURI(xpcomExplorerURL, null, null);
        try
        {
            var localURI = chromeReg.convertChromeURL(chromeURI);
        }
        catch (exc)
        {
            // wow, what a sucky API, at least one exception means "no find"
        }
        if (localURI)
        {
            prefs.addObserver("toolkit",  this.cleanUpXULExplorer, false);
            prefs.addObserver("javascript", this.avoidStrict, false);
            //prefs.clearUserPref("toolkit.defaultChromeURI"); // avoid XULExplorer popups
            FBTrace.sysout("opening XPCOMExplers with args ", args);
            this.xpcomExplorer = openWindow('xpcomExplorer',xpcomExplorerURL, features, args);
        }
        else
            throw new Error("Could not find "+xpcomExplorerURL);
    },

    openProfileDir: function(context)
    {
        var profileFolder = directoryService.get("ProfD", Ci.nsIFile);
        var path = profileFolder.QueryInterface(Ci.nsILocalFile).path;
        var fileLocal = CCIN("@mozilla.org/file/local;1", "nsILocalFile");
        fileLocal.initWithPath(path);
        fileLocal.launch();
    },

    exitFirefox: function()
    {
        goQuitApplication();
    },

    avoidStrict: function(subject, topic, data)
    {
        if (data)
        {
            var c = data.indexOf("options.strict");
            if (c >= 0)
                prefs.clearUserPref("javascript.options.strict"); // avoid crashing FF
            FBTrace.sysout("Firebug.Chromebug.avoidStrict prefs\n");
        }
        else
            FBTrace.sysout("CHromeBug.avoidStrict no data for subject", subject);
    },

    createDirectory: function(parent, name)
    {
        var subdir = parent.clone();
        subdir.append(name);
        if( !subdir.exists() || !subdir.isDirectory() ) {   // if it doesn't exist, create
            subdir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
        }
        return subdir;
    },

    dumpDirectory: function()
    {
        FBTrace.sysout("dumpDirectory begins\n", directoryService);
        if (directoryService instanceof Components.interfaces.nsIProperties)
        {
            FBTrace.sysout("dumpDirectory finds an nsIProperties\n");
            var keys = directoryService.getKeys({});
            FBTrace.sysout("dumpDirectory has "+keys.length+"\n");
            for (var i = 0; i < keys.length; i++)
                FBTrace.sysout(i+": "+keys[i]+"\n");
        }

    },

    writeString: function(file, data)
    {
        // http://developer.mozilla.org/en/docs/Code_snippets:File_I/O
        //file is nsIFile, data is a string
        var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                         .createInstance(Components.interfaces.nsIFileOutputStream);

        // use 0x02 | 0x10 to open file for appending.
        foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate
        foStream.write(data, data.length);
        foStream.close();
    },

    dumpStackToConsole: function(context, title)
    {
        if (FBTrace.DBG_STACK) FBTrace.sysout("ChromeBugPanel.dumpStackToConsole for: ", title);
        var trace = FBL.getCurrentStackTrace(context);  // halt(), getCurrentStackTrace(), dumpStackToConsole(), =>3
        if (trace)
        {
            trace.frames = trace.frames.slice(3);

            Firebug.Console.openGroup(title, context)
            Firebug.Console.log(trace, context, "stackTrace");
            Firebug.Console.closeGroup(context, true);
        }
        else
            if (FBTrace.DBG_STACK) FBTrace.sysout("ChromeBugPanel.dumpStackToConsole FAILS for "+title, " context:"+context.getName());
    },

    openAboutDialog: function()
    {
        var extensionManager = CCSV("@mozilla.org/extensions/manager;1", "nsIExtensionManager");
        openDialog("chrome://mozapps/content/extensions/about.xul", "",
            "chrome,centerscreen,modal", "urn:mozilla:item:chromebug@johnjbarton.com", extensionManager.datasource);
    },

    onClickStatusIcon: function()
    {
        Firebug.Chromebug.contextAnalysis(FirebugContext);
    },

    contextAnalysis: function(context)
    {
        if (!FirebugContext)
            return;
        Firebug.Console.openGroup("Context Analysis", FirebugContext)
        Firebug.Console.log(Firebug.Chromebug.contexts, FirebugContext);
        Firebug.Console.log(Firebug.Chromebug.jsContexts, FirebugContext);
        var ejs = fbs.getJSContexts();
        if (ejs)
            Firebug.Console.log(ejs, FirebugContext);
        if (context)
            Firebug.Console.log(context, FirebugContext);
        else
            Firebug.Console.log(FirebugContext, FirebugContext);
        Firebug.Console.closeGroup(FirebugContext, true);
    },


});


window.timeOut = function(title)
{
    var t = new Date();
    if (window.startTime)
        window.dump(title+": "+(t - window.startTime)+"\n");
    window.startTime = t;
}
function connectedList(xul_element, list)
{
    if (!list.elementBoundTo)
    {
        list.elementBoundTo = xul_element;
        xul_element.addEventListener("selectObject", bind(list.onSelectLocation, list), false);
        if (list.onPopUpShown)
            xul_element.addEventListener("popupshown", bind(list.onPopUpShown, list), false);
    }
    return list;
}

Chromebug.Package = function(name, kind)
{
    this.name = name;
    this.kind = kind;

    this.contexts = [];

    FBTrace.sysout("Create Package "+name+"("+kind+")");
}

Chromebug.Package.prototype =
{
    appendContext: function(context)
    {
        if (this.hasContext(context))
            return;

        this.contexts.push(context);
        context.pkg = this;
        if (FBTrace.DBG_LOCATIONS)
            FBTrace.sysout("appendContext "+context.getName()+" to package "+this.name+" total contexts:"+this.contexts.length);
    },

    getContexts: function()
    {
        return this.contexts;
    },

    getContextDescription: function(context)
    {
        return {context: context, pkg: this, label: this.name};
    },

    getContextDescriptions: function()
    {
        var descriptions = [];
        var thePackage = this;
        this.eachContext(function buildList(context)
        {
            descriptions.push( thePackage.getContextDescription(context) );
        });
        return descriptions;
    },

    hasContext: function(context)
    {
        var found = this.eachContext( function seek(areYouMine)
        {
            if (context.uid == areYouMine.uid)
                return areYouMine;
        });
        return found;
    },

    eachContext: function(fnTakesContext)
    {
        for (var i = 0; i < this.contexts.length; i++)
        {
            var rc = fnTakesContext(this.contexts[i]);
            if (rc)
                return rc;
        }
        return false;
    },

    deleteContext: function(context)
    {
        var i = this.contexts.indexOf(context);
        this.contexts.slice(i, 1);
    },

}
//**************************************************************************
// chrome://<packagename>/<part>/<file>
// A list of packages each with a context list
//
Chromebug.packageList = extend(new Firebug.Listener(),
{
    //  key name of package, value Package object containing contexts
    pkgs: {},

    getPackageByName: function(name)
    {
        return this.pkgs[name];
    },

    eachPackage: function(fnTakesPackage)
    {
        for (var p in this.pkgs)
        {
            if (this.pkgs.hasOwnProperty(p))
            {
                var rc = fnTakesPackage(this.pkgs[p]);
                if (rc)
                    return rc;
            }
        }
    },

    eachContext: function(fnTakesContext)  // this will visit each context more than one time!
    {
        return this.eachPackage( function overContexts(pkg)
        {
            return pkg.eachContext(fnTakesContext);
        });
    },

    getSummary: function(where)
    {
        var str = where + ": All Packages =(";
        this.eachPackage(function sayAll(pkg){ str+=pkg.name+","; });
        str[str.length - 1] = ")";
        return str;
    },

    getOrCreatePackage: function(description)
    {
        var pkgName = description.pkgName;
        var kind = description.kind;

        if (!this.pkgs.hasOwnProperty(pkgName))
            this.pkgs[pkgName] = new Chromebug.Package(pkgName, kind);

        return this.pkgs[pkgName];
    },

    assignContextToPackage: function(context)  // a window context owned by a package
    {
        var url = context.getName();
        var description = Chromebug.parseURI(url);
        if (description && description.path)
        {
            var pkg = this.getOrCreatePackage(description);
            pkg.appendContext(context);
        }
        else
        {
            if (FBTrace.DBG_CHROMEBUG || FBTrace.DBG_LOCATIONS)
                FBTrace.sysout("PackageList skipping context "+url);
        }
    },

    deleteContext: function(context)
    {
        this.eachPackage(function deleteContextFromPackage(pkg)
        {
            if (pkg.hasContext(context))
                pkg.deleteContext(context);
        });
    },

    getCurrentLocation: function() // a context filtered by package
    {
        return cbPackageList.repObject;
    },

    setCurrentLocation: function(filteredContext)
    {
          cbPackageList.location = filteredContext;
          if (FBTrace.DBG_LOCATIONS)
              FBTrace.sysout("PackageList.setCurrentLocation sent onSetLocation to "+this.fbListeners.length);
          dispatch(this.fbListeners, "onSetLocation", [this, filteredContext]);
    },

    getLocationList: function()  // list of contextDescriptions
    {
        var list = [];
        for (var p in this.pkgs)
        {
            if (this.pkgs.hasOwnProperty(p))
                list = list.concat(this.pkgs[p].getContextDescriptions());
        }

        list.push(this.getDefaultLocation());

        if (FBTrace.DBG_LOCATIONS)
        {
            FBTrace.sysout(this.getSummary("getLocationList"));
            FBTrace.sysout("PackageList getLocationList list "+list.length, list);
        }

        return list;
    },

    getFilter: function()
    {
        var current = this.getCurrentLocation();
        if (current && current.pkg.name != this.getDefaultPackageName())
            return current.pkg.name;
        else
            return "";
    },

    getDefaultPackageName: function()
    {
        return "        No Filtering, Current Context:   "; // in lexographical order the spaces will be early
    },

    getDefaultLocation: function()
    {
        return {context: FirebugContext, pkg: {name: this.getDefaultPackageName() }, label: "(no filter)"};
    },

    getObjectLocation: function(filteredContext)
    {
        return filteredContext.pkg.name;
    },

    getObjectDescription: function(filteredContext)
    {
        var context = filteredContext.context;
        var title = (context.window ? context.getTitle() : null);
        var d =  {path: filteredContext.pkg.name, name: context.getName() +(title?"   "+title:""), label:  filteredContext.label};
        if (FBTrace.DBG_LOCATIONS)
            FBTrace.sysout("getObjectDescription for context "+context.uid+" path:"+d.path+" name:"+d.name, d);
        return d;
    },


    onSelectLocation: function(event)
    {
        var filteredContext = event.currentTarget.repObject;
        if (filteredContext)
        {
            var context = filteredContext.context;
            Firebug.Chromebug.selectContext(context);
            Chromebug.packageList.setCurrentLocation(filteredContext);
       }
       else
       {
           FBTrace.sysout("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
       }
    },

});

Chromebug.packageListLocator = function(xul_element)
{
    var list = Chromebug.packageList;
    return connectedList(xul_element, list);
}

//**************************************************************************
// The implements the list on the right side of the top bar with the prefix "context:"

Chromebug.contextList =
{

    getCurrentLocation: function() // a context in a package
    {
        return cbContextList.repObject;
    },

    setCurrentLocation: function(context) // call from Firebug.Chromebug.selectContext(context);
    {
        cbContextList.location = context;  // in binding.xml, both the location and repObject are changed in the setter.
    },

    getLocationList: function()  // list of contextDescriptions
    {
        var list = Firebug.Chromebug.contexts;

        if (FBTrace.DBG_LOCATIONS)
            FBTrace.sysout("ContextList getLocationList list "+list.length, list);

        return list;
    },

    getDefaultLocation: function()
    {
        if (this.defaultContext && Firebug.Chromebug.contexts.indexOf(this.defaultContext) != -1)
            return this.defaultContext;

        var locations = this.getLocationList();
        if (locations && locations.length > 0) return locations[0];
    },

    setDefaultLocation: function(context)
    {
        if (context)
            this.defaultContext = context;
    },

    getObjectLocation: function(context)
    {
        return  context.getWindowLocation();
    },

    getObjectDescription: function(context)
    {
        var title = (context.window ? context.getTitle() : null);
        var d = Chromebug.parseURI(context.getName());

        d = {
           path: d ? d.path : "parseURI fails",
           name: context.getName() +(title?"   "+title:""),
           label: context.getName(),
           href: context.getName(),
           highlight: context.stoppped,
           };

        if (FBTrace.DBG_LOCATIONS)
            FBTrace.sysout("getObjectDescription for context "+context.uid+" path:"+d.path+" name:"+d.name, d);
        return d;
    },

    onSelectLocation: function(event)
    {
        var context = event.currentTarget.repObject;
        if (context)
        {
            if (!FirebugContext)
                FirebugContext = context;

            if (FBTrace.DBG_LOCATIONS)
                FBTrace.sysout("Chromebug.contextList.onSelectLocation context:"+ context.getName()+" FirebugContext:"+FirebugContext.getName());

            Firebug.Chromebug.selectContext(context);

            event.currentTarget.location = context;

            setTimeout( function delaySave()  // we only want to do this when the user selects
            {
                Firebug.Chromebug.saveState(context);
            }, 500);

        }
        else
        {
            FBTrace.sysout("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
        }
    },

    /*
     * Called when the filelist is already showing, highlight any stopped contexts.
     */
    onPopUpShown: function(event)
    {
        var list = document.getAnonymousElementByAttribute(event.currentTarget, "anonid", "popup");

        if (FBTrace.DBG_SOURCEFILES)
            FBTrace.sysout("Context on popup shown "+list, list);

        var child = list.firstChild;
        while(child)
        {
            if (FBTrace.DBG_SOURCEFILES)
                FBTrace.sysout("Context onPopUpShown "+child+ " has repObject "+(child.repObject?child.repObject.getName():"none"));

            if (child.repObject && child.repObject.stopped)
                child.setAttribute('highlight', "true");

            child = child.nextSibling;
        }
    },

    getContextByURL: function(url)
    {
        return Firebug.Chromebug.eachContext(function matchURL(context)
        {
            if (safeToString(context.global.location) === url)
                return context;
        });
    }
}

Chromebug.contextListLocator = function(xul_element)
{
    var list = Chromebug.contextList;
    return connectedList(xul_element, list);
}

Chromebug.interfaceList = {

        getLocationList: function()
        {
            var ifaces = [];
            for(iface in Components.interfaces)
            {
                ifaces.push(iface);
            }
            return ifaces;
        },

        getDefaultLocation: function()
        {
            var locations = this.getLocationList();
            if (locations && locations.length > 0) return locations[0];
        },

        reLowerCase: /([a-z]*)(.*)/,

        getObjectLocation: function(iface)
        {
            var dot = iface.lastIndexOf('.');
            if (dot > 0)
                return iface.substr(dot+1);
            else
                return iface;
        },

        getObjectDescription: function(iface)
        {
            var ifaceName = this.getObjectLocation(iface);
            var prefix = "";
            var prefixFinder = this.reLowerCase.exec(ifaceName);
            if (prefixFinder)
            {
                return {path: "Components.interfaces."+prefixFinder[1], name: prefixFinder[2]};
            }
            else
                return iface;
        },

        onSelectLocation: function(event)
        {
            var ifaceName = event.currentTarget.repObject;
            if (ifaceName)
            {
                var docBase = "http://www.oxymoronical.com/experiments/apidocs/interface/";
                var url = docBase + ifaceName;
                openWindow( "navigator:browser", url );
                window.open(url, "navigator:browser");
                FirebugChrome.select(Components.interfaces[ifaceName]);
            }
            else
                FBTrace.sysout("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
            if (Components.interfaces[ifaceName] instanceof Components.interfaces.nsIJSIID)
                FBTrace.sysout("onSelectLocation "+ifaceName, Components.interfaces[ifaceName]);
        }
    }

Chromebug.interfaceListLocator = function(xul_element)
{
    return connectedList(xul_element, Chromebug.interfaceList);
}

function SourceFileListBase()
{
}

SourceFileListBase.prototype = extend(new Firebug.Listener(),
{

    getDescription: function(sourceFile)
    {
        var description = this.parseURI(sourceFile.href);
        if (description)
        {
            if (sourceFile.context)
            {
                description.context = sourceFile.context;
            }
            else
                FBTrace.sysout("ERROR in getDescription: sourceFile has no context");

            return description;
        }
        else
            return false;
    },

    supports: function(sourceFile)
    {
        return getDescription(sourceFile);
    },

    getPackageNames: function()
    {
        var slots = {};
        this.eachSourceFileDescription(function extractPackageNames(d)
        {
            slots[d.pkgName] = 1;
        });
        var list = [];
        for (var p in slots)
            if (slots.hasOwnProperty(p))
                list.push(p);
        return list;
    },

    eachSourceFileDescription: function(fnTakesSourceFileDescription)
    {
        var getDescription = bind(this.getDescription, this);
        var rc = Firebug.Chromebug.eachSourceFile(function visitSourceFiles(sourceFile)
        {
            var d = getDescription(sourceFile);
            if ( d )
            {
                var rc = fnTakesSourceFileDescription(d);
                if (rc)
                    return rc;
            }
        });
        return rc;
    },

    setFilter: function(fnTakesDescription)  // outsider can set filter, eg in onSetLocation
    {
        this.filter = fnTakesDescription;
    },

    isWantedDescription: function(description)
    {
        if (this.filter)
            return this.filter(description);
        else
            return true;
    },

    getLocationList: function()
    {
        var self = this;
        var list = [];
        this.eachSourceFileDescription(function joinSourceFileDescriptions(d)
        {
            if (self.isWantedDescription(d))
                list.push(d);
        } );
        return list;
    },

    parseURI: function(url)
    {

        var description =
        {
                path:"parseURI needs impl for heading", // display category
                name:"needs impl for entry",            // display entry
                pkgName: "needs impl for package name", // category
                href: url,                              // backpointer
                  kind:"which list"
          };
        return description;

    },

    getDefaultLocation: function()
    {
        var locations = this.getLocationList();
        if (locations && locations.length > 0) return locations[0];
    },

    getObjectLocation: function(sourceFileDescription)
    {
        if (sourceFileDescription)
            return sourceFileDescription.href;
        else
            return "no sourcefile:";
    },

    getObjectDescription: function(sourceFileDescription) // path: package name, name: remainder
    {
        if (sourceFileDescription)
        {
            var cn = sourceFileDescription.context.getName();
            if (cn)
            {
                cnParts = cn.split('/');
                cn = cnParts[cnParts.length - 1];
            }
            var nameParts = sourceFileDescription.name.split('/');
            var name = nameParts[nameParts.length - 1];
            var description =
            {
                name: cropString(name+(cn?" in "+cn:""), 120),
                path: cropString(sourceFileDescription.path, 120),
                label: cropString(name, 40),
            }
            return description;
        }
        return {path: "SourceFileListBase", name:"no sourceFileDescription"};
    },

    toString: function()
    {
        return "Source File List "+this.kind+" with "+this.getPackageNames().length+" packages";
    },

    getCurrentLocation: function()
    {
        return this.elementBoundTo.repObject;
    },

    setCurrentLocation: function(description)
    {
        if (FBTrace.DBG_LOCATIONS)
            FBTrace.sysout("setCurrentLocation ", description);

        this.elementBoundTo.location = description;
        dispatch(this.fbListeners, "onSetLocation", [this, description]);
    },

    onSelectLocation: function(event)
    {
        var description = event.currentTarget.repObject;
        if (description)
            this.doSelect(description);
        else
            FBTrace.sysout("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
    },

    doSelect: function(description)
    {
        var context = description.context;
        if (context)
        {
             var sourceFile= context.sourceFileMap[description.href];
            FBTrace.sysout("AllFilesList.onSelectLocation context "+context.getName()+" url:"+description.href, description);
            Firebug.Chromebug.selectContext(context);

            FirebugChrome.select(sourceFile, "script", "watch", true);  // SourceFile
            this.setCurrentLocation(description);
        }
        else
            FBTrace.sysout("AllFilesList.onSelectLocation no context in description"+description, description);
    }

});

Chromebug.parseWebURI = function(uri)
{
    var m = reWeb.exec(uri);
    if(m)
    {
        var split = FBL.splitURLBase(uri);
        return {path: m[1], name: split.path+'/'+split.name, kind:"web", pkgName: m[1]};
    }
}

Chromebug.parseSystemURI = function(uri)
{
    if (isSystemURL(uri))
    {
        var split =  FBL.splitURLBase(uri);
        return {path: split.path, name: split.name, kind: "system", pkgName: "system" }
    }
}

Chromebug.parseNoWindowURI = function(uri)
{
    if (uri.indexOf('noWindow')==0)
    {
        var split =  FBL.splitURLBase(uri);
        FBTrace.sysout("parseNoWindowURI "+uri, split);
        return {path: uri.substr(0,9), name: uri.substr(10), kind: "noWindow", pkgName: "noWindow" }
    }
}

Chromebug.parseDataURI = function(URI)
{
    if (isDataURL(URI))
    {
        var split = splitURLBase(URI);
        FBTrace.sysout("parseDataURI "+URI, split);
        return {path: "data:", name: split.path+'/'+split.name, kind:"data", pkgName: "data:"};
    }
}

Chromebug.parseURI = function(URI)
{
    if (!URI || Firebug.Chromebug.isChromebugURL(URI))
        return null;

    var description = Chromebug.componentList.parseURI(URI);
    if (!description)
        description = Chromebug.extensionList.parseURI(URI);
    if (!description)
        description = Chromebug.moduleList.parseURI(URI);
    if (!description)
        description = Chromebug.parseSystemURI(URI);
    if (!description)
        description = Chromebug.parseWebURI(URI);
    if (!description)
        description = Chromebug.parseNoWindowURI(URI);
    if (!description)
        description = Chromebug.parseDataURI(URI);

    if (!description)
    {
        if (FBTrace.SOURCEFILES)
            FBTrace.sysout("Chromebug.parseURI: no match for "+URI);
        description = {path:"mystery", name:URI, kind: "mystery", pkgName: "unparsable"};
    }

    return description;
}

Chromebug.extensionList = extend( new SourceFileListBase(), {

    kind: "extension",

    appURLStem: Firebug.Chromebug.getPlatformStringURL("resource:app"),

    parseURI: function(URIString)
    {
        if (Firebug.Chromebug.isChromebugURL(URIString))
            return null;

        var m = FBL.reChrome.exec(URIString) || reExtensionInFileURL.exec(URIString) || reResource.exec(URIString);
        var pkgName, remainder;
        if (m)
        {
            pkgName = m[1];
            remainder = m[0].length;
        }
        else
        {
            if (URIString && URIString.indexOf(this.appURLStem) == 0)
            {
                pkgName = "application";
                remainder = this.appURLStem.length;
            }
            // else not one of ours
            return null;
        }
        return {path: pkgName, name: new String(URIString.substr(remainder)), pkgName: pkgName, href: URIString, kind:'extension'};
    },

});

Chromebug.extensionListLocator = function(xul_element)
{
    return connectedList(xul_element, Chromebug.extensionList);
}


Chromebug.allFilesList = extend(new SourceFileListBase(), {

    kind: "all",

    parseURI: Chromebug.parseURI,


    // **************************************************************************
    // PackageList listener

    onSetLocation: function(packageList, current)
    {
        FBTrace.sysout("onSetLocation current: "+current.pkg.name);
        var noFilter = packageList.getDefaultPackageName();
        if (current.pkg.name == noFilter)
            Chromebug.allFilesList.setFilter(null)
        else
        {
            var targetName = current.pkg.name;
            Chromebug.allFilesList.setFilter( function byPackageName(description)
            {
                return (description && (targetName == description.pkgName) );
            });
        }
    },

});

Chromebug.allFilesListLocator = function(xul_element)
{
    if (FBTrace.DBG_LOCATIONS)
        FBTrace.sysout("AllFilesListLocator called");
    return connectedList(xul_element, Chromebug.allFilesList);
}


Chromebug.categoryListLocator = function(xul_element)
{
    if (!Chromebug.categoryList)
    {
        Chromebug.categoryList = {
            elementBoundTo: xul_element,

            getLocationList: function()
            {
                Firebug.Chromebug.dumpDirectory();
                if (!this.catman)
                    this.catman = Components.classes["@mozilla.org/categorymanager;1"].getService(Components.interfaces.nsICategoryManager);

                var list = [];
                var categories = this.catman.enumerateCategories();
                while( categories.hasMoreElements() )
                {
                    var category =  categories.getNext().QueryInterface(nsISupportsCString);
                    var entries = this.catman.enumerateCategory(category);
                    while( entries.hasMoreElements() )
                    {
                        var entry = entries.getNext().QueryInterface(nsISupportsCString);
                        list.push(category + "/" + entry);
                    }
                }
                return list;
            },

            getDefaultLocation: function()
            {
                var locations = this.getLocationList();
                if (locations && locations.length > 0) return locations[0];
            },

            getObjectLocation: function(categorySlashEntry)
            {
                return categorySlashEntry;
            },

            getObjectDescription: function(categorySlashEntry)
            {
                var c = categorySlashEntry.indexOf('/');
                if (c != -1)
                    return { path: categorySlashEntry.substr(0, c), name: categorySlashEntry.substr(c+1)};
                else
                    return { path: "error", name: categorySlashEntry};
            },

            onSelectLocation: function(event)
            {
                var categorySlashEntry = event.currentTarget.repObject;
                if (categorySlashEntry)
                {
                    var d = Chromebug.categoryList.getObjectDescription(categorySlashEntry);
                    Firebug.Console.log(d);
                    var value = Chromebug.categoryList.catman.getCategoryEntry(d.path, d.name);
                    Firebug.Console.log(categorySlashEntry+": "+value); // category/entry
                }
                else
                    FBTrace.sysout("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
            }
        }
        xul_element.addEventListener("selectObject", Chromebug.categoryList.onSelectLocation, false);
    }
    return Chromebug.categoryList;
}

Chromebug.overlayListLocator = function(xul_element)
{
    if (!Chromebug.overlayList)
    {
        Chromebug.overlayList = {
            elementBoundTo: xul_element,

            getOverlayList: function(href)
            {

                var uri = makeURI(href);
                var prov = Components.classes["@mozilla.org/chrome/chrome-registry;1"].
                    getService(Components.interfaces.nsIXULOverlayProvider);

                var overlays =[];

                var overlaysEnum = prov.getXULOverlays(uri)
                while(overlaysEnum.hasMoreElements()) {
                    var url = overlaysEnum.getNext().QueryInterface(Components.interfaces.nsIURI).spec;
                        overlays.push( { href: url, overlayType: "XUL"} );
                }

                var overlaysEnum = prov.getStyleOverlays(uri)
                while(overlaysEnum.hasMoreElements()) {
                    var url = overlaysEnum.getNext().QueryInterface(Components.interfaces.nsIURI).spec;
                    overlays.push( { href: url, overlayType: "Style"} );
                }
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("OverlayListLocator "+overlays.length+" for "+href, overlays);

                return overlays;
            },

            getLocationList: function()
            {
                if (FirebugContext)
                {
                    // TODO use URI of current context
                    var win = FirebugContext.window;
                    var overlays = this.getOverlayList(win.location.toString());
                    return overlays;
                }
            },

            getDefaultLocation: function()
            {
                var locations = this.getLocationList();
                if (locations && locations.length > 0) return locations[0];
            },

            getObjectLocation: function(overlay)
            {
                return overlay.href;
            },

            getObjectDescription: function(overlay)
            {
                return Chromebug.parseURI(overlay.href);
            },

            getBrowserForOverlay: function(url)
            {
                var overlayViewer = $('cbOverlayViewer');
                var browsers = overlayViewer.getElementsByTagName("browser");
                for (var i = 0; i < browsers.length; i++)
                {
                    if (browsers[i].src == url)
                        return browsers[i];
                }
                // no find.
                return createBrowserForOverlay(overlayViewer, url);
            },

            createBrowserForOverlay: function(overlayViewer, url)
            {
                var browser = document.createElement('browser');
                browser.setAttribute("type", "content");
                browser.setAttribute("src", url)
                return browser;
            },

            onSelectLocation: function(event)
            {
                var object = event.currentTarget.repObject;

                if (!object.context)
                {
                    var description = Chromebug.parseURI(object.href);
                    if (description)
                    {
                        var pkg = Chromebug.contextList.getPackageByName(description.path);
                        var browser = Chromebug.overlayList.getBrowserForOverlay(object.href);
                        var context = pkg.createContextInPackage(win, browser);
                        object.context = context;
                    }
                }
                FirebugChrome.showContext(object.context);
                FirebugChrome.selectPanel("HTML");

                FBTrace.sysout("Chromebug.overlayList onSelectLocation object", object);
            }
        }
        xul_element.addEventListener("selectObject", Chromebug.overlayList.onSelectLocation, false);
    }
    return Chromebug.overlayList;
}


Chromebug.componentList = extend(new SourceFileListBase(), {
      kind: "component",

    parseURI: function(URIString)
    {
        if (Firebug.Chromebug.isChromebugURL(URIString))
            return null;

        var m = reComponents.exec(URIString);
        if (m)
        {
               var component = m[1];
               //var remainder = m[0].length;
            return { path: "components", pkgName: "components", name: new String(URIString), href: URIString, kind: 'component' };
        }
        else
              return null;
    },

    onSelectLocation: function(event)
    {
        var object = event.currentTarget.repObject;
        if (object)
            FirebugChrome.select(object, "script", null, true);  // SourceFile
        else
            FBTrace.sysout("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
    }
});

Chromebug.componentListLocator = function(xul_element)
{
    return connectedList(xul_element, Chromebug.componentList);
}

Chromebug.moduleList = extend( new SourceFileListBase(), {
      kind: "module",

    parseURI: function(URIString)
    {
        if (Firebug.Chromebug.isChromebugURL(URIString))
            return null;

        var m = reModules.exec(URIString);
        if (m)
        {
               var module = m[1];
               //var remainder = m[0].length;
            return { path: "modules", name: new String(URIString), pkgName: "modules", href: URIString, kind: 'module' };
        }
        else
              return null;
    },

});

Chromebug.moduleListLocator = function(xul_element)
{
    return connectedList(xul_element, Chromebug.moduleList);
}

// A list of the jsContexts built by enumerating them dynamically.
Chromebug.jsContextList = {

    getLocationList: function()
    {
        this.list = fbs.getJSContexts();
        return this.list;
    },

    getDefaultLocation: function()
    {
        var locations = this.getLocationList();
        if (locations && locations.length > 0) return locations[0];
    },

    getObjectLocation: function(jscontext)
    {
        if (!jscontext)
            FBTrace.sysout("getObjectLocation for nothing ");
        var global = jscontext.globalObject ? new XPCNativeWrapper(jscontext.globalObject.getWrappedValue()) : null;
        if (global)
        {
            var document = global.document;
            if (document)
            {
                var location = document.location.toString();
                var rootWindow = getRootWindow(global);
                if (rootWindow && rootWindow.location)
                    return location +" < "+rootWindow.location.toString();
                else
                    return location;
            }
            else
                return "noDocument://"+jscontext.tag;
            }
        else
            return "noGlobal://"+jscontext.tag;
    },

    getObjectDescription: function(jscontext)
    {
        var URI = this.getObjectLocation(jscontext);
        if (!URI)
            return {path: "no URI", name: "no URI"};
        if (Firebug.Chromebug.isChromebugURL(URI))
            var d = {path:"avoided chromebug", name: URI};
        if (!d)
            var d = Chromebug.parseURI( URI );
        if (!d)
            d = {path:"unparsable", name: this.getObjectLocation(jscontext)};
        d.name = d.name +" ("+jscontext.tag+")";
        return d;
    },

    getContextByLocation: function(location)  // TODO MOVE to context list
    {
        for (var i = 0; i < Chromebug.XULAppModule.contexts.length; ++i)
        {
            var context = Chromebug.XULAppModule.contexts[i];
            try
            {
                if (context.window.location == location)
                    return context;
            }
            catch(e)
            {
                //? Exception... "Unexpected error arg 0 [nsIDOMWindowInternal.location]"
                FBTrace.sysout("ChromeBugPanel.getContextByLocation: ignoring ", e);
            }
        }
    },

    onSelectLocation: function(event)
    {
        var object = event.currentTarget.repObject;
        if (object)
        {
            var jscontext = object;
            var global = new XPCNativeWrapper(jscontext.globalObject.getWrappedValue());
            if (global)
            {
                var context = Firebug.Chromebug.getContextByGlobal(global)
                if (context)
                {
                    Firebug.Chromebug.selectContext(context);
                }
                else
                {
                    FBTrace.sysout("onSelectLocation no context, showing global");
                    FirebugChrome.select(global, "DOM", null, true);
                }
            }
            else
            {
                FBTrace.sysout("Chromebug.jsContextList onSelectLocation: FAILED to no globalObject in jscontext\n");
                FirebugChrome.select(object, "script", null, true);  // jscontext
            }
        }
        else
        {
            FBTrace.sysout("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
        }
    }
}
Chromebug.jsContextListLocator = function(xul_element)
{
     return connectedList(xul_element, Chromebug.jsContextList);
}

Chromebug.pathListLocator = function(xul_element)
{
    if (!Chromebug.pathList)
    {
        Chromebug.pathList = {
            elementBoundTo: xul_element,
            directoryService: directoryService,
            strings: ['ProfD', 'DefProfRt', 'UChrm', 'DefRt', 'PrfDef', 'APlugns', 'AChrom','ComsD', 'Home', 'TmpD', 'ProfLD', 'resource:app', 'Desk', 'Progs', 'BMarks', 'DLoads', 'UStor'],

            getLocationList: function()
            {
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("PathListLocator getLocationLst FirebugContext",FirebugContext.getName());

                var list = [];
                for (var i = 0; i < this.strings.length; i++)
                {
                    try
                    {
                        var file = this.directoryService.get(this.strings[i], Components.interfaces.nsIFile);
                        list.push({key: this.strings[i], nsIFile: file});
                    }
                    catch(exc)
                    {
                        list.push("FAILED: "+exc);
                    }
                }
                return list;
            },

            getDefaultLocation: function()
            {
                var locations = this.getLocationList();
                if (locations && locations.length > 0) return locations[0];
            },

            getObjectLocation: function(path)
            {
                return path;
            },

            getObjectDescription: function(obj)
            {
                if (obj)
                    return {path: obj.key, name: obj.nsIFile.path};
                else
                    return {path: "", name: "(null object)"};
            },

            onSelectLocation: function(event)
            {
                var object = event.currentTarget.repObject;
                if (object)
                {
                    var URL = iosvc.newFileURI(object.nsIFile);
                    FBL.openWindow(null, URL.spec);
                }
                else
                    FBTrace.sysout("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
            }
        }
        xul_element.addEventListener("selectObject", Chromebug.pathList.onSelectLocation, false);
    }
    return Chromebug.List;
}





Chromebug.dumpFileTrack = function()
{
    var jsdState = Application.storage.get('jsdState', null);
    if (jsdState)
        fbs.dumpFileTrack(jsdState.getAllTrackedFiles());
    else
        FBTrace.sysout("dumpFileTrack, no jsdState!");
}

function getFrameWindow(frame)
{
   // if (debuggers.length < 1)  // too early, frame.eval will crash FF2
    //        return;
    try
    {
        var result = {};
        frame.eval("window", "", 1, result);
        var win = new XPCNativeWrapper(result.value.getWrappedValue());
        FBTrace.sysout("getFrameWindow eval window is ", win.location);
        return getRootWindow(win);
    }
    catch (exc)
    {
        if (FBTrace.DBG_ERRORS && FBTrace.DBG_WINDOWS)
            FBTrace.sysout("ChromeBugPanel getFrameWindow fails: ", exc);  // FBS.DBG_WINDOWS
        return null;
    }
}

function getRootWindow(win)
{
    for (; win; win = win.parent)
    {
        if (FBTrace.DBG_WINDOWS)
            FBTrace.sysout("getRootWindow win.parent is ", (win.parent?win.parent.location:"null"));
        if (!win.parent || win == win.parent)
            return win;
    }
    return null;
}

function getExecutionStopNameFromType(type)                                                                            /*@explore*/
{                                                                                                                      /*@explore*/
    switch (type)                                                                                                      /*@explore*/
    {                                                                                                                  /*@explore*/
        case jsdIExecutionHook.TYPE_INTERRUPTED: return "interrupted";                                                 /*@explore*/
        case jsdIExecutionHook.TYPE_BREAKPOINT: return "breakpoint";                                                   /*@explore*/
        case jsdIExecutionHook.TYPE_DEBUG_REQUESTED: return "debug requested";                                         /*@explore*/
        case jsdIExecutionHook.TYPE_DEBUGGER_KEYWORD: return "debugger_keyword";                                       /*@explore*/
        case jsdIExecutionHook.TYPE_THROW: return "interrupted";                                                       /*@explore*/
        default: return "unknown("+type+")";                                                                           /*@explore*/
    }                                                                                                                  /*@explore*/
}

function remove(list, item)
{
    var index = list.indexOf(item);
    if (index != -1)
        list.splice(index, 1);
}

function ChromeBugOnLoad(event)
{
    FBTrace.sysout("ChromeBugOnLoad "+event.originalTarget.documentURI+"\n");
}
function ChromeBugOnDOMContentLoaded(event)
{
    FBTrace.sysout("ChromeBugOnDOMContentLoaded "+event.originalTarget.documentURI+"\n");
}



Firebug.registerModule(Firebug.Chromebug);
}});

