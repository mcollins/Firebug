/* See license.txt for terms of usage */


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
const  jsdIExecutionHook 	 = Components.interfaces.jsdIExecutionHook;

const NOTIFY_ALL = nsIWebProgress.NOTIFY_ALL;
const nsIObserverService = Ci.nsIObserverService
const observerService = CCSV("@mozilla.org/observer-service;1", "nsIObserverService");


const iosvc = CCSV("@mozilla.org/network/io-service;1", "nsIIOService");
const chromeReg = CCSV("@mozilla.org/chrome/chrome-registry;1", "nsIToolkitChromeRegistry");

const PrefService = Cc["@mozilla.org/preferences-service;1"];
const nsIPrefBranch2 = Components.interfaces.nsIPrefBranch2;
const prefs = PrefService.getService(nsIPrefBranch2);
const nsIPrefService = Components.interfaces.nsIPrefService;
const prefService = PrefService.getService(nsIPrefService);

const reChromeBug = /^chrome:\/\/chromebug\//;

const fbBox = $("fbContentBox");
const interfaceList = $("cbInterfaceList");
const inspectClearProfileBar = $("fbToolbar");
const appcontent = $("appcontent");
const versionURL = "chrome://chromebug/content/branch.properties";

const tabBrowser = $("content");
const statusText = $("cbStatusText");
this.namespaceName = "ChromeBug";

var docShellTypeNames = ["Chrome", "Content", "ContentWrapper", "ChromeWrapper"]; // see nsIDocShellTreeItem

const sessionStore = Components.classes["@mozilla.org/browser/sessionstore;1"].
                             getService(Components.interfaces.nsISessionStore);

//*******************************************************************************

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

function ContainedDocument(xul_window, context)
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

ContainedDocument.prototype = extend(GlobalScopeInfo.prototype,
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
        var index = ChromeBugWindowInfo.getXULWindowIndex(xul_window) + 1;
        var win = ChromeBugWindowInfo.getDOMWindowByDocShell(xul_window.docShell);
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
            FBTrace.dumpProperties("Chromebug.getDocumentType, docShell is not a nsIDocShellTreeItem:", docShell);
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
            this.docShell = ChromeBugWindowInfo.getDocShellByDOMWindow(this.getDOMWindow());
        }
        return this.docShell;
    },

    getDOMWindow: function()
    {
        return this.context.window;
    },

    getGlobal: function()
    {
        return getDOMWindow();
    },
    
    getRootDOMWindow: function()  // maybe a container hierarchy?
    {
    	return  ChromeBugWindowInfo.getDOMWindowByDocShell(this.xul_window.docShell);
    },

});
ChromeRootGlobalScopeInfo.prototype = ContainedDocument.prototype;

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
        var name = this.context.window.location.href;
        return {path: path, name: name}
    },
    getContext: function()
    {
        var context = this.context;
        context.sourceFileMap = {};
        setTimeout( function()  // see if we can beat the user to the button...
        {
            Firebug.Chromebug.addComponentScripts(context);
        });
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
            FBTrace.dumpProperties("FrameGlobalScopeInfo location.href fails, status:"+(this.context.window?this.context.window.status:"no window"), exc);
            FBTrace.dumpProperties("FrameGlobalScopeInfo global", this.global);
        }
        return {path: path, name: name}
    },
    getContext: function()
    {
        var context = this.context;
        context.sourceFileMap = {};
        setTimeout( function()  // see if we can beat the user to the button...
        {
            Firebug.Chromebug.addComponentScripts(context);
        });
        return this.context;
    },

    getGlobal: function()
    {
        return this.global;
    }
});


var GlobalScopeInfos =
{
    allGlobalScopeInfos: [],

    getGlobalScopeInfos: function()
    {
        return this.allGlobalScopeInfos;
    },

    add: function(context, gs)
    {
        this.allGlobalScopeInfos.push( gs );
        context.globalScope = gs;

        if(!FirebugContext)
                FirebugContext = context;

        TabWatcher.dispatch("loadedContext", [context]);
        if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("GlobalScopeInfos add "+ gs.kindOfInfo+" for context "+context.uid+", "+context.window.location );
    },

    addHiddenWindow: function(hidden_window)
    {
        var context = ChromeBugWindowInfo.createContextForDOMWindow(hidden_window);
        this.hiddenWindow = new HiddenWindow(hidden_window, context);
        this.add(context, this.hiddenWindow);
        return context;
    },

    getComponentInfo: function()
    {
        return this.hiddenWindow;
    },

    addDocumentAsScopes: function(xul_window, typeOfDocument)
    {
        var docShell = xul_window.docShell;
        if (!docShell)  // Too early??
            return;

        var parentDOMWindow = ChromeBugWindowInfo.getDOMWindowByDocShell(xul_window.docShell);  // its context also?

        ChromeBugWindowInfo.eachDocShell(docShell, (typeOfDocument=="Chrome"), function(childDocShell)
            {
                if (childDocShell.contentViewer)  // nsiDocShell.nsIContentViewer
                {
                    var childDoc = childDocShell.contentViewer.DOMDocument;
                    if (childDoc instanceof nsIDOMDocument)
                    {
                        var domWindow = ChromeBugWindowInfo.getDOMWindowByDocShell(childDocShell);

                        var context = ChromeBugWindowInfo.getContextByDOMWindow(domWindow);
                        if (context)
                        {
                            GlobalScopeInfos.remove(context.globalScope);
                        }
                        else
                        {
                            if (parentDOMWindow != domWindow)
                                context = ChromeBugWindowInfo.createContextForDOMWindow(domWindow, ChromeBugWindowInfo.getContextByDOMWindow(parentDOMWindow));
                            else
                                context = ChromeBugWindowInfo.createContextForDOMWindow(domWindow);
                        }

                        var gs = new ContainedDocument(xul_window, context);
                        GlobalScopeInfos.add(context, gs);
                    }
                }
            }
        );
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
        if (gs && FBTrace.DBG_CHROMEBUG) FBTrace.sysout("GlobalScopeInfos remove ", gs.kindOfInfo+ " "+gs.context.uid+", "+gs.context.window.location);
    },

    destroy: function(context)
    {
        var gs = this.getGlobalScopeInfoByContext(context);
        this.remove(gs);
    }

}

//************************************************************************
//  XUL Window list, visible global scopes containing

