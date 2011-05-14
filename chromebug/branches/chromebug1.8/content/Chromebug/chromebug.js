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

define([
        "firebug/lib",
        "firebug/firebug",
        "firebug/lib/string",
        "chromebug/domWindowContext",
        "chromebug/parseURI",
       ], function chromebugPanelFactory(FBL, Firebug, STR, DomWindowContext)
{


with (FBL) {

// ************************************************************************************************

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

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

const PrefService = Cc["@mozilla.org/preferences-service;1"];
const nsIPrefBranch2 = Components.interfaces.nsIPrefBranch2;
const prefs = PrefService.getService(nsIPrefBranch2);
const nsIPrefService = Components.interfaces.nsIPrefService;
const prefService = PrefService.getService(nsIPrefService);

const fbBox = $("fbContentBox");
const interfaceList = $("cbInterfaceList");
const inspectClearProfileBar = $("fbToolbar");
const appcontent = $("appcontent");
const cbContextList = $('cbContextList');
const cbPackageList = $('cbPackageList');
const versionURL = "chrome://chromebug/content/branch.properties";
const fbVersionURL = "chrome://firebug/content/branch.properties";

const statusText = $("cbStatusText");

// ************************************************************************************************
// We register a Module so we can get initialization and shutdown signals and so we can monitor
// context activities

Firebug.Chromebug = extend(Firebug.Module,
{
    // This is our interface to Firebug.TabWatcher, total hack.
    fakeTabBrowser: {browsers: []},

    getBrowsers: function()
    {
         return Firebug.Chromebug.fakeTabBrowser.browsers;
    },

    getCurrentBrowser: function()
    {
        return this.fakeTabBrowser.selectedBrowser;
    },

    getCurrentURI: function()
    {
        return Firebug.Chromebug.getCurrentBrowser().currentURI;
    },

    onXULWindowAdded: function(xul_window, outerDOMWindow)
    {
        try
        {
            var context = Firebug.Chromebug.getOrCreateContext(outerDOMWindow, "XUL Window");
            context.xul_window = xul_window;

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
            FBTrace.sysout("onXULWindowAdded FAILS "+safeGetWindowLocation(outerDOMWindow)+' because '+exc, exc);
        }
    },

    // Browsers in Chromebug hold our context info

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
        if (global && global instanceof Window && !global.closed && global.location)
        {
            var browserName = STR.safeToString(global.location);
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
            FBTrace.sysout("createBrowser create name from "+browserNameFrom+" gave browserName "+browserName+' FAILED makeURI ' + (global?STR.safeToString(global):"no global"), global );
        }

        this.fakeTabBrowser.browsers[browser.tag] = browser;
        this.fakeTabBrowser.selectedBrowser = this.fakeTabBrowser.browsers[browser.tag];
        this.fakeTabBrowser.currentURI = browser.currentURI; // allows Firebug.TabWatcher to showContext
        FBTrace.sysout("createBrowser "+browser.tag+" global:"+(global?STR.safeToString(global):"no global")+" for browserName "+browserName+" from "+browserNameFrom);
        return browser;
    },

    selectBrowser: function(browser)
    {
        this.fakeTabBrowser.selectedBrowser = browser;
        this.fakeTabBrowser.currentURI = browser.currentURI; // allows Firebug.TabWatcher to showContext
    },

    selectContext: function(context)  // this operation is similar to a user picking a tab in Firefox, but for chromebug
    {
        if (!context)
            return;

        Firebug.Chromebug.selectBrowser(context.browser);
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("selectContext "+context.getName() + " with context.window: "+safeGetWindowLocation(context.window) );

        if (Firebug.currentContext)
            context.panelName = Firebug.currentContext.panelName; // don't change the panel with the context in Chromebug

        Firebug.Chromebug.contextList.setCurrentLocation(context);

        Firebug.chrome.setFirebugContext(context);  // we've overridden this one to prevent Firebug code from doing...
        Firebug.currentContext = context;                   // ...this

        dispatch(Firebug.modules, "showContext", [context.browser, context]);  // tell modules we may show UI

        Firebug.chrome.syncResumeBox(context);
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
            this.contexts = Firebug.TabWatcher.contexts;

        window.arguments[0] = {browser: this.fakeTabBrowser};

        Chromebug.XULAppModule.addListener(this);  // XUL window creation monitoring
        Firebug.Debugger.addListener(this);
        Firebug.Debugger.setDefaultState(true);

        Firebug.registerUIListener(Firebug.Chromebug.allFilesList);

        Firebug.Chromebug.PackageList.addListener(Firebug.Chromebug.allFilesList);  // how changes to the package filter are sensed by AllFilesList

        Firebug.TraceModule.addListener(this);

        if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("Chromebug.initialize module "+this.uid+" window.location="+window.location+"\n");

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
        // The restoreation has limited number of attempts.
        this.retryRestoreCounter = 6;
        this.retryRestoreID = setInterval(bind(Firebug.Chromebug.restoreState, this), 500);

        setTimeout( function stopTrying()  // Try to get the state of the UI back to where it was last time we ran
        {
            if(Firebug.Chromebug.stopRestoration())  // if the window is not up by now give up.
            {
                var context = Firebug.Chromebug.contextList.getCurrentLocation();
                if (context)
                    Firebug.Chromebug.contextList.setDefaultLocation(context);
                else
                    context = Firebug.Chromebug.contextList.getDefaultLocation();

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

    internationalizeUI: function(doc)
    {
        var elements = ["view-menu", "window-menu"];
        for (var i=0; i<elements.length; i++)
        {
            var element = doc.getElementById(elements[i]);
            if (!element)
                continue;

            if (element.hasAttribute("label"))
                FBL.internationalize(element, "label");

            if (element.hasAttribute("tooltiptext"))
                FBL.internationalize(element, "tooltiptext");
        }
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
        Firebug.setChrome(Firebug.chrome, "detached"); // 1.4
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Restore State & Save State (UI)

    /**
     * This method is executed using setInterval at the end of Chromebug.initialize.
     * It's purpose is to restore UI state, which must be done asynchronously and
     * there can be more attempts to succeed (depends when the CB UI is ready).
     */
    restoreState: function()  // TODO context+file
    {
        // The restoration logic has limited number of attempts.
        if (--this.retryRestoreCounter <= 0)
        {
            if (FBTrace.DBG_INITIALIZE)
                FBTrace.sysout("restoreState Stop restoration, we did our best.");

            this.stopRestoration();
            return;
        }

        var lastTry = this.retryRestoreCounter == 1;
        var previousStateJSON = prefs.getCharPref("extensions.chromebug.previousContext");

        // Bail out if there is no previous state or it's an empty JSON object.
        if (!previousStateJSON || previousStateJSON.length < 3)
        {
            if (FBTrace.DBG_INITIALIZE)
                FBTrace.sysout("restoreState NO previousStateJSON ");

            this.stopRestoration(); // no reason to beat our head against the wall...
            return;
        }

        // Also bail out if the parsing fails.
        var previousState = parseJSONString(previousStateJSON, window.location.toString());
        if (!previousState)
        {
            if (FBTrace.DBG_INITIALIZE)
                FBTrace.sysout("restoreState could not parse previousStateJSON "+previousStateJSON);

            this.stopRestoration();
            return;
        }

        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("restoreState parse previousStateJSON "+previousStateJSON, previousState);

        // If the return value is non null, the context has been properly restored.
        var context = this.restoreContext(previousState);
        if (!context)
            return;

        // Restore filter (toolbar popup menu).
        var pkg = this.restoreFilter(previousState, context);

        // The file must exist in order to restore the file and it's scroll position.
        if (previousState.sourceLink)
        {
            var sourceFile = getSourceFileByHref(previousState.sourceLink.href, context);
            if (!sourceFile && !lastTry)
                return;
        }

        // Chromebug UI seems to be ready for restoration so, remove the asynchronous interval.
        this.stopRestoration();

        // Create real instance of the source link so, it has the correct type.
        var sourceLink = previousState.sourceLink ? new SourceLink(previousState.sourceLink.href,
            previousState.sourceLink.line, previousState.sourceLink.type) : null;

        var panelName = previousState.panelName;

        if (sourceLink)
            Firebug.chrome.select(sourceLink, panelName);
        else if (panelName)
            Firebug.chrome.selectPanel(panelName);
        else
            Firebug.chrome.selectPanel('trace');

        // Keep trying, this method will be asynchronously called again.
    },

    stopRestoration: function()
    {
        if (this.retryRestoreID)
        {
            clearTimeout(this.retryRestoreID);
            delete this.retryRestoreID;
            return true;
        }

        return false;
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
            Firebug.Chromebug.selectContext( context );
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
            var pkg = Firebug.Chromebug.PackageList.getPackageByName(previousState.pkgName);
            if (pkg)
            {
                Firebug.Chromebug.PackageList.setCurrentLocation(pkg);
                if(FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("restoreFilter found "+previousState.pkgName+" and set PackageList to ", Firebug.Chromebug.PackageList.getCurrentLocation());
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

        var pkgDescription = Firebug.Chromebug.PackageList.getCurrentLocation();

        var previousContextJSON = "{"+
            " \"contextName\": \"" + context.getName() +"\"," +
            (pkgDescription? (" \"pkgName\": \"" + pkgDescription.name +"\",") : "") +
            (panel? (" \"panelName\": \"" + panel.name +"\",") : "") +
            (sourceLinkJSON? (" \"sourceLink\": " + sourceLinkJSON+", ") : "") +
            "}";

        if (Firebug.Chromebug.delaySourceLinkTimeout)
            clearTimeout(Firebug.Chromebug.delaySourceLinkTimeout);

        Firebug.Chromebug.delaySourceLinkTimeout = setTimeout( function delaySave()
        {
            delete Firebug.Chromebug.delaySourceLinkTimeout;
            prefs.setCharPref("extensions.chromebug.previousContext", previousContextJSON);
            prefService.savePrefFile(null);

            if (FBTrace.DBG_SOURCEFILES)
                FBTrace.sysout("saveState " + previousContextJSON, parseJSONString(previousContextJSON, window.location.toString()));

        }, 250);

    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

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
            Firebug.chrome.shutdown();
        }
        catch(exc)
        {
            FBTrace.sysout("onUnloadTopWindow FAILS", exc);
        }
    },

    shutdown: function()
    {
        if(Firebug.getPref("extensions.chromebug", 'defaultPanelName')=='Chromebug')
            Firebug.setPref("extensions.chromebug", 'defaultPanelName','console');
        prefs.setIntPref("extensions.chromebug.outerWidth", window.outerWidth);
        prefs.setIntPref("extensions.chromebug.outerHeight", window.outerHeight);

        if (FBTrace.DBG_CHROMEBUG)
             FBTrace.sysout("Firebug.Chromebug.shutdown set prefs w,h="+window.outerWidth+","+window.outerHeight+")\n");

        window.dump(window.location+ " shutdown:\n "+getStackDump());

        Firebug.shutdown();
        if(FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("ChromebugPanel.shutdown EXIT\n");
    },

    showPanel: function(browser, panel)
    {
        try {
            if (panel && panel.name == "Chromebug")
            {
                panel.showPanel();

                if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("showPanel module:"+this.uid+" panel:"+panel.uid+" location:"+panel.location+"\n");
            }
        } catch(e) {
            FBTrace.sysout("chromebug.showPanel error", e);
        }
    },

    // ******************************************************************************
    createContext: function(global, name)
    {
        var persistedState = null; // TODO
        var kind = "unknown";
        // domWindow in fbug is browser.contentWindow type nsIDOMWindow.
        // docShell has a nsIDOMWindow interface
        if (global instanceof Ci.nsIDOMWindow)
        {
            if (global.closed)
                return null;

            if (!Firebug.Chromebug.applicationReleased)  // then windows created could still be chromebug windows
            {
                if (Chromebug.XULAppModule.isChromebugDOMWindow(global))
                {
                    FBTrace.sysout("createContext dropping chromebug DOM window "+safeGetWindowLocation(global));
                    return null;
                }
            }
            // When a XUL window is destroyed the destructor functions from XBL run after the unload event.
            // We delete the context in the unload event, then the destructor can then trigger an new context creation.
            // To avoid this we maintain a list of the windows we just destroyed then clean them up on a setTimeout
            if (safeGetWindowLocation(global) in this.blockedWindowLocations)
                return null;

            var browser = Firebug.Chromebug.createBrowser(global, name);  // I guess this has side effects we need
            var context = Firebug.TabWatcher.watchTopWindow(global, safeGetWindowLocation(global), true);

            // we want to write window.console onto the actual window, not the wrapper
            if (global.wrappedJSObject && !global.wrappedJSObject.console)
                global.wrappedJSObject.console = Firebug.Console.createConsole(context, global);
            else // we don't know what we are doing
                global.console = Firebug.Console.createConsole(context, global);

            var url = STR.safeToString(global ? global.location : null);
            if (isDataURL(url))
            {
                var lines = context.sourceCache.load(url);
                var props = splitDataURL(url);
                if (props.fileName)
                    context.sourceCache.storeSplitLines(props.fileName, lines);
                FBTrace.sysout("createContext data url stored in to context under "+(props.fileName?props.fileName+ " & ":"just dataURL ")+url);
            }
            kind = "nsIDOMWindow"
        }
        else
        {
            var browser = Firebug.Chromebug.createBrowser(global, name);
            var context = Firebug.TabWatcher.createContext(global, browser, DomWindowContext);
            if (global+"" === "[object Sandbox]")
            {
                kind = "Sandbox";
                var props = Object.getOwnPropertyNames(global);
                FBTrace.sysout("Sandbox "+props.length, props);
            }
        }

        context.onLoadWindowContent = true; // all Chromebug contexts are active
        context.jsDebuggerCalledUs = true;  // jsd is always on
        if (FBTrace.DBG_ACTIVATION)
        {
            FBTrace.sysout('+++++++++++++++++++++++++++++++++ Chromebug.createContext '+kind+" name: "+context.getName()+" "+context.jsDebuggerCalledUs, context);
        }

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

    getOrCreateContext: function(global, name)
    {
        var context = Firebug.Chromebug.getContextByGlobal(global);

        if (FBTrace.DBG_CHROMEBUG && FBTrace.DBG_ACTIVATION)
            FBTrace.sysout("--------------------------- getOrCreateContext got context: "+(context?context.getName():"to be created as "+name));
        if (!context)
            context = Firebug.Chromebug.createContext(global, name);

        return context;
    },

    getContextByGlobal: function(global)
    {
        if (!this.contexts)
            this.contexts = Firebug.TabWatcher.contexts;


        if (global instanceof Window)
        {
            if (global.closed)
                return null;
            var docShellType = Chromebug.XULAppModule.getDocumentTypeByDOMWindow(global);
            if (docShellType === "Content")
                return Firebug.TabWatcher.getContextByWindow(global);
        }

        for (var i = 0; i < this.contexts.length; ++i)
        {
            var context = this.contexts[i];
            if (context.global && (context.global == global)) // will that test work?
                return context;
        }

        if (FBTrace.DBG_CHROMEBUG)
        {
            for (var i = 0; i < this.contexts.length; ++i)
            {
                var context = this.contexts[i];
                if (context.global)
                {
                    if (context.global == global)
                        FBTrace.sysout("getContextByGlobal; global "+STR.safeToString(global)+" no match for "+context.getName());
                }
                else
                    FBTrace.sysout("getContextByGlobal; no global in "+context.getName());
            }
        }

        return null;
    },

    initContext: function(context)
    {
        if (FBTrace.DBG_CHROMEBUG)
        {
                try {
                    FBTrace.sysout("Firebug.Chromebug.Module.initContext "+this.dispatchName+" context: "+context.uid+", "+context.getName()+" Firebug.currentContext="+(Firebug.currentContext?Firebug.currentContext.getName():"undefined")+"\n");
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
    reattachContext: function(browser, context) // Firebug.currentContext from chrome.js
    {
        // this is called after the chromebug window has opened.
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromebugPanel. reattachContext for context:"+context.uid+" isChromebug:"+context.isChromebug+"\n");
    },

    unwatchWindow: function(context, win)
    {
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromebugPanel.unwatchWindow for context:"+context.getName()+"(uid="+context.uid+") isChromebug:"+context.isChromebug+"\n");

    },

    blockedWindowLocations: {},

    destroyContext: function(context)
    {
        var context_window_location = safeGetWindowLocation(context.window);
        this.blockedWindowLocations[context_window_location] = 1;
        setTimeout(function cleanUpNoCreateList()
        {
            FBTrace.sysout("setTimeout fires after destroy on "+context_window_location);
            delete Firebug.Chromebug.blockedWindowLocations[context_window_location];
        });

        if (context.browser)
            delete context.browser.detached;

        Firebug.Chromebug.PackageList.deleteContext(context);

        var currentSelection = Firebug.Chromebug.contextList.getCurrentLocation();

        if ((currentSelection && currentSelection == context) || (!currentSelection) )
        {
         // Pick a new context to be selected.
            var contexts = Firebug.TabWatcher.contexts;
            for (var i = contexts.length; i; i--)
            {
                nextContext = contexts[i - 1];
                if (!nextContext)
                    FBTrace.sysout("Chromebug destroycontext Firebug.TabWatcher.contexts has an undefined value at i-1 "+(i-1)+"/"+Firebug.TabWatcher.contexts.length);
                if (nextContext.window && nextContext.window.closed)
                    continue;
                if (nextContext != context)
                    break;
            }

           if (FBTrace.DBG_CHROMEBUG)
           {
               if (nextContext)
                   FBTrace.sysout("ChromebugPanel.destroyContext " +context.getName()+" nextContext: "+nextContext.getName());
               else
                   FBTrace.sysout("ChromebugPanel.destroyContext " +context.getName()+" null nextContext with contexts.length: "+contexts.length);
           }

            Firebug.Chromebug.selectContext(nextContext);
        }
    },


    // ********************************************************

    transferFromStartup: function()
    {
        var startupObserverClass =  Cc["@getfirebug.com/chromebug-startup-observer;1"];
        var startupObserverInstance = startupObserverClass.createInstance();

        var startupObserver = startupObserverInstance.wrappedJSObject;

        var jsdState = startupObserver.getJSDState();
        if (!jsdState || !jsdState._chromebug)
        {
            setTimeout(function waitForFBTrace()
            {
                FBTrace.sysout("Chromebug onJSDActivate NO jsdState! startupObserver:", startupObserver);
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
            delete jsdState._chromebug.breakpointedScripts;

            var globals = jsdState._chromebug.globals; // []
            var globalTagByScriptTag = jsdState._chromebug.globalTagByScriptTag; // globals index by script tag
            var globalTagByScriptFileName = jsdState._chromebug.globalTagByScriptFileName; // globals index by script fileName
            var xulScriptsByURL = jsdState._chromebug.xulScriptsByURL;
            Firebug.Chromebug.buildInitialContextList(globals, globalTagByScriptTag, xulScriptsByURL, globalTagByScriptFileName);

            delete jsdState._chromebug.globalTagByScriptTag;
            delete jsdState._chromebug.jsContexts;
        }
        else
            FBTrace.sysout("ChromebugPanel.onJSDActivate: no _chromebug in startupObserver, maybe the command line handler is broken\n");

    },

    isChromebugURL: function(URL)
    {
        if (URL)
            var result = (URL.indexOf("/chromebug/") != -1 || URL.indexOf("/fb4cb/") != -1 || URL.indexOf("/firebug-service.js") != -1);
        else
            var result = false;

        // FBTrace.sysout("isChromebugURL "+result+" "+URL);
        return result;
    },

    platformDoesNotSupport: function(URL)
    {
        if (name === "resource://gre/components/ConsoleAPI.js") // then no platform support for debugging
            return true;
        else
            return false;
    },

    buildInitialContextList: function(globals, globalTagByScriptTag, xulScriptsByURL, globalTagByScriptFileName)
    {
        var previousContext = {global: null};
        var sourceFilesNeedingResets = [];
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
                    if (Firebug.Chromebug.isChromebugURL(STR.safeToString(global.location)))
                    {
                        delete globalTagByScriptTag[script.tag];
                        return;
                    }

                    var context = null;
                    if (previousContext.global == global)
                        context = previousContext;
                    else
                        context = Firebug.Chromebug.getOrCreateContext(global, url);
                }

                if (!context)
                {
                    if (! Firebug.Chromebug.unreachablesContext)
                        Firebug.Chromebug.unreachablesContext = Firebug.Chromebug.createContext();
                        Firebug.Chromebug.unreachablesContext.setName("chrome://unreachable/");
                    context =  Firebug.Chromebug.unreachablesContext;
                    FBTrace.sysout("buildEnumeratedSourceFiles NO context for script tag "+script.tag+" in "+script.fileName+" with globalsTag "+globalsTag);
                }
                else
                {
                    context.jsDebuggerCalledUs = true;
                }
                previousContext = context;

                var sourceFile = context.sourceFileMap[url];

                if (!sourceFile)
                {
                    sourceFile = new Firebug.EnumeratedSourceFile(url);
                    sourceFilesNeedingResets.push(sourceFile);
                    context.addSourceFile(sourceFile);
                }
                if (FBTrace.DBG_SOURCEFILES)
                    FBTrace.sysout("Using globalsTag "+globalsTag+ " assigned "+script.tag+"|"+url+" to "+ context.getName());
                sourceFile.innerScripts[script.tag] = script;

                delete globalTagByScriptTag[script.tag];
            }});

        for(var i = 0; i < sourceFilesNeedingResets.length; i++)
            fbs.resetBreakpoints(sourceFilesNeedingResets[i], Firebug.Debugger);  // don't get confused, Firebug.Debugger is chromebug's Debugger

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
        // Firebug.currentContext is not context. Maybe this does not happen in firebug because the user always starts
        // with an active tab with Firebug.currentContext and cause the breakpoints to land in the default context.
        if (Firebug.currentContext != context)
            Firebug.Chromebug.selectContext(context);

        if (Firebug.currentContext != context)
            FBTrace.sysout("ChromebugPanle.onStop showContext FAILS "+Firebug.currentContext.getName());

        var stopName = getExecutionStopNameFromType(type);
        if (FBTrace.DBG_UI_LOOP)
            FBTrace.sysout("ChromebugPanel.onStop type: "+stopName+ " context.getName():"+context.getName() + " context.stopped:"+context.stopped );

        try
        {
            var src = frame.script.isValid ? frame.script.functionSource : "<invalid script>";
        } catch (e) {
            var src = "<invalid script>";
        }

        if (FBTrace.DBG_UI_LOOP)
            FBTrace.sysout("ChromebugPanel.onStop script.tag: "+frame.script.tag+" @"+frame.line+":"+frame.pc+" in "+frame.script.fileName, "source:"+src);

        var cbContextList = document.getElementById('cbContextList');
        cbContextList.setAttribute("highlight", "true");

        // The argument 'context' is stopped, but other contexts are not stopped.

        Firebug.Chromebug.eachContext(function visitContext(anotherContext)
        {
            return;  // HACK <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
            if (anotherContext != context)
            {
                if (anotherContext.window instanceof nsIDOMWindow)
                {
                    if ( !Firebug.Chromebug.isChromebugURL(anotherContext.getName()) )
                    {
                        if (FBTrace.DBG_UI_LOOP)
                            FBTrace.sysout("ChromebugPanel.onStop suppressing context: "+(anotherContext?anotherContext.getName():null));
                        try
                        {
                            Firebug.Debugger.suppressEventHandling(anotherContext);
                            anotherContext.suppressed = true;
                            anotherContext.stopped;
                        }
                        catch(exc)
                        {
                            if(FBTrace.DBG_ERRORS)
                                FBTrace.sysout("ChromebugPanel.onStop suppressing context FAILED:"+exc, exc);
                        }
                    }
                }
            }
        });

        var calledFrame = frame;
        while (frame = frame.callingFrame)
        {
            var callingContext = Firebug.Debugger.getContextByFrame(frame);

            if (callingContext && !callingContext.stopped)
            {
                if (FBTrace.DBG_UI_LOOP)
                    FBTrace.sysout("ChromebugPanel.onStop marking context: "+(callingContext?callingContext.getName():null));
                callingContext.stopped = true;
                callingContext.stoppedFrame = calledFrame;
            }
        }

        return -1;
    },

    onResume: function(context)
    {
        var cbContextList = document.getElementById('cbContextList');
        cbContextList.removeAttribute("highlight");

        var panel = context.getPanel("script", true);
        if (panel && panel.location)
        {
            var location = "0@"+panel.getObjectLocation(panel.location);

            if (panel.selectedSourceBox) // see firebug.js buildViewAround
                var lineNo = panel.selectedSourceBox.firstViewableLine + panel.selectedSourceBox.halfViewableLines;

            if (lineNo)
                location = lineNo+"@"+panel.getObjectLocation(panel.location);

            //prefs.setCharPref("extensions.chromebug.previousContext", location);
            //prefService.savePrefFile(null);

            if (FBTrace.DBG_INITIALIZE)
                FBTrace.sysout("ChromebugPanel.onResume previousContext:"+ location);
        }

        Firebug.Chromebug.eachContext(function clearStopped(anotherContext)
        {
            delete anotherContext.stopped;
            delete anotherContext.stoppedFrame;
            if (anotherContext != context && anotherContext.suppressed)
                Firebug.Debugger.unsuppressEventHandling(anotherContext);
            delete anotherContext.suppressed;
        });

        FBTrace.sysout("ChromebugPanel.onResume context.getName():"+context.getName() + " context.stopped:"+context.stopped );

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
        FBTrace.sysout("Chromebug onFunctionConstructor");
    },

    onSourceFileCreated: function(context, sourceFile)
    {
        var description = Chromebug.parseURI(sourceFile.href);
        var pkg = Firebug.Chromebug.PackageList.getOrCreatePackage(description);
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
                    var context = Firebug.currentContext;
                    var info = getAncestorByClass(event.target, "messageInfoBody");
                    var message = info.repObject;
                    if (!message && info.wrappedJSObject)
                        message = info.wrappedJSObject.repObject;
                    if (message)
                    {
                        var filename = encodeURI(event.target.text);
                        var line = event.target.getAttribute("lineNumber");

                        var found = Firebug.Chromebug.allFilesList.eachSourceFileDescription(function findMatching(d)
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
            var c = Chromebug.parseComponentURI(url);
            if (c)
            {
                var sourceFile = sourceFileMap[url];
                if (!sourceFile)
                {
                    sourceFile = new Firebug.EnumeratedSourceFile(url);
                    sourceFileMap[url] = sourceFile;
                    var name = c.pkgName;
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

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Commands

    openConsole: function(prefDomain, url)
    {
        try
        {
            var tracing = CCSV("@mozilla.org/commandlinehandler/general-startup;1?type=FBTrace",
                "nsICommandLineHandler");

            tracing.wrappedJSObject.openConsole(window, prefDomain);
        }
        catch (err)
        {
            window.dump("chromebug; open tracing console " + err + "\n");
        }
    },

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
            FBTrace.sysout("toggleIntroduction ", "Firebug.Chromebug.showIntroduction "+
                Firebug.Chromebug.showIntroduction);

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
        var current_location = Firebug.Chromebug.contextList.getCurrentLocation();
        FBTrace.sysout("Firebug.Chromebug.reload current_location", Firebug.Chromebug.contextList.getObjectLocation(current_location));
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

    openXPCOMExplorer: function()
    {
        var xpcomExplorerURL = "chrome://xpcomExplorer/content/xpcomExplorer.xul";
        this.xpcomExplorer = openWindow('xpcomExplorer',xpcomExplorerURL);
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
        if (FBTrace.DBG_STACK) FBTrace.sysout("ChromebugPanel.dumpStackToConsole for: ", title);
        var trace = FBL.getCurrentStackTrace(context);  // halt(), getCurrentStackTrace(), dumpStackToConsole(), =>3
        if (trace)
        {
            trace.frames = trace.frames.slice(3);

            Firebug.Console.openGroup(title, context)
            Firebug.Console.log(trace, context, "stackTrace");
            Firebug.Console.closeGroup(context, true);
        }
        else
            if (FBTrace.DBG_STACK) FBTrace.sysout("ChromebugPanel.dumpStackToConsole FAILS for "+title, " context:"+context.getName());
    },

    openAboutDialog: function()
    {
        var extensionManager = CCSV("@mozilla.org/extensions/manager;1", "nsIExtensionManager");
        openDialog("chrome://mozapps/content/extensions/about.xul", "",
            "chrome,centerscreen,modal", "urn:mozilla:item:chromebug@johnjbarton.com", extensionManager.datasource);
    },

    onClickStatusIcon: function()
    {
        Firebug.Chromebug.contextAnalysis(Firebug.currentContext);
    },

    contextAnalysis: function(context)
    {
        if (!Firebug.currentContext)
            return;
        Firebug.Console.openGroup("Context Analysis", Firebug.currentContext)
        Firebug.Console.log(Firebug.Chromebug.contexts, Firebug.currentContext);
        Firebug.Console.log(Firebug.Chromebug.jsContexts, Firebug.currentContext);
        var ejs = fbs.eachJSContext();
        if (ejs)
            Firebug.Console.log(ejs, Firebug.currentContext);
        if (context)
            Firebug.Console.log(context, Firebug.currentContext);
        else
            Firebug.Console.log(Firebug.currentContext, Firebug.currentContext);
        Firebug.Console.closeGroup(Firebug.currentContext, true);
    },
});

// ************************************************************************************************

/**
 * Dumping into the system console window (useful in cases where dumping into the Chromebug
 * tracing console can't be done since it's too soon). Stack trace included in the output.
 */
Firebug.Chromebug.systemDump = function(msg)
{
    var text = "-----> " + msg + "\n";

    for (var frame = Components.stack, i=0; frame; frame = frame.caller, i++)
    {
        // Skip this frame.
        if (i == 0)
            continue;

        var fileName = unescape(frame.filename ? frame.filename : "");
        var sourceLine = frame.sourceLine ? frame.sourceLine : "";
        var lineNumber = frame.lineNumber ? frame.lineNumber : "";
        text += "    - " + fileName + "(" + lineNumber + ")\n";
    }

    window.dump("\n" + text + "\n");
}

Firebug.Chromebug.dumpFileTrack = function()
{
    var jsdState = Application.storage.get('jsdState', null);
    if (jsdState)
        fbs.dumpFileTrack(jsdState.getAllTrackedFiles());
    else
        FBTrace.sysout("dumpFileTrack, no jsdState!");
}

// ************************************************************************************************

window.timeOut = function(title)
{
    var t = new Date();
    if (window.startTime)
        window.dump(title+": "+(t - window.startTime)+"\n");
    window.startTime = t;
}

// ************************************************************************************************

Firebug.Chromebug.Package = function(name, kind)
{
    this.name = name;
    this.kind = kind;

    this.contexts = [];

    FBTrace.sysout("Create Package "+name+"("+kind+")");
}

Firebug.Chromebug.Package.prototype =
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

// ************************************************************************************************
// chrome://<packagename>/<part>/<file>
// A list of packages each with a context list

Firebug.Chromebug.PackageList = extend(new Firebug.Listener(),
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
        var pkgName = description.path;
        var kind = description.kind;

        if (!this.pkgs.hasOwnProperty(pkgName))
            this.pkgs[pkgName] = new Firebug.Chromebug.Package(pkgName, kind);

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

    setCurrentLocation: function(pkg)
    {
          cbPackageList.location = pkg;
          if (FBTrace.DBG_LOCATIONS)
              FBTrace.sysout("PackageList.setCurrentLocation sent onSetLocation to "+this.fbListeners.length);
          dispatch(this.fbListeners, "onSetLocation", [this, pkg]);
    },

    getLocationList: function()  // list of packages
    {
        var list = [];
        Firebug.Chromebug.PackageList.eachPackage( function appendPackage(pkg)
        {
            list.push(pkg);
        });
        list.push(Firebug.Chromebug.PackageList.getNoFilterPackage());

       if (FBTrace.DBG_LOCATIONS)
            FBTrace.sysout("PackageList getLocationList list "+list.length, list);

        return list;
    },

    getDefaultPackageName: function()
    {
        return "        No Filter  "; // in lexographical order the spaces will be early
    },

    getNoFilterPackage: function()
    {
        if (!this.noFilterPackage)
            this.noFilterPackage = new Firebug.Chromebug.Package(this.getDefaultPackageName(), "dummy");
        return this.noFilterPackage;
    },

    getDefaultLocation: function()
    {
        return this.getNoFilterPackage();
    },

    getObjectLocation: function(pkg)
    {
        return pkg.name;
    },

    getObjectDescription: function(pkg)
    {
        var d = {path: "Show only files in:", name: pkg.name};
        if (FBTrace.DBG_LOCATIONS)
            FBTrace.sysout("getObjectDescription name:"+d.name, pkg);
        return d;
    },

    onSelectLocation: function(event)
    {
        var pkg = event.currentTarget.repObject;
        if (pkg)
        {
            Firebug.Chromebug.PackageList.setCurrentLocation(pkg);
            Firebug.Chromebug.saveState(Firebug.currentContext);
        }
        else
        {
            FBTrace.sysout("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
        }
    },
});

Firebug.Chromebug.packageListLocator = function(xul_element)
{
    var list = Firebug.Chromebug.PackageList;
    return Chromebug.connectedList(xul_element, list);
}

// ************************************************************************************************
// The implements the list on the right side of the top bar with the prefix "context:"

Firebug.Chromebug.contextList =
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
           name: (d ? d.name : context.getName()) +(title?"   "+title:""),
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
            if (!Firebug.currentContext)
                Firebug.currentContext = context;

            Firebug.Chromebug.selectContext(context);

            if (FBTrace.DBG_LOCATIONS)
                FBTrace.sysout("Chromebug.contextList.onSelectLocation context:"+ context.getName()+" Firebug.currentContext:"+Firebug.currentContext.getName());

            event.currentTarget.location = context;

            Firebug.Chromebug.saveState(context);
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
            if (STR.safeToString(context.global.location) === url)
                return context;
        });
    }
}

Firebug.Chromebug.contextListLocator = function(xul_element)
{
    var list = Firebug.Chromebug.contextList;
    return Chromebug.connectedList(xul_element, list);
}

// ************************************************************************************************

Firebug.Chromebug.allFilesList = extend(new Chromebug.SourceFileListBase(), {

    kind: "all",

    parseURI: top.Chromebug.parseURI,

    // **************************************************************************
    // PackageList listener

    onSetLocation: function(packageList, current)
    {
        if (Firebug.Chromebug.PackageList !== packageList)
            return;
        if (FBTrace.DBG_LOCATIONS)
            FBTrace.sysout("onSetLocation current: "+current, current);

        var noFilter = Firebug.Chromebug.PackageList.getDefaultPackageName();
        if (current.name == noFilter)
            Firebug.Chromebug.allFilesList.setFilter(null)
        else
        {
            var targetName = current.name;
            Firebug.Chromebug.allFilesList.setFilter( function byPackageName(description)
            {
                return (description && (targetName == description.path) );
            });
        }
    },

    //**************************************************************************
    // Sync the Chromebug file list to the context's Script file list.
    onPanelNavigate: function(object, panel)
    {
        if (panel.name !== "script")
            return;

        var sourceFile = object;

        if (FBTrace.DBG_LOCATIONS)
            FBTrace.sysout("onPanelNavigate "+sourceFile, panel);

        if (sourceFile)
            $('cbAllFilesList').location = this.getDescription(sourceFile);
    },

    onViewportChange: function(sourceLink)
    {
        var context = Firebug.currentContext;
        Firebug.Chromebug.saveState(context);
    },
});

Firebug.Chromebug.allFilesListLocator = function(xul_element)
{
    if (FBTrace.DBG_LOCATIONS)
        FBTrace.sysout("AllFilesListLocator called");
    return Chromebug.connectedList(xul_element, Firebug.Chromebug.allFilesList);
}

// ************************************************************************************************

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
            FBTrace.sysout("ChromebugPanel getFrameWindow fails: ", exc);  // FBS.DBG_WINDOWS
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

function ChromebugOnLoad(event)
{
    FBTrace.sysout("ChromebugOnLoad "+event.originalTarget.documentURI+"\n");
}
function ChromebugOnDOMContentLoaded(event)
{
    FBTrace.sysout("ChromebugOnDOMContentLoaded "+event.originalTarget.documentURI+"\n");
}

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.Chromebug);
Firebug.registerStringBundle("chrome://chromebug/locale/chromebug.properties");

// ************************************************************************************************
} // with FBL

return Firebug.Chromebug;
});