var ChromeBugWindowInfo = {

    xulWindows: [],  // all xul_windows
    xulWindowTags: [], // co-indexed strings for xulWindows

    getDOMWindow: function(index)
    {
        var xul_window = this.xulWindows[index];
        return this.getDOMWindowByDocShell(xul_window.docShell);
    },

    createContextByDocShell: function(docShell, xul_window)
    {
        var domWindow = this.getDOMWindowByDocShell(docShell);

        var parentDOMWindow = this.getDOMWindowByDocShell(xul_window.docShell);
        if (parentDOMWindow != domWindow)
            context = this.createContextForDOMWindow(domWindow, this.getContextByDOMWindow(parentDOMWindow));
        else
            context = this.createContextForDOMWindow(domWindow);

        return context;
    },

    getContextByDOMWindow: function(win, dontYellIfNoFind)
    {
        if (!this.contexts)
            this.contexts = TabWatcher.contexts;
        if (!this.contexts)
            return; // got called before initialize() on TabWatcher.

        if (win)
        {
            for (var i = 0; i < this.contexts.length; ++i)
            {
                var context = this.contexts[i];
                if (FBTrace.DBG_WINDOWS && win.location && context.window.location) FBTrace.sysout("ChromeBugPanel.getContextByDOMWindow looking for "+win.location.href+" trying "+(context.window && context.window.location)?context.window.location.href:"<no window>"+"\n");
                if (context.window == win)
                    return context;
            }
            if (!dontYellIfNoFind)
                FBTrace.dumpStack("ChromeBugPanel.getContextByDOMWindow no find win.location:"+win.location+"\n");
            return null;
        }
        FBTrace.dumpStack("ChromeBugPanel.getContextByDOMWindow win null");
    },

    getContextByGlobal: function(global)
    {
        if (!this.contexts)
            this.contexts = TabWatcher.contexts;

        if (global.window)
        {
            for (var i = 0; i < this.contexts.length; ++i)
            {
                var context = this.contexts[i];
                if (context.global.window && context.global.window == global.window)
                    return context;
            }
        }

        if (FBTrace.DBG_WINDOWS)
        {
            try {
                var location = global.location;
            } catch (exc) {
                FBTrace.sysout("ChromeBugPanel.getContextByGlobal no find, no global.location\n");
                return;
            }
            if (!location)
            {
                FBTrace.sysout("ChromeBugPanel.getContextByGlobal global.location undefined\n");
                return;
            }
            FBTrace.sysout("ChromeBugPanel.getContextByGlobal checking "+this.contexts.length+" contexts for location:"+location+"\n");
            for (var i = 0; i < this.contexts.length; ++i)
            {
                var context = this.contexts[i];
                if (context.global.location)
                {
                    if (context.global.location != location)
                        FBTrace.sysout("ChromeBugPanel.getContextByGlobal no find "+context.global.location+"!="+location+"\n");
                    else
                    {
                        FBTrace.sysout("ChromeBugPanel.getContextByGlobal should have found windows"+context.global +"="+(context.global.window==global.window)+"="+global+"\n");
                        FBTrace.sysout("ChromeBugPanel.getContextByGlobal context.global.location:"+context.global.location+"\n");
                        FBTrace.sysout("ChromeBugPanel.getContextByGlobal         global.location:"+global.location+"\n");
                    }
                }
                else
                {
                   FBTrace.sysout("ChromeBugPanel.getContextByGlobal context.global with no location\n");
                }
            }
        }
        return null;
    },

    createContextForDOMWindow: function(domWindow, parentContext)
    {
        try {
            var persistedState = null; // TODO
            // domWindow in fbug is browser.contentWindow type nsIDOMWindow.
            // docShell has a nsIDOMWindow interface
            fbs.countContext(true); // connect to firebug-service

            var browser = this.createBrowser(domWindow);  // not a content window

            if (!FirebugChrome)
                FBTrace.dumpStack("FirebugChrome is null??");

            var context = Firebug.createTabContext(domWindow, browser, FirebugChrome, persistedState);
            context.isChromeBug = true;
            context.loaded = true;
            context.detached = true;
            context.originalChrome = null;
            context.global = domWindow;
            context.windows.push(domWindow); // since we don't watchWindows in chromebug

            var persistedState = FBL.getPersistedState(context, "script");
            if (!persistedState.enabled)  // for now default all chromebug window to enabled.
                persistedState.enabled = "enable";

            if (parentContext)  // The JSContext is the same for all child docShell DOMWindows. ?
            {
                context.sourceFileMap = parentContext.sourceFileMap;
                context.parentContext = parentContext;
            }
            else
                context.parentContext = context;

            if (!this.contexts)
                this.contexts = TabWatcher.contexts;
            this.contexts.push(context);
            context.uid = this.contexts.length;

            domWindow.addEventListener("unload", onUnloadDOMWindow, false);

            if (FBTrace.DBG_CHROMEBUG) {
                FBTrace.sysout("ChromeBugPanel.createContextForDOMWindow ++++++++++++++++++++++ id="+context.uid+" and domWindow.location.href="+domWindow.location.href+"\n");
            }

            TabWatcher.dispatch("initContext", [context]);  // created

            return context;

        } catch(e) {
            FBTrace.dumpProperties("createContextForDOMWindow failed:", e);
        }
    },

    getDocShellByDOMWindow: function(domWindow)
    {
       if (domWindow instanceof Components.interfaces.nsIInterfaceRequestor)
        {
            var navi = domWindow.getInterface(Components.interfaces.nsIWebNavigation);
            if (navi instanceof Components.interfaces.nsIDocShellTreeItem)
            {
                return navi;
            }
            else
                FBTrace.dumpStack("Chromebug getDocShellByDOMWindow, nsIWebNavigation notA nsIDowShellTreeItem");
        }
        else
        {
            FBTrace.dumpProperties("Chromebug getDocShellByDOMWindow, window notA nsIInterfaceRequestor:", domWindow);
            FBTrace.sysout("getDocShellByDOMWindow domWindow.location:"+domWindow.location, " isA nsIDOMWindow: "+(domWindow instanceof nsIDOMWindow));
        }
    },

    destroyContexts: function(xul_window)
    {
        var docShell = xul_window.docShell;

        this.eachDocShell(docShell, true, this.destroyByDocShell);
        this.eachDocShell(docShell, false, this.destroyByDocShell);
    },

    destroyByDocShell: function(childDocShell)
    {
        var domWindow = ChromeBugWindowInfo.getDOMWindowByDocShell(childDocShell);
        this.destroyContextByDOMWindow(domWindow);
    },

    destroyContextByDOMWindow: function(domWindow)
    {
        var context = ChromeBugWindowInfo.getContextByDOMWindow(domWindow);
        if (context)
        {
            remove(ChromeBugWindowInfo.contexts, context);
            TabWatcher.dispatch("destroyContext", [context]);
            GlobalScopeInfos.destroy(context);
        }
        else
        {
            FBTrace.sysout("destroyContextByDOMWindow did not find context for domWindow:"+ domWindow.location+"\n");
            for (var i = 0; i < ChromeBugWindowInfo.contexts.length; i++)
            {
                FBTrace.sysout(i+"]="+ChromeBugWindowInfo.contexts[i].window.location+"\n");
            }
        }
    },

    getXULWindowByRootDOMWindow: function(domWindow)
    {
        if(FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBugPanel.getXULWindowByRootDOMWindow "+domWindow.location.href+" for xulWIndows.length="+this.xulWindows.length+"\n");
        for (var i = 0; i < this.xulWindows.length; i++)
        {
            var xul_window = this.xulWindows[i];
            var xul_windows_domWindow = this.getDOMWindowByDocShell(xul_window.docShell);
            if (FBTrace.DBG_CHROMEBUG)
            {
                if (xul_windows_domWindow)
                    FBTrace.sysout("getXULWindowByRootDOMWindow comparing "+xul_windows_domWindow.location.href+" with "+domWindow.location.href+"\n");
                else
                    FBTrace.dumpProperties("getXULWindowByRootDOMWindow no domWindow for xul_window #"+i, xul_window);
            }

            if (xul_windows_domWindow == domWindow)
                return xul_window;
        }
    },

    getDOMWindowByDocShell: function(docShell)
    {
        try
        {
            if (docShell)
            {
                if (docShell instanceof nsIInterfaceRequestor)
                {
                    var win = docShell.getInterface(nsIDOMWindow);
                    if (win)
                        return win;
                    else
                        FBTrace.sysout("Firebug.Chromebug.getDOMWindowByDocShell xul_win.docShell has nsIInterfaceRequestor but not nsIDOMWindow\n");
                }
                else
                    FBTrace.sysout("Firebug.Chromebug.getDOMWindowByDocShell xul_win.docShell has no nsIInterfaceRequestor\n");
            }
            else
                FBTrace.dumpStack("Firebug.Chromebug.getDOMWindowByDocShell xul_win has no docShell");
        }
        catch (exc)
        {
            FBTrace.dumpProperties("Firebug.Chromebug.getDOMWindowByDocShell FAILS", exc);
        }
    },

    getXULWindows: function()
    {
        return this.xulWindows;
    },

    getXULWindowIndex: function(xul_win)
    {
        return this.xulWindows.indexOf(xul_win);
    },

    getXULWindowTags: function()
    {
        return this.xulWindowTags;
    },

    getXULWindowTag: function(xul_window)
    {
        var i = this.getXULWindowIndex(xul_window);
        return this.xulWindowTags[i];
    },

    getXULWindowByTag: function(xul_window_tag)
    {
        var i = this.xulWindowTags.indexOf(xul_window_tag);
        return this.xulWindows[i];
    },

    eachDocShell: function(docShell, trueForChromeFalseForContent, iterator)
    {
        var treeItemType = trueForChromeFalseForContent ? nsIDocShellTreeItem.typeChrome : nsIDocShellTreeItem.typeContent;
        // From inspector@mozilla.org inspector.js appendContainedDocuments
        // Load all the window's content docShells
        var containedDocShells = docShell.getDocShellEnumerator(treeItemType,
                                          nsIDocShell.ENUMERATE_FORWARDS);
        while (containedDocShells.hasMoreElements())
        {
            try
              {
                var childDocShell = containedDocShells.getNext().QueryInterface(nsIDocShell);
                iterator(childDocShell);
              }
              catch (exc)
              {
                FBTrace.dumpProperties("ChromeBugPanels.eachDocShell FAILED", exc);
              }
        }
        return true;
    },

    iterateXULWindows: function(handler)
    {
        for(var i = 0; i < this.xulWindows.length; i++)
        {
            var xul_window = this.xulWindows[i];
            ChromeBugWindowInfo.eachDocShell
            (
                xul_window.docShell, true, function(childDocShell)
                {
                    if (childDocShell.contentViewer) // nsiDocShell.nsIContentViewer
                    {
                        var childDoc = childDocShell.contentViewer.DOMDocument;

                        if (childDoc instanceof nsIDOMDocument && childDoc.defaultView instanceof nsIDOMWindow)
                            FBL.iterateWindows(childDoc.defaultView, handler);
                    }
                }
            );
        }
    },
    //************************************************************
    initialize: function()
    {
        FBTrace.DBG_CHROMEBUG = Firebug.getPref("extensions.chromebug", "DBG_CHROMEBUG");
        FBTrace.DBG_CB_CONSOLE = Firebug.getPref("extensions.chromebug", "DBG_CB_CONSOLE");

        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("cb.ChromeBugWindowInfo.initialize");

        this.xulWindowTagSeed = FBL.getUniqueId();
        this.fakeTabBrowser = $("content");
        this.fakeTabBrowser.browsers = [];
        
        this.fullVersion = Firebug.loadVersion(versionURL);
        if (this.fullVersion)
        	window.title = "Chromebug "+this.fullVersion;
    },

    watchXULWindows: function()
    {
        var enumerator = windowMediator.getXULWindowEnumerator(null);
        while(enumerator.hasMoreElements())
        {
            var xul_window = enumerator.getNext();
            if (xul_window instanceof nsIXULWindow)
            {
                this.addXULWindow(xul_window);
            }
        }
        try
        {
            windowMediator.addListener(this);  // removed in this.shutdown
        }
        catch(exc)
        {
            FBTrace.dumpProperties("ChromeBugWindowInfo initialize fails", exc);
        }
    },

    shutdown: function()
    {
        try
        {
            windowMediator.removeListener(this);  // added in this.initialize()
        }
        catch (exc)
        {
            FBTrace.dumpProperties("ChromeBugWindowInfo shutdown fails", exc);
        }
    },

    //***********************************************************************************
    // nsIWindowMediatorListener

    onOpenWindow: function(xul_window) {
        try
        {
            if (xul_window instanceof nsIXULWindow)
            {
                this.addXULWindow(xul_window);
            }
        }
        catch (e)
        {
            FBTrace.dumpProperties("chromebug-onOpenWindow-FAILS", e);
            FBTrace.dumpProperties("chromebug-onOpenWindow-xul_window", xul_window);
        }
    },

    addXULWindow: function(xul_window)
    {
        if (!xul_window.docShell)
            FBTrace.dumpProperties("Firebug.Chromebug.addXULWindow no docShell", xul_window);
        
        var outerDOMWindow = this.getDOMWindowByDocShell(xul_window.docShell);

        if (outerDOMWindow == document.defaultView)
            return;  // This is my life we're talking about.

        if (outerDOMWindow.location.href == "chrome://fb4cb/content/traceConsole.xul")
            return; // don't track our own tracing console.
        window.dump("outerDOMWindow.location.href "+outerDOMWindow.location.href+"\n");

        this.xulWindows.push(xul_window);
        var newTag = "tag-"+this.xulWindowTagSeed++;
        this.xulWindowTags.push(newTag);

        var context = ChromeBugWindowInfo.createContextForDOMWindow(outerDOMWindow);
        var gs = new ChromeRootGlobalScopeInfo(xul_window, context);
        GlobalScopeInfos.add(context, gs);

        if (ChromeBugWindowInfo.stateReloader)  // TODO this should be per xul_window
            outerDOMWindow.addEventListener("DOMContentLoaded", ChromeBugWindowInfo.stateReloader, true);

        context.domWindowWatcher = function(event)
        {
            // We've just loaded all of the content for an nsiDOMWindow. We need to create a context for it.
            var outerDOMWindow = event.currentTarget; //Reference to the currently registered target for the event.
            var domWindow = event.target.defaultView;

            var parentContext = this; // bindFixed at addEventListener
            var outerDOMWindow = parentContext.window;
            if (domWindow == outerDOMWindow)
            {
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("context.domWindowWatcher found outerDOMWindow", outerDOMWindow.location);
                return;
            }

            if (domWindow.location.protocol != "chrome:")  // the chrome in ChromeBug
                return;

            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("context.domWindowWatcher, new window in outerDOMWindow", outerDOMWindow.location+" event.orginalTarget: "+event.originalTarget.documentURI);

            var context = ChromeBugWindowInfo.getContextByDOMWindow(domWindow, true);
            if (context)
            {
                // then we had one, say from a Frame
                 if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("ChromeBugPanel.domWindowWatcher found context with id="+context.uid+" and outerDOMWindow.location.href="+outerDOMWindow.location.href+"\n");
                GlobalScopeInfos.remove(context.globalScope);
            }
            else
            {
                var context = ChromeBugWindowInfo.createContextForDOMWindow(domWindow, parentContext);
                if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("ChromeBugPanel.domWindowWatcher created context with id="+context.uid+" and outerDOMWindow.location.href="+outerDOMWindow.location.href+"\n");
            }
            var gs = new ContainedDocument(xul_window, context);
            GlobalScopeInfos.add(context, gs);

            ChromeBugWindowInfo.selectBrowser(context.browser);
            TabWatcher.dispatch("showContext", [context.browser, context]);
        }
        // 'true' for capturing, so all of the sub-window loads also trigger
        outerDOMWindow.addEventListener("DOMContentLoaded", bind(context.domWindowWatcher, context), true);

        context.destructContext = function(event)
        {
            if (event.target instanceof HTMLDocument)  // we are only interested in Content windows
                var domWindow = event.target.defaultView;
            else if (event.target instanceof XULElement || event.target instanceof XULDocument)
            {
            //FBTrace.sysout("context.destructContext event.currentTarget.location: "+event.currentTarget.location+"\n");
            //FBTrace.dumpProperties("context.destructContext for context.window: "+this.window.location+" event", event);

                FBTrace.sysout("context.destructContext for context.window: "+this.window.location+" event.target "+event.target+" tag:"+event.target.tagName+"\n");
                var document = event.target.ownerDocument;
                if (document)
                    var domWindow = document.defaultView;
                else
                {
                    FBTrace.dumpProperties("context.destructContext cannont find document for context.window: "+this.window.location, event.target);
                    return;   // var domWindow = event.target.ownerDocument.defaultView;
                }
            }

            if (domWindow)
            {
                if (domWindow instanceof nsIDOMWindow)
                {
                    var context = ChromeBugWindowInfo.getContextByDOMWindow(domWindow);
                    if (context)
                    {
                        FBTrace.sysout("Firebug.Chromebug.destructContext found context with id="+context.uid+" and domWindow.location.href="+domWindow.location.href+"\n");
                        if (context.globalScope instanceof ContainedDocument && context.globalScope.getDocumentType() == "Content")
                        {
                            GlobalScopeInfos.remove(context.globalScope);
                            remove(ChromeBugWindowInfo.contexts, context);
                            TabWatcher.dispatch("destroyContext", [context]);
                        }
                        return;
                    }
                    FBTrace.dumpProperties("ChromeBug destructContext found no context for event.currentTarget.location"+event.currentTarget.location, domWindow);
                    return;
                }
                FBTrace.dumpProperties("ChromeBug destructContext domWindow not nsIDOMWindow event.currentTarget.location"+event.currentTarget.location, domWindow);
            }
            FBTrace.dumpProperties("ChromeBug destructContext found no DOMWindow for event.target", event.target);
        }
        //outerDOMWindow.addEventListener("unload", bind(context.destructContext, context), true);

        outerDOMWindow.addEventListener("keypress", bind(this.keypressToBreakIntoWindow, this, context), true);
        
        if (xul_window.docShell instanceof nsIWebProgress)
        {
            var progressListener = new ChromeBugProgressListener(xul_window, this);
            xul_window.docShell.addProgressListener(progressListener, Components.interfaces.nsIWebProgress.NOTIFY_ALL );
        }
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBugWindowInfo.addXULWindow complete length="+this.xulWindows.length, " index="+this.getXULWindowIndex(xul_window));

        return newTag;
    },

    keypressToBreakIntoWindow: function(event, context)
    {  
    	if (event.charCode == 126) // twiddle '~'
    	{  FBTrace.sysout("keypressToBreakIntoWindow  "+context.window.location, event);
    		if (isControlShift(event))
    		{ 
    			if (FBTrace.DBG_CHROMEBUG)
    				FBTrace.sysout("keypressToBreakIntoWindow isControlShift "+context.window.location, event);
    			cancelEvent(event);
    			Firebug.Debugger.breakOnNext(context);
    			/*
    			var halter = context.window.document.getElementById("chromebugHalter");
    			if (halter)
    				halter.parentNode.removeChild(halter);
    			var haltingScript = "window.dump(\"halting in \"+window.location);\ndebugger;\n";
    			halter = addScript(context.window.document, "chromebugHalter", haltingScript);
    			if (FBTrace.DBG_CHROMEBUG)
    				FBTrace.sysout("keypressToBreakIntoWindow haltingScript "+haltingScript, halter);
    			
    			*/ 
    		}
    	}
    },
    
    onCloseWindow: function(xul_win)
    {
        try
        {
            if (xul_win instanceof nsIXULWindow)
            {
                var mark = this.getXULWindowIndex(xul_win);
                if (mark == -1)   // A window closed but we don't know which one.
                {
                    // https://bugzilla.mozilla.org/show_bug.cgi?id=325636
                    var SIP=Components.Constructor("@mozilla.org/supports-interface-pointer;1",
                        Components.interfaces.nsISupportsInterfacePointer);
                    for (var i = 0; i < this.xulWindows.length; i++)
                    {
                        var ptr = new SIP;
                        ptr.data = xul_win;
                        if (ptr.data == this.xulWindows[i])
                        {
                            mark = i;
                            if (FBTrace.DBG_CHROMEBUG)
                                FBTrace.sysout("Chromebugpanel.onclose: timeless nsISupportsInterfacePointer found mark="+mark+"\n");
                            break;
                        }
                    }
                }
                if (mark != -1)
                {
                    if (FBTrace.DBG_CHROMEBUG)
                        FBTrace.sysout("Chromebugpanel.onclose: removing getXULWindowIndex="+mark+"\n");
                    var tag = this.xulWindowTags[mark];
                    this.xulWindows.splice(mark,1);
                    this.xulWindowTags.splice(mark,1);

                    var current_document = $('cbGlobalScopeList').location;

                    if (current_document && (current_document instanceof ContainedDocument) && current_document.getContainingXULWindow() == xul_win)
                        $('cbGlobalScopeList').location = Firebug.Chromebug.GlobalScopeList.getDefaultLocation();

                    //this.destroyContexts(xul_win);
                }
                else
                    FBTrace.sysout("Chromebugpanel.onclose: timeless nsISupportsInterfacePointer FAILED??\n");
             }
             else
                 FBTrace.sysout("Chromebugpanel.onclose: not a nsIXULWindow");
        }
        catch(e)
        {
            FBTrace.dumpProperties("ChromeBugPanel.onClose fails ", e);
        }
    },

    onWindowTitleChange: function(xul_win , newTitle)
    {
        if (FBTrace.DBG_CHROMEBUG)
        {
            try
            {
                var tag = this.getXULWindowTag(xul_win);
                FBTrace.sysout("Chromebugpanel.onWindowTitleChange tag:"+tag+" to \'"+newTitle+"\'\n");
                
                var outerDOMWindow = this.getDOMWindowByDocShell(xul_win.docShell);

                if (outerDOMWindow.location.href == "chrome://fb4cb/content/traceConsole.xul")
                {
                    window.dump("onWindowTitleChange ignoring outerDOMWindow.location.href "+outerDOMWindow.location.href+"\n");
                    this.onCloseWindow(xul_win);  // don't track our own tracing console.
                }
                
            }
            catch (exc) {window.dump("ChromeBugPanel.onWindowTitleChange:"+exc+"\n");}   // sometimes FBTrace is not defined?
        }
        return;
    },

    reloadWindow: function(xul_window)
    {
        var outerDOMWindow = ChromeBugWindowInfo.getDOMWindowByDocShell(xul_window.docShell);
        if (outerDOMWindow && outerDOMWindow instanceof nsIDOMWindow)
        {
            try
            {
                var storedState = sessionStore.getWindowState(outerDOMWindow);
                var ss = sessionStore;
                // save until the window is ready for state
                this.stateReloader = function(event)
                {
                    var windowToBeRestored = event.currentTarget;
                    windowToBeRestored.dump("setWindowState for "+windowToBeRestored.location+" to "+storedState+"\n");
                    windowToBeRestored.removeEventListener("DOMContentLoaded", ChromeBugWindowInfo.stateReloader, "true");
                    sessionStore.setWindowState(windowToBeRestored, storedState, true);
                    delete ChromeBugWindowInfo.stateReloader;
                }
            }
            catch (exc)
            {
                var ssEnabled = prefs.getBoolPref("browser.sessionstore.enabled");
                FBTrace.dumpProperties("Firebug.Chromebug.reloadWindow FAILS with browser.sessionstore.enabled= "+ssEnabled, exc);
            }

            FBTrace.sysout("ChromeBug reloadWindow closing outerDOMWindow\n");
            outerDOMWindow.close();
            FBTrace.sysout("ChromeBug reloadWindow opening new window\n");
            var ff = window.open();
            return ff;
        }
        else
            FBTrace.sysout("ChromeBugPanel.reload, no domWindow for xul_window_tag:"+xul_window_tag+"\n");
        return false;
    },

    //*************************************
    // Browsers in ChromeBug hold our context info

    createBrowser: function(domWindow)
    {
        var browser = document.createElement("browser");  // in chromebug.xul
        // Ok, this looks dubious. Firebug has a context for every browser (tab), we have a tabbrowser but don;t use the browser really.
        browser.persistedState = null;
        browser.chrome =  FirebugChrome;
        browser.showFirebug = true;
        browser.detached = true;
        browser.webProgress =
            {
                isLoadingDocument: false // we are already in Firefox so we must not be loading...
            };
        browser.addProgressListener = function() {}
        browser.contentWindow = { location: {href: "chromebug:fake"} };
        browser.currentURI = domWindow.location;

        browser.tag = this.fakeTabBrowser.browsers.length;
        this.fakeTabBrowser.browsers[browser.tag] = browser;
        this.fakeTabBrowser.selectedBrowser = this.fakeTabBrowser.browsers[browser.tag];
        return browser;
    },

    selectBrowser: function(browser)
    {
        this.fakeTabBrowser.selectedBrowser = browser;
    },


};
// ************************************************************************************************

function ChromeBugProgressListener(xul_window, xul_watcher)
{
    this.xul_window = xul_window;
    this.xul_watcher = xul_watcher;
    this.outerDOMWindow = this.xul_watcher.getDOMWindowByDocShell(this.xul_window.docShell);
    this.FBTrace = FBTrace;
    this.ChromeBug = Firebug.ChromeBug;
}

ChromeBugProgressListener.prototype =
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
            return request.name;
        }
        catch (exc)
        {
            return null;
        }
    },
    traceWindow: function(webProgress, request)
    {
        var name = this.safeName(request);
        var progress = "\"" + webProgress.DOMWindow.document.title +"\" ("+ webProgress.DOMWindow.location.href+") -> ";
        return progress + "\""+this.outerDOMWindow.document.title+"\" ("+this.outerDOMWindow.location.href+") "+(name?name:"no-name")+" ";
    },
    stateIsRequest: false,
    onLocationChange: function(webProgress, request, uri)
    {
        if (FBTrace.DBG_WINDOWS)
            FBTrace.sysout("ChromeBugProgressListener.onLocationChange "+this.traceWindow(webProgress, request)+" to uri=\'"                                        /*@explore*/
                                          +(uri?uri.spec:"null location")+"\'\n");                                     /*@explore*/
    },
    onStateChange : function(webProgress, request, flags, status)
    {
        if (FBTrace.DBG_WINDOWS)
            FBTrace.sysout("ChromeBugProgressListener.onStateChange: "+this.traceWindow(webProgress, request)+" "+getStateDescription(flags)+"\n");
    },

    onProgressChange : function(webProgress, request, curSelfProgress, maxSelfProgress, curTotalProgress, maxTotalProgress)
    {
        if (FBTrace.DBG_WINDOWS)
            FBTrace.sysout("ChromeBugProgressListener.onProgressChange: "+this.traceWindow(webProgress, request)+" current: "+
                curSelfProgress+"/"+maxSelfProgress+" total: "+curTotalProgress+"/"+maxTotalProgress+"\n");
    },
    onStatusChange : function(webProgress, request, flags, status)
    {
        if (FBTrace.DBG_WINDOWS)
            FBTrace.sysout("ChromeBugProgressListener.onStatusChange: "+this.traceWindow(webProgress, request)+" "+getStateDescription(flags)+"\n");
    },
    onSecurityChange : function(webProgress, request, flags)
    {
        if (FBTrace.DBG_WINDOWS)
            FBTrace.sysout("ChromeBugProgressListener.onSecurityChange: "+this.traceWindow(webProgress, request)+" "+getStateDescription(flags)+"\n");
    },
    onLinkIconAvailable : function(aBrowser)
    {
        FBTrace.dumpProperties("ChromeBugProgressListener.onLinkIconAvailable: "+this.traceWindow(webProgress, request), aBrowser);
    },
};
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // nsIObserver

var ChromeBugGlobalObserver = {
    observe: function(subject, topic, data)
    {
        if (topic == 'domwindowopened')
        {
            try
            {
                if (subject instanceof nsIDOMWindow)
                {
                    if (FBTrace.DBG_CHROMEBUG || FBTrace.DBG_WINDOWS) FBTrace.sysout("ChromeBugGlobalObserver found domwindowopened "+subject.location+"\n");

                    var context = ChromeBugWindowInfo.getContextByDOMWindow(subject);
                    if (context)
                        Firebug.Chromebug.dumpStackToConsole(context, "Opener for "+subject.location);
                    else
                        FBTrace.sysout("No context for DOM Window ", subject);
                }
            }
            catch(exc)
            {
                FBTrace.dumpProperties("ChromeBugGlobalObserver notify console opener FAILED ", exc);
            }
        }
        else if (topic == 'domwindowclosed')
        {
            if (subject instanceof nsIDOMWindow)
            {

                if (FBTrace.DBG_CHROMEBUG || FBTrace.DBG_WINDOWS) FBTrace.sysout("ChromeBugGlobalObserver found domwindowclosed "+subject.location+"\n");
 // Apparently this event comes before the unload event on the DOMWindow
 /*
                var context = ChromeBugWindowInfo.getContextByDOMWindow(subject);
                if (context)
                {
                    remove(ChromeBugWindowInfo.contexts, context);
                    TabWatcher.dispatch("destroyContext", [context]);
                    GlobalScopeInfos.destroy(context);
                }
*/
            }
        }
    },

};



// ************************************************************************************************
Firebug.Chromebug = extend(Firebug.Module,
{
    xulWindowInfo: ChromeBugWindowInfo,
    globalScopeInfos: GlobalScopeInfos,

    onOptionsShowing: function(menu)
    {
        FBTrace.sysout("Firebug.Chromebug.onOptionsShowing\n");
    },

    getProfileURL: function()
    {
         var file = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
        var profileURL = FBL.getURLFromLocalFile(file);
        return profileURL;
    },

    debug: FBTrace.DBG_CHROMEBUG,

    initialize: function()
    {
        this.uid = FBL.getUniqueId();
        if (FBTrace.DBG_CHROMEBUG) FBTrace.dumpStack("Chromebug.initialize module "+this.uid+" window.location="+window.location+"\n");

        Firebug.disabledAlways = true; // The Chromebug will enable Firebug for specific windows

        ChromeBugWindowInfo.initialize();

        Firebug.Debugger.addListener(this);

        Firebug.showAllSourceFiles	= true;
        
        Firebug.TraceModule.addListener(this);
    },

    initializeUI: function(detachArgs)
    {
        var wantIntro = prefs.getBoolPref("extensions.chromebug.showIntroduction");
  
        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("Chromebug.initializeUI from prefs wantIntro: "+wantIntro+"\n");

        if (wantIntro)
            fbBox.setAttribute("collapsed", true);
        else
            Firebug.Chromebug.toggleIntroduction();

        this.prepareForCloseEvents();
        this.restoreDefaultPanel();
        this.initializeDebugger();
        this.restructureUI();
        
        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("Chromebug.initializeUI -------------------------- start creating contexts --------");
        ChromeBugWindowInfo.watchXULWindows(); // Start creating contexts
        
        this.openFirstWindow();
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
    	$('fbInspectButton').setAttribute('collapsed', true);
    },
    
    restoreDefaultPanel: function()
    {
        var defaultScriptPanelLocation = prefs.getCharPref("extensions.chromebug.defaultScriptPanelLocation");
        if (defaultScriptPanelLocation)
        {
        	var atChar = defaultScriptPanelLocation.indexOf('@');  		// eg 1212@http... atChar==4
        	var lineNo = defaultScriptPanelLocation.substr(0, atChar); 	// 1212 four characters
        	var location = defaultScriptPanelLocation.substr(atChar+1);	// http...
        	Firebug.Debugger.defaultSourceLink = new SourceLink(location, lineNo, "js");
        	if (FBTrace.DBG_INITIALIZE)
        		FBTrace.sysout("initializeUI found defaultScriptPanelLocation "+defaultScriptPanelLocation, Firebug.Debugger.defaultSourceLink);
        }
        else
        {
        	if (FBTrace.DBG_INITIALIZE)
        		FBTrace.sysout("initializeUI NO defaultScriptPanelLocation ");
        }
    },
    
    initializeDebugger: function()
    {
        fbs.DBG_FBS_FF_START = true;

        if (FBTrace.DBG_STACK || FBTrace.DBG_LINETABLE || FBTrace.DBG_SOURCEFILES)
            FBTrace.sysout("debugger.enable ******************************\n");

        Firebug.Debugger.isChromeDebugger = true;
        Firebug.Debugger.wrappedJSObject = Firebug.Debugger;
        var jsdStatus = fbs.registerDebugger(Firebug.Debugger);

    },
    
    openFirstWindow: function()
    {
        var ChromeBugCommandLineHandler = Components.classes['@mozilla.org/commandlinehandler/general-startup;1?type=chromebug'].
            getService(Components.interfaces.nsICommandLineHandler);
        var opener = ChromeBugCommandLineHandler.wrappedJSObject;
        if (opener)
        {
             if (!opener.useExistingWindows && opener.firefox)
             {
                 setTimeout( function()
                 {
                    if (opener.firefoxURL)
                    {
                        FBTrace.sysout("Firebug.Chromebug.setTimeout opening Firefox with url:"+opener.firefoxURL+"\n");
                        var ff = window.open(opener.firefoxURL);  //  Open Firefox after our thread is complete
                    }
                    else
                    {
                       FBTrace.sysout("Firebug.Chromebug.setTimeout opening Firefox with no url\n");
                       var ff = window.open("http://getfirebug.com","Firefox no URL" );
                       if (ff)
                             ff.home();
                    }
                 });
             }
             else // else we already have FF
                 FBTrace.sysout("Firebug.Chromebug.initializeUI opener says useExistingWindows;\n");

        }
        else
           FBTrace.sysout("Firebug.Chromebug.initializeUI NO ChromeBugOpener.getCommandLineHandler().wrappedJSObject;\n");
    },


    onUnloadTopWindow: function(event)
    {
        try
        {
            event.currentTarget.removeEventListener("close", this.onUnloadTopWindow, true);
            FirebugChrome.shutdown();
        }
        catch(exc)
        {
            FBTrace.dumpProperties("onUnloadTopWindow FAILS", exc);
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

        ChromeBugWindowInfo.shutdown();
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
            FBTrace.dumpProperties("chromebug.showPanel error", e);
        }
    },

    initContext: function(context)
    {
        if (FBTrace.DBG_CHROMEBUG)
        {
            if (!context)
                FBTrace.sysout( "Firebug.Chromebug.Module.initContext context: undefined\n");
            else if (!context.window)
                FBTrace.sysout("Firebug.Chromebug.Module.initContext context.window: undefined\n");
            else
            {
                try {
                    FBTrace.sysout("Firebug.Chromebug.Module.initContext context: "+context.window.location+" FirebugContext="+(FirebugContext?FirebugContext.window.location:"undefined")+"\n");
                } catch(exc) {
                    FBTrace.sysout("Firebug.Chromebug.Module.initContext "+exc+"\n");
                }
            }
        }
        
        context.sourceCache.store("XStringBundle", "ChromeBugPanel.initContext: I just don't know what this XStringBundle is!");
    },

    loadedContext: function(context)
    {
         if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("Firebug.Chromebug.Module.loadedContext context: "+context.window.location+"\n");
         

    },

    showContext: function(browser, context)
    {
        if (context)
        {
        	if (Firebug.Debugger.defaultSourceLink)
        	{
        		// restore from last run if possible
        		var sourceFile = context.sourceFileMap[Firebug.Debugger.defaultSourceLink.href];
        		if (FBTrace.DBG_INITIALIZE)
    				FBTrace.sysout("showContext attempt to recover defaultSourceLink got sourceFile"+ sourceFile, Firebug.Debugger.defaultSourceLink);
        		if (sourceFile)
        		{ 
        			var oneTimeDefaultSourceLink = Firebug.Debugger.defaultSourceLink;
        			delete Firebug.Debugger.defaultSourceLink;  // one time only
        			
        			context.setTimeout( function delayDefaultSourceLink()
        			{
        				context.chrome.select(oneTimeDefaultSourceLink);
        				if (FBTrace.DBG_INITIALIZE)
            				FBTrace.sysout("showContext recover defaultSourceLink", oneTimeDefaultSourceLink);
        			});	
        		}	
        	}
        	else
        	{
        		if (FBTrace.DBG_INITIALIZE)
        			FBTrace.sysout("showContext no defaultSourceLink");
        	}
        	
            Firebug.Chromebug.syncToolBarToContext(context);
            for( var i = 0; i < ChromeBugWindowInfo.contexts.length; i++)
            {
                if (context == ChromeBugWindowInfo.contexts[i])
                {
                    var sources = 0;
                    for (var s in context.sourceFileMap)
                        sources++;
                    this.setStatusText("context "+(i+1)+"/"+ChromeBugWindowInfo.contexts.length+"; "+sources+" sources");
                    return;
                }
            }

            this.setStatusText("context (unmatched)/"+ChromeBugWindowInfo.contexts.length);
            Firebug.Chromebug.contextAnalysis(context);
        }
        else
            this.setStatusText("context (unset)/"+ChromeBugWindowInfo.contexts.length);
    },

    reattachContext: function(browser, context) // externalBrowser and FirebugContext from chrome.js
    {
        // this is called after the chromebug window has opened.
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBugPanel. reattachContext for context:"+context.uid+" isChromeBug:"+context.isChromeBug+"\n");
    },

    destroyContext: function(context)
    {
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBugPanel.destroyContext ---------------------- for context:"+context.uid+" :"+context.window.location+"\n");
    },

    //*****************************************************************************
    // implements Firebug.DebuggerListener

    onJSDActivate: function(jsd)  // just before hooks are set in fbs
    {
        //if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBug onJSDActivate ", this.jsContexts?"already have jsContexts":"take the stored jsContexts");
        if (!this.jsContexts)
        {
            var appShellService = Components.classes["@mozilla.org/appshell/appShellService;1"].
                    getService(Components.interfaces.nsIAppShellService);
            hiddenWindow = appShellService.hiddenDOMWindow;

            if (hiddenWindow._chromebug)
            {
                // For now just clear the breakpoints, could try to put these into fbs .onX
                var bps = hiddenWindow._chromebug.breakpointedScripts;
                for (tag in bps)
                {
                   var script = bps[tag];
                   if (script.isValid)
                       script.clearBreakpoint(0);
                }
                delete 	hiddenWindow._chromebug.breakpointedScripts;

                this.scriptsByJSContextTag = hiddenWindow._chromebug.scriptsByJSContextTag;
                if (!this.scriptsByJSContextTag)
                    this.scriptsByJSContextTag = {};

                this.jsContexts = hiddenWindow._chromebug.jsContext;
                if (!this.jsContexts)
                    this.jsContexts = {};

                delete hiddenWindow._chromebug.scriptsByJSContextTag;
                delete hiddenWindow._chromebug.jsContext;
            }
            else
                FBTrace.sysout("ChromebugPanel.onJSDActivate: no _chromebug in hiddenWindow, maybe the command line handler is broken\n");

            Firebug.Chromebug.dumpContexts = Firebug.Chromebug.dumpContextsFromThis;

            var context = GlobalScopeInfos.addHiddenWindow(hiddenWindow);

            if (FBTrace.DBG_CHROMEBUG)
                this.diagnosePreexistingJSContexts(hiddenWindow);
        }
    },

    diagnosePreexistingJSContexts: function(hiddenWindow)
    {
       for(var jscontext in this.jsContexts)
        {
            if (jscontext.isValid)
            {
                var frameGlobal = jscontext.globalObject.getWrappedValue();
                var info = GlobalScopeInfos.getGlobalScopeInfoByGlobal(frameGlobal);
                if (info)
                {
                    var context = info.getContext();
                       var scripts = this.scriptsByJSContextTag[jscontext.tag];  // array of jsdIScripts
                       for (var i = 0; i < scripts.length; i++)
                       {
                           var script = scripts[i];
                           Firebug.Chromebug.createSourceFile(context, script);
                       }
                       FBTrace.sysout("onJSDActivate added "+script.length+" scripts to "+context.window.location);
                }
                else
                {
                    FBTrace.sysout("A pre-existing jsContext is not a known scope\n");
                    Firebug.Chromebug.dumpContext(jscontext);
                }
            }
        }

    },

    onStop: function(context, frame, type, rv)
    {
        // FirebugContext is not context. Maybe this does not happen in firebug because the user always starts
        // with an active tab with FirebugContext and cause the breakpoints to land in the default context.
    	if (FirebugContext != context)
    		TabWatcher.dispatch("showContext", [context.browser, context]);

        var stopName = getExecutionStopNameFromType(type);
        FBTrace.sysout("ChromeBugPanel.onStop type: "+stopName, "context.window.location:"+context.window.location + " context.stopped:"+context.stopped );
        try
        {
            var src = frame.script.isValid ? frame.script.functionSource : "<invalid script>";
        } catch (e) {
            var src = "<invalid script>";
        }

        FBTrace.sysout("ChromeBugPanel.onStop script.tag: "+frame.script.tag+" @"+frame.line+":"+frame.pc, "source:"+src);

        return -1;
    },

    onResume: function(context)
    {
    	var panel = context.getPanel("script", true);
    	if (panel && panel.location)
    	{
    		var location = "0@"+panel.location.href;
    		
    		if (panel.selectedSourceBox) // see firebug.js buildViewAround
    			var lineNo = panel.selectedSourceBox.firstViewableLine + panel.selectedSourceBox.halfViewableLines;  
    			
    		if (lineNo)
    			location = lineNo+"@"+panel.location.href;
    			
    		prefs.setCharPref("extensions.chromebug.defaultScriptPanelLocation", location);
    		prefService.savePrefFile(null);
    		
    		if (FBTrace.DBG_INITIALIZE)
    			FBTrace.sysout("ChromeBugPanel.onResume defaultScriptPanelLocation:"+ location);
    	}
    },

    onThrow: function(context, frame, rv)
    {
        return false; /* continue throw */
    },

    onError: function(context, frame, error)
    {
    },

    diagnoseCompareDocuments: function(context, frame)
    {
        var window = getFrameWindow(frame);
        if (frame.executionContext.globalObject)
        {
            var global = frame.executionContext.globalObject.getWrappedValue();
            var document = global.document;
            if (context && context.window)
            {
                if (document.location == context.window.location)
                    return "same location: " + document.location;
                else
                {
                    for(var i = 0; i < ChromeBugWindowInfo.contexts.length; i++)
                        FBTrace.sysout(i+" context has "+ChromeBugWindowInfo.contexts[i].window.location+"\n");
                    return "frame document differs from context: "+ document.location +" vs "+context.window.location;
                }
            }
            else
                return "no context window for frame global "+document.location;
        }
        return "no frame global, context: "+(context && context.window)?context.window.location:"none";
    },

    compareDocuments: function(context, frame)
    {
        if (frame.executionContext.globalObject)
        {
            var global = frame.executionContext.globalObject.getWrappedValue();
            var rootWindow = getRootWindow(global);
            if (rootWindow === context.window)
                return true;

            if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("ChromeBugPanel global rootWindow does not agree with context\n", rootWindow);
            var document = global.document;
            if (context && context.window && document)
            {
                if (document.location == context.window.location)
                    return true;
            }
        }
        return false;
    },

    registerJSContext: function(context, frame, url)
    {
        if (!frame.executionContext)
        {
            FBTrace.sysout("ChromeBug registerJSContexts frame.executionContext null\n");
            return; // new in FF3 no executionContext
        }
        if (!frame.executionContext.isValid)
        {
            FBTrace.sysout("ChromeBug registerJSContexts frame.executionContext.isValid false\n");
            return;
        }

        var tag = frame.executionContext.tag;

        //FBTrace.sysout("ChromeBug registerJSContexts frame.executionContext.tag:"+tag+"\n");

        if (!this.scriptsByJSContextTag)
            this.scriptsByJSContextTag = {};
        if (!this.jsContexts)
            this.jsContexts = {};
        
        if (!this.scriptsByJSContextTag[tag])
        {
            this.scriptsByJSContextTag[tag] = [];
            this.jsContexts[tag] = frame.executionContext;
        }
        this.scriptsByJSContextTag[tag].push(frame.script);

        if (this.compareDocuments(context, frame))
        {
            context.jsContextTag = tag;
        }
        else
        {
            FBTrace.sysout("ChromeBug registerJSContexts", "new context tag:"+tag);
        }
    },

    onEventScriptCreated: function(context, frame, url)
    {
        this.registerJSContext(context, frame, url);
    },

    onTopLevelScriptCreated: function(context, frame, url)
    {
        this.registerJSContext(context, frame, url);
    },

    onEvalScriptCreated: function(context, frame, url)
    {
        this.registerJSContext(context, frame, url);
    },

    onFunctionConstructor: function(context, frame, ctor_script, url)
    {
        FBTrace.sysout("ChromeBug onFunctionConstructor");
    },
    //******************************************************************************
    // traceModule listener
    
    onLoadConsole: function(win, rootNode)
    {
        if (rootNode)
        {
            rootNode.addEventListener("click", function anyClick(event) 
            {
                FBTrace.sysout("Chromebug click on traceConsole ", event);
                var isAStackFrame = hasClass(event.target, "stackFrameLink");
                if (isAStackFrame) 
                {
                    var line = event.target.getAttribute("lineNumber");
                    var filename = event.target.text;
                    var link = new SourceLink(filename, line, "js" );
                    FBTrace.sysout("Chromebug click on traceConsole isAStackFrame", {target: event.target, href: filename, lineNo:line, link:link});
                    FirebugContext.chrome.select(link);
                    
                    event.stopPropagation();
                }
               
            },true);
            FBTrace.sysout("Chromebug onLoadConsole set hook");
        }
    },
    //******************************************************************************

    syncToolBarToContext: function(context)
    {

        var globalScopeInfo = GlobalScopeInfos.getGlobalScopeInfoByContext(context);
        if (globalScopeInfo)
        {
            $('cbGlobalScopeList').location = globalScopeInfo;
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("Firebug.Chromebug.syncToolBarToContext set location bar to "+globalScopeInfo.getObjectLocation()+"\n");
        }
        if (context != FirebugContext)
        {
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("Firebug.Chromebug.syncToolBarToContext set FirebugContext to", context.window.location)
            FirebugContext = context;

            if (context.window.document)
            {
                var elt = context.window.document.documentElement;
                if (elt)
                {
                    if (FBTrace.DBG_CHROMEBUG)
                        FBTrace.sysout("Firebug.Chromebug.syncToolBarToContext context:"+FirebugContext.window.location.href, " elt:"+elt.tagName);
                    FirebugChrome.select(elt, "html", "dom", true); // nsIDOMDocument
                }
            }
            else
                FBTrace.sysout("Firebug.Chromebug.syncToolBarToContext no document in ", context.window.location);
        }
    },
    //*****************************************************************************
    syncScriptFiles: function(context)
    {
        // TODO Throttle
        Firebug.showAllSourceFiles	= true;
        this.createSourceFilesFromEnumerateScripts(context);  // TODO in the context
        if (FBTrace.DBG_CHROMEBUG) FBTrace.dumpProperties("ChromeBug, createSourceFilesFromEnumerateScripts", context.sourceFileMap);

        var sourceFiles = FBL.sourceFilesAsArray(context, true);
        if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("ChromeBug, sourceFiles: "+sourceFiles.length+" for context:"+context.window.location+"\n");

        // TODO Move to ExtensionList/ComponentList

        var classifiers = [
                    {regexp: FBL.reChrome, fieldName: "extension"},
                    {regexp: reComponents, fieldName: "component"},
                    ];
        this.classifySourceFiles(sourceFiles, classifiers);
        Firebug.Chromebug.extensions = [];
        Firebug.Chromebug.components = [];
        for (var i = 0; i < sourceFiles.length; i++)
        {
            var sourceFile = sourceFiles[i];
            if (sourceFile.extension)
            {
                var extension = sourceFile.extension;
                if (! (Firebug.Chromebug.extensions.hasOwnProperty(extension) )  )
                    Firebug.Chromebug.extensions[extension] = [];
                Firebug.Chromebug.extensions[extension].push(sourceFile);
            }
            if (sourceFile.component)
            {
                // This adjustment needs to be done for components
                sourceFile.lineNumberShift = +1;
                var component = sourceFile.component;
                if ( !Firebug.Chromebug.components.hasOwnProperty(component) )
                    Firebug.Chromebug.components[component] = [];
                Firebug.Chromebug.components[component].push(sourceFile);
            }

            if (!sourceFile.extension && !sourceFile.component && FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("syncScriptFiles not an extension or component:", sourceFile.href);
        }
        if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout(this.formatLists("Extensions:\n", Firebug.Chromebug.extensions));
        if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout(this.formatLists("Components:\n", Firebug.Chromebug.components));

        if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("ChromeBug on context.uid="+context.uid+"\n");
    },

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

    classifySourceFiles: function(sourceFiles, classifiers)
    {
        var extensions = {};
        for (var i = 0; i < sourceFiles.length; i++)
        {
            var sourceFile = sourceFiles[i];
            for (var j = 0; j < classifiers.length; j++)
            {
                var classifer = classifiers[j];
                var c = classifer.regexp.exec(sourceFile.href);
                if (c)
                {
                    var value = c[1];
                    sourceFile[classifer.fieldName] = value;
                }
            }
        }
        return extensions;
    },

    createSourceFilesFromEnumerateScripts: function(context) {
        FBL.jsd.enumerateScripts({enumerateScript: function(script)
        {
            Firebug.Chromebug.createSourceFile(context, script);
        }});
    },

    createSourceFile: function(context, script)
    {
            var url = normalizeURL(script.fileName);
            var sourceFile = context.sourceFileMap[url];
            if (!sourceFile)
            {
                sourceFile = new FBL.EnumeratedSourceFile(context, url);
                context.sourceFileMap[url] = sourceFile;
                if (FBTrace.DBG_SOURCEFILES)
                    FBTrace.sysout("Firebug.Chromebug.createSourceFilesFromEnumerateScripts script.fileName="+url+"\n");
            }
            sourceFile.innerScripts.push(script);
    },

    addComponentScripts: function(context)
    {
        Firebug.showAllSourceFiles  = true;
        FBL.jsd.enumerateScripts({enumerateScript: function(script)
        {
            var url = normalizeURL(script.fileName);
            var c = reComponents.exec(url);
            if (c)
            {
                var sourceFile = context.sourceFileMap[url];
                if (!sourceFile)
                {
                    sourceFile = new FBL.EnumeratedSourceFile(context, url);
                    context.sourceFileMap[url] = sourceFile;
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
        var current_location = $('cbGlobalScopeList').repObject;
        FBTrace.sysout("Firebug.Chromebug.reload current_location", current_location.getObjectLocation());
        if (current_location && current_location.getContainingXULWindow)
        {
            var xul_window = current_location.getContainingXULWindow();
            if (xul_window && xul_window instanceof nsIXULWindow)
            {
                var reloadedWindow = ChromeBugWindowInfo.reloadWindow(xul_window);
                if (reloadedWindow)
                    return;
            }
        }
        // else ask for a window
        $('cbGlobalScopeList').showPopup();
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
        var chromeURI = iosvc.newURI("chrome://explorer/content/explorer.xul", null, null);
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
            FBTrace.dumpProperties("Firebug.Chromebug.cleanUpXULExplorer no data for subject", subject);
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
            FBTrace.dumpProperties("CHromeBug.avoidStrict no data for subject", subject);
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
        var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
            getService(Components.interfaces.nsIProperties);
        FBTrace.dumpProperties("dumpDirectory begins\n", directoryService);
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
            if (FBTrace.DBG_STACK) FBTrace.sysout("ChromeBugPanel.dumpStackToConsole FAILS for "+title, " context:"+context.window.location);
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
        Firebug.Console.log(ChromeBugWindowInfo.contexts, FirebugContext);
        Firebug.Console.log(Firebug.Chromebug.jsContexts, FirebugContext);
        if (context)
            Firebug.Console.log(context, FirebugContext);
        else
            Firebug.Console.log(FirebugContext, FirebugContext);
        Firebug.Console.closeGroup(FirebugContext, true);
    }

});

//**************************************************************************

Firebug.Chromebug.GlobalScopeListLocator = function(xul_element)
{
    if (!this.GlobalScopeList)
    {
    	if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("GlobalScopeListLocator creating GlobalScopeList object for xul_element", xul_element);
        
        this.GlobalScopeList = {
            // An array of objects that answer to getObjectLocation.
            // Only shown if panel.location defined and supportsObject true
            // xul window source URLs
            getLocationList: function()  // list of GlobalScopeInfos
            {
                if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("GlobalScopeList getLocationList from infos", GlobalScopeInfos);
                return GlobalScopeInfos.getGlobalScopeInfos();
            },

            getDefaultLocation: function()
            {
                var locations = this.getLocationList();
                if (locations && locations.length > 0) return locations[0];
            },

            getObjectLocation: function(globalScope)
            {
                return globalScope.getObjectLocation();
            },

            getObjectDescription: function(globalScope)
            {
               return globalScope.getObjectDescription();
            },

            onSelectLocation: function(event)
            {
                var globalScope = event.currentTarget.repObject;
                if (globalScope)
                {
                    var context = globalScope.getContext();
                    if (!context)
                        FBTrace.dumpProperties("onSelectLocation globalScope", globalScope);
                    if (FBTrace.DBG_CHROMEBUG)
                    {
                        FBTrace.sysout("onSelectLocation globalScope:",globalScope.getObjectLocation());
                        FBTrace.sysout("Firebug.Chromebug.GlobalScopeList.onSelectLocation context:", context.window.location);
                        FBTrace.sysout("Firebug.Chromebug.GlobalScopeList.onSelectLocation FirebugContext:", FirebugContext.window.location);
                    }

                    ChromeBugWindowInfo.selectBrowser(context.browser);
                    TabWatcher.dispatch("showContext", [context.browser, context]);

                    event.currentTarget.location = globalScope;
               }
               else
                       FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
            }
        }
        xul_element.addEventListener("selectObject", this.GlobalScopeList.onSelectLocation, false);
    }
    return this.GlobalScopeList;
}

Firebug.Chromebug.WindowListLocator = function(xul_element)
{
    if (!this.WindowList)
    {
        this.WindowList = {
            elementBoundTo: xul_element,

            getLocationList: function()  // a list of tags
            {
                var xul_windows = ChromeBugWindowInfo.getXULWindowTags();
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.dumpProperties("WindowList getLocationList ", xul_windows);
                return xul_windows;
            },

            getDefaultLocation: function() // the default tag
            {
                var locations = this.getLocationList();
                if (locations && locations.length > 0) return locations[0];
            },

            getObjectLocation: function(xul_window_tag)  // a title for the tag
            {
                var xul_window = ChromeBugWindowInfo.getXULWindowByTag(xul_window_tag);
                var win = ChromeBugWindowInfo.getDOMWindowByDocShell(xul_window.docShell);
                var title = win.location.href+" ("+win.document.title+")";
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("WindowList  getObjectLocation arg="+xul_window+" title="+title+"\n");
                return title;
            },

            getObjectDescription: function(xul_window_tag) // path and name for the tag
            {
                var xulWindowInfo = ChromeBugWindowInfo;
                var xul_window = xulWindowInfo.getXULWindowByTag(xul_window_tag);

                var index = xulWindowInfo.getXULWindowIndex(xul_window) + 1;
                var win = ChromeBugWindowInfo.getDOMWindowByDocShell(xul_window.docShell);
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("WindowList  getObjectDescription tag="+xul_window_tag+" title="+win.document.title+"\n");
                if (win)
                    return {path: win.location.href, name: index+". "+win.document.title};
                else
                {
                    FBTrace.dumpProperties("Firebug.Chromebug.WindowList.getObjectDescription xul_window:",xul_window);
                    return {path: "xul_window", name: "no docShell"};
                }
            },

            onSelectLocation: function(event)
            {
                var xul_window_tag = event.currentTarget.repObject;
                if (xul_window_tag)
                {
                    var xul_window = ChromeBugWindowInfo.getXULWindowByTag(xul_window_tag);
                    var context = ChromeBugWindowInfo.getDOMWindowByDocShell(xul_window.docShell);
                    ChromeBugWindowInfo.selectBrowser(context.browser);
                    TabWatcher.dispatch("showContext", [context.browser, context]);

                    if (FBTrace.DBG_CHROMEBUG)
                        FBTrace.sysout("Firebug.Chromebug.WindowList.onSelectLocation context:", context.window.location.href);
                    event.currentTarget.location = xul_window_tag;
                }
                else
                    FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
            }
        }
        xul_element.addEventListener("selectObject", Firebug.Chromebug.WindowList.onSelectLocation, false);  // where is the remove?
    }
    return this.WindowList;
}

Firebug.Chromebug.InterfaceListLocator = function(xul_element)
{
    if (!this.InterfaceList)
    {
        this.InterfaceList = {
            elementBoundTo: xul_element,

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
                    FirebugChrome.select(Components.interfaces[ifaceName]);
                else
                    FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
                if (Components.interfaces[ifaceName] instanceof Components.interfaces.nsIJSIID)
                    FBTrace.dumpProperties("onSelectLocation "+ifaceName, Components.interfaces[ifaceName]);
            }
        }
        xul_element.addEventListener("selectObject", Firebug.Chromebug.InterfaceList.onSelectLocation, false);
    }
    return this.InterfaceList;
}

Firebug.Chromebug.ExtensionListLocator = function(xul_element)
{
    if (!this.ExtensionList)
    {
        this.ExtensionList = {
            elementBoundTo: xul_element,

            getLocationList: function()
            {
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("ExtensionListLocator getLocationLst FirebugContext",FirebugContext.window.location)
                if (FirebugContext)
                {
                    Firebug.Chromebug.syncScriptFiles(FirebugContext);
                    var list = [];
                    for (var e in Firebug.Chromebug.extensions)
                    {
                        var srcs = Firebug.Chromebug.extensions[e]
                        for (var i = 0; i < srcs.length; i++ )
                        {
                            list.push(srcs[i]);
                        }
                    }
                    return list;
                }
            },

            getDefaultLocation: function()
            {
                var locations = this.getLocationList();
                if (locations && locations.length > 0) return locations[0];
            },

            getObjectLocation: function(sourceFile)
            {
                return sourceFile.href;
            },

            getObjectDescription: function(sourceFile)
            {
                var c = FBL.reChrome.exec(sourceFile.href);
                if (c)
                {
                    var extension = c[1];
                    var split = FBL.splitURLTrue(sourceFile.href);
                    return {path: extension, name: split.name }
                }
                else
                    return FBL.splitURLTrue(sourceFile.href);
            },

            onSelectLocation: function(event)
            {
                var object = event.currentTarget.repObject;
                if (object)
                    FirebugChrome.select(object, "script", "watch", true);  // SourceFile
                else
                    FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
            }
        }
        xul_element.addEventListener("selectObject", Firebug.Chromebug.ExtensionList.onSelectLocation, false);
    }
    return this.ExtensionList;
}

Firebug.Chromebug.CategoryListLocator = function(xul_element)
{
    if (!this.CategoryList)
    {
        this.CategoryList = {
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
                    var d = Firebug.Chromebug.CategoryList.getObjectDescription(categorySlashEntry);
                    Firebug.Console.log(d);
                    var value = Firebug.Chromebug.CategoryList.catman.getCategoryEntry(d.path, d.name);
                    Firebug.Console.log(categorySlashEntry+": "+value); // category/entry
                }
                else
                    FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
            }
        }
        xul_element.addEventListener("selectObject", Firebug.Chromebug.CategoryList.onSelectLocation, false);
    }
    return this.CategoryList;
}

Firebug.Chromebug.OverlayListLocator = function(xul_element)
{
    if (!this.OverlayList)
    {
        Firebug.Chromebug.OverlayList = {
            elementBoundTo: xul_element,

            getLocationList: function()
            {
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("OverlayListLocator getLocationLst FirebugContext",FirebugContext.window.location)
                if (FirebugContext)
                {
                    // TODO use URI of current context
                    var uri = iosvc.newURI("chrome://browser/content/browser.xul", null, null);
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
                var c = FBL.reChrome.exec(overlay.href);
                if (c)
                {
                    var extension = c[1];
                    var split = FBL.splitURLTrue(overlay.href);
                    return {path: extension, name: split.name }
                }
                else
                    return FBL.splitURLTrue(overlay.href);
            },

            onSelectLocation: function(event)
            {
                var object = event.currentTarget.repObject;
                if (object)
                    FirebugChrome.select(object, "script", "watch", true);  // SourceFile
                else
                    FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
                FBTrace.dumpProperties("Firebug.Chromebug.OverlayList onSelectLocation object", object);
            }
        }
        xul_element.addEventListener("selectObject", Firebug.Chromebug.OverlayList.onSelectLocation, false);
    }
    return this.OverlayList;
}

function getURLDescription(url)
{
    var c = FBL.reChrome.exec(url);
    if (c)
    {
        var extension = c[1];
        var split = FBL.splitURLTrue(url);
        return {path: extension, name: split.name }
    }
    else
        return FBL.splitURLTrue(url);
}

Firebug.Chromebug.ComponentListLocator = function(xul_element)
{
    if (!this.ComponentList)
    {
        this.ComponentList = {
            elementBoundTo: xul_element,

            getLocationList: function()
            {
                Firebug.Chromebug.dumpContexts();
                if (FirebugContext)
                {
                    Firebug.Chromebug.syncScriptFiles(FirebugContext);

                    var list = [];
                    for (var e in Firebug.Chromebug.components)
                    {
                        var srcs = Firebug.Chromebug.components[e]
                        for (var i = 0; i < srcs.length; i++ )
                        {
                            list.push(srcs[i]);
                        }
                    }
                    return list;
                }
            },

            getDefaultLocation: function()
            {
                var locations = this.getLocationList();
                if (locations && locations.length > 0) return locations[0];
            },

           getObjectLocation: function(sourceFile)
            {
                return sourceFile.href;
            },

            getObjectDescription: function(sourceFile)
            {
                return getURLDescription(sourceFile.href);
            },

            onSelectLocation: function(event)
            {
                var object = event.currentTarget.repObject;
                if (object)
                     FirebugChrome.select(object, "script", null, true);  // SourceFile
                else
                    FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
            }
        }
        xul_element.addEventListener("selectObject", Firebug.Chromebug.ComponentList.onSelectLocation, false);
    }
    return this.ComponentList;
}

Firebug.Chromebug.JSContextListLocator = function(xul_element)
{
    if (!this.JSContextList)
    {
        this.JSContextList = {
            elementBoundTo: xul_element,

            getLocationList: function()
            {
                if (Firebug.Chromebug.jsContexts)
                {
                    var list = [];
                    for (var tag in Firebug.Chromebug.jsContexts)
                    {
                        list.push(Firebug.Chromebug.jsContexts[tag]);
                    }
                    return list;
                }
            },

            getDefaultLocation: function()
            {
                var locations = this.getLocationList();
                if (locations && locations.length > 0) return locations[0];
            },

           getObjectLocation: function(jscontext)
            {
                var global = jscontext.globalObject.getWrappedValue();
                if (global)
                {
                    var document = global.document;
                    if (document)
                         return document.location;
                    else
                        return "noDocument://"+jscontext.tag;
                }
                else
                    return "noGlobal://"+jscontext.tag;
            },

            getObjectDescription: function(jscontext)
            {
                return getURLDescription( this.getObjectLocation(jscontext) );
            },

            getContextByLocation: function(location)
            {
                for (var i = 0; i < ChromeBugWindowInfo.contexts.length; ++i)
                   {
                       var context = ChromeBugWindowInfo.contexts[i];
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
                    var global = jscontext.globalObject.getWrappedValue();
                    if (global)
                        var context = ChromeBugWindowInfo.getContextByDOMWindow(global)
                    if (context)
                    {
                        ChromeBugWindowInfo.selectBrowser(context.browser);
                        TabWatcher.dispatch("showContext", [context.browser, context]);
                        return;
                    }
                    FBTrace.sysout("Firebug.Chromebug.JSContextList onSelectLocation: FAILED to get context from jscontext\n");
                    var location = Firebug.Chromebug.JSContextList.getObjectLocation(jscontext);
                    var context = Firebug.Chromebug.JSContextList.getContextByLocation(location);
                    if (context)
                    {
                        var scripts = Firebug.Chromebug.scriptsByJSContextTag[jscontext.tag];
                        var missing = {};
                        for (var i = 0 ; i < scripts.length; i++)
                        {
                            var script = scripts[i];
                            var sourceFile = FBL.getSourceFileByScript(context, script);
                            if (!sourceFile)
                            {
                                var url = normalizeURL(script.fileName);
                                var sourceFileByName = context.sourceFileMap[url];
                                FBTrace.sysout("ChromeBugPanel, "+(script.isValid?"valid":"invalid")+" script from JSContext "+(sourceFileByName?"omitted from sourcefile:":"with no sourcefile:"), script.fileName);
                                if (!missing[url])
                                     missing[url] = [];
                                 missing[url].push(script);
                            }
                        }
                        var global = jscontext.globalObject.getWrappedValue();
                        Firebug.Chromebug.syncToolBarToContext(context);
                    }
                    else
                    {
                        FBTrace.sysout("ChromebugPanel JSContext onSelectLocation no context\n");
                        FirebugChrome.select(object, "script", null, true);  // jscontext
                    }
                }
                else
                    FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
            }
        }
        xul_element.addEventListener("selectObject", Firebug.Chromebug.JSContextList.onSelectLocation, false);
    }
    return this.JSContextList;
}




function getFrameWindow(frame)
{
   // if (debuggers.length < 1)  // too early, frame.eval will crash FF2
    //        return;
    try
    {
        var result = {};
        frame.eval("window", "", 1, result);
        var win = result.value.getWrappedValue();
        FBTrace.sysout("getFrameWindow eval window is ", win.location);
        return getRootWindow(win);
    }
    catch (exc)
    {
        if (FBTrace.DBG_ERRORS && FBTrace.DBG_WINDOWS)
            FBTrace.dumpProperties("ChromeBugPanel getFrameWindow fails: ", exc);  // FBS.DBG_WINDOWS
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



observerService.addObserver(ChromeBugGlobalObserver, "domwindowopened", false);
observerService.addObserver(ChromeBugGlobalObserver, "domwindowclosed", false);

function ChromeBugOnLoad(event)
{
    FBTrace.sysout("ChromeBugOnLoad "+event.originalTarget.documentURI+"\n");
}
function ChromeBugOnDOMContentLoaded(event)
{
    FBTrace.sysout("ChromeBugOnDOMContentLoaded "+event.originalTarget.documentURI+"\n");
}

function onUnloadDOMWindow(event)
{
    if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("onUnloadDOMWindow event.currentTarget.location:"+ event.currentTarget.location+"\n");
    var domWindow = event.currentTarget;

    if (domWindow)
        domWindow.removeEventListener("unload", onUnloadDOMWindow, false);

    var xulWindow = ChromeBugWindowInfo.getXULWindowByRootDOMWindow(domWindow);
    if (xulWindow)
    {
        if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("onUnloadDOMWindow ignoring for outerDOMWindow\n");
        return;
    }

    ChromeBugWindowInfo.destroyContextByDOMWindow(domWindow);
}

Firebug.registerModule(Firebug.Chromebug);
}});

