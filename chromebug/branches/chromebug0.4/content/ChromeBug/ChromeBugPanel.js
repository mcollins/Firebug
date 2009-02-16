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
const reComponents = /:\/(.*)\/components\//; // chrome:/ or file:/
const reExtensionInFileURL = /file:.*\/extensions\/([^\/]*)/;
const reResource = /resource:\/\/([^\/]*)\//;
const reModules = /:\/\/(.*)\/modules\//; // chrome:// or file://

const fbBox = $("fbContentBox");
const interfaceList = $("cbInterfaceList");
const inspectClearProfileBar = $("fbToolbar");
const appcontent = $("appcontent");
const cbContextList = $('cbContextList');
const cbPackageList = $('cbPackageList');
const versionURL = "chrome://chromebug/content/branch.properties";

const tabBrowser = $("content");
const statusText = $("cbStatusText");
this.namespaceName = "ChromeBug";

var docShellTypeNames = ["Chrome", "Content", "ContentWrapper", "ChromeWrapper"]; // see nsIDocShellTreeItem


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
        return this.context.window;  // pkg:
    },

    getGlobal: function()
    {
        return this.getDOMWindow();
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
            FBTrace.dumpProperties("FrameGlobalScopeInfo location.href fails, status:"+(this.context.window?this.context.window.status:"no window"), exc);
            FBTrace.dumpProperties("FrameGlobalScopeInfo global", this.global);
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
        context.globalScope = gs;  // pkg: this creates a one:one

        if(!FirebugContext)
                FirebugContext = context;  // pkg: currently focused context

        Firebug.Chromebug.PackageList.assignContextToPackage(context);

        //Firebug.dispatch("loadedContext", [context]);
        if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("GlobalScopeInfos add "+ gs.kindOfInfo+" for context "+context.uid+", "+context.getName() );
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

                        var context = Firebug.Chromebug.getContextByGlobal(domWindow);
                        if (context)
                        {
                            GlobalScopeInfos.remove(context.globalScope);
                        }
                        else
                        {
                            if (parentDOMWindow != domWindow)
                                context = Firebug.Chromebug.getOrCreateContext(domWindow, Firebug.Chromebug.getContextByGlobal(parentDOMWindow));
                            else
                                context = Firebug.Chromebug.getOrCreateContext(domWindow);
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
        if (gs && FBTrace.DBG_CHROMEBUG) FBTrace.sysout("GlobalScopeInfos remove ", gs.kindOfInfo+ " "+gs.context.uid+", "+gs.context.getName());
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
            context = Firebug.Chromebug.getOrCreateContext(domWindow, Firebug.Chromebug.getContextByGlobal(parentDOMWindow));
        else
            context = Firebug.Chromebug.getOrCreateContext(domWindow);

        return context;
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

        this.eachDocShell(docShell, true, bind(this.destroyByDocShell, this));
        this.eachDocShell(docShell, false, bind(this.destroyByDocShell, this));
    },

    destroyByDocShell: function(childDocShell)
    {
        var domWindow = ChromeBugWindowInfo.getDOMWindowByDocShell(childDocShell);
        this.destroyContextByDOMWindow(domWindow);
    },

    destroyContextByDOMWindow: function(domWindow)
    {
        var context = Firebug.Chromebug.getContextByGlobal(domWindow);
        if (context)
        {
            FBTrace.sysout("TODO Firebug.Chromebug.deleteContext(context);");
        }
        else
        {
            FBTrace.sysout("destroyContextByDOMWindow did not find context for domWindow:"+ domWindow.location+"\n");
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
            document.title = "Chromebug "+this.fullVersion;
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

    addJSContext: function(jsClassName, global, jsContext)  // global is not a window
    {
        var context = Firebug.Chromebug.getOrCreateContext(global, jsClassName, jsContext);

        var gs = new JSContextScopeInfo(jsClassName, global, context, jsContext);
        Firebug.Chromebug.globalScopeInfos.add(context, gs);
        return context;
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

        var context = Firebug.Chromebug.getOrCreateContext(outerDOMWindow);  // addXULWindow
        var gs = new ChromeRootGlobalScopeInfo(xul_window, context);
        GlobalScopeInfos.add(context, gs);

        if (ChromeBugWindowInfo.stateReloader)  // TODO this should be per xul_window
            outerDOMWindow.addEventListener("DOMContentLoaded", ChromeBugWindowInfo.stateReloader, true);

        context.domWindowWatcher = function(event)
        {
            // We've just loaded all of the content for an nsiDOMWindow. We need to create a context for it.
            var outerDOMWindow = event.currentTarget; //Reference to the currently registered target for the event.
            var domWindow = event.target.defaultView;

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

            var context = Firebug.Chromebug.getContextByGlobal(domWindow, true);
            if (context)
            {
                // then we had one, say from a Frame
                 if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("ChromeBugPanel.domWindowWatcher found context with id="+context.uid+" and outerDOMWindow.location.href="+outerDOMWindow.location.href+"\n");
                GlobalScopeInfos.remove(context.globalScope);
            }
            else
            {
                var context = Firebug.Chromebug.getOrCreateContext(domWindow); // subwindow
                if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("ChromeBugPanel.domWindowWatcher created context with id="+context.uid+" and outerDOMWindow.location.href="+outerDOMWindow.location.href+"\n");
            }
            var gs = new ContainedDocument(xul_window, context);
            GlobalScopeInfos.add(context, gs);
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
                    var context = Firebug.Chromebug.getContextByGlobal(domWindow);
                    if (context)
                    {
                        FBTrace.sysout("Firebug.Chromebug.destructContext found context with id="+context.uid+" and domWindow.location.href="+domWindow.location.href+"\n");
                        if (context.globalScope instanceof ContainedDocument && context.globalScope.getDocumentType() == "Content")
                        {
                            GlobalScopeInfos.remove(context.globalScope);
                            remove(Firebug.Chromebug.contexts, context);
                            //Firebug.dispatch("destroyContext", [context]);
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
        {  FBTrace.sysout("keypressToBreakIntoWindow  "+context.getName(), event);
            if (isControlShift(event))
            {
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("keypressToBreakIntoWindow isControlShift "+context.getName(), event);
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

                    this.destroyContexts(xul_win);
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
                if (!this.seesionStore)
                {
                    this.sessionStore = Components.classes["@mozilla.org/browser/sessionstore;1"].
                        getService(Components.interfaces.nsISessionStore);
                }
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
        browser.contentWindow = domWindow;
        browser.tag = this.fakeTabBrowser.browsers.length;

        if (domWindow && 'location' in domWindow)
            browser.currentURI = domWindow.location;
        else
            browser.currentURI = "chrome://chromebug/fakeTabBrowser"+browser.tag;

        this.fakeTabBrowser.browsers[browser.tag] = browser;
        this.fakeTabBrowser.selectedBrowser = this.fakeTabBrowser.browsers[browser.tag];
        FBTrace.sysout("createBrowser "+browser.tag+" for "+browser.currentURI);
        return browser;
    },

    selectBrowser: function(browser)
    {
        this.fakeTabBrowser.selectedBrowser = browser;
    },

    getBrowserByWindow: function(win)
    {

    },
};
// ************************************************************************************************

function ChromeBugProgressListener(xul_window, xul_watcher)
{
    this.xul_window = xul_window;
    this.xul_watcher = xul_watcher;
    this.outerDOMWindow = this.xul_watcher.getDOMWindowByDocShell(this.xul_window.docShell);
    this.FBTrace = FBTrace;
    this.Chromebug = Firebug.Chromebug;
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
                    // This event comes before TabWathcer is initiatilized if the Error Console is created
                    // by -jsconsole command line argument.
                    // Since we are not ready to create contexts, we will need to store info for later.
                    // ...if we really need it.
                    //var context = Firebug.Chromebug.getContextByGlobal(subject);
                    //if (context)
                    //    Firebug.Chromebug.dumpStackToConsole(context, "Opener for "+subject.location);
                    //else
                    //    FBTrace.sysout("No context for DOM Window ", subject.location);
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

            }
        }
    },

};

// ************************************************************************************************
Firebug.Chromebug = extend(Firebug.Module,
{
    dispatchName: "chromebug",
    xulWindowInfo: ChromeBugWindowInfo,
    globalScopeInfos: GlobalScopeInfos,

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
        var dir = Components.classes["@mozilla.org/file/directory_service;1"]
                                     .getService(Components.interfaces.nsIProperties)
                                     .get(string, Components.interfaces.nsIFile);
        var URL = FBL.getURLFromLocalFile(dir);
        return URL;
    },

    debug: FBTrace.DBG_CHROMEBUG,

    initialize: function()
    {
        this.uid = FBL.getUniqueId();

        if (!this.contexts)
            this.contexts = TabWatcher.contexts;

        Firebug.disabledAlways = true; // The Chromebug will enable Firebug for specific windows

        ChromeBugWindowInfo.initialize();

        Firebug.Debugger.addListener(this);

        Firebug.Chromebug.PackageList.addListener(Firebug.Chromebug.AllFilesList);  // how changes to the package filter are sensed by AllFilesList

        Firebug.TraceModule.addListener(this);

        if (FBTrace.DBG_CHROMEBUG) FBTrace.dumpStack("Chromebug.initialize module "+this.uid+" Firebug.Debugger:"+Firebug.Debugger.fbListeners.length+" window.location="+window.location+"\n");
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
        this.restructureUI();


        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("Chromebug.initializeUI -------------------------- start creating contexts --------");
        ChromeBugWindowInfo.watchXULWindows(); // Start creating contexts

        // cause onJSDActivate to be triggered.
        this.initializeDebugger();
        // from this point forward scripts should come via debugger interface

        // Wait to let the initial windows open, then return to users past settings
        this.retryRestoreID = setInterval( bind(Firebug.Chromebug.restoreState, this), 500);
        setTimeout( function stopTrying()
        {
            Firebug.Chromebug.stopRestoration();  // if the window is not up by now give up.
        }, 15000);
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
                if (pkg)
                    this.stopRestoration(); // we got it all done
                // else keep trying

                // show the restored context, after we let the init finish
                //setTimeout( function delayShowContext()
                //{
                //    Firebug.dispatch("showContext", [context.browser, context])
                //});
            }
            // else keep trying

        }
        else
        {
            //if (FBTrace.DBG_INITIALIZE)
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
            Firebug.Chromebug.ContextList.setCurrentLocation( context );
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
                Firebug.Chromebug.PackageList.setCurrentLocation(pkg.getContextDescription(context));
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

        var panel = context.chrome.getSelectedPanel();
        if (panel && panel.getSourceLink)
        {
            var sourceLink = panel.getSourceLink();
            if (sourceLink)
                var sourceLinkJSON = sourceLink.toJSON();
        }

        var pkgDescription = Firebug.Chromebug.PackageList.getCurrentLocation();

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
        if (this.retryRestoreID)
        {
            clearTimeout(this.retryRestoreID);
            delete this.retryRestoreID;
        }
    },

    initializeDebugger: function()
    {
        fbs.DBG_FBS_FF_START = true;

        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("registerDebugger start ******************************\n");

        // we are not going to count down the contexts, just leave it at one
        fbs.countContext(true); // connect to firebug-service

        Firebug.Debugger.isChromeDebugger = true;
        Firebug.Debugger.wrappedJSObject = Firebug.Debugger;
        Firebug.Debugger.addListener(this);
        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("registerDebugger complete ******************************\n");

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

    // ******************************************************************************
    createContext: function(global, jsClassName, jsContext)
    {
        var persistedState = null; // TODO
        // domWindow in fbug is browser.contentWindow type nsIDOMWindow.
        // docShell has a nsIDOMWindow interface

        var browser = ChromeBugWindowInfo.createBrowser(global);  // ??

        if (!FirebugChrome)
            FBTrace.dumpStack("FirebugChrome is null??");

        var context = TabWatcher.createContext(global);

        context.isChromeBug = true;
        context.loaded = true;
        context.detached = true;
        context.originalChrome = null;

        context.setName = function(name)
        {
            this.name = name +" ("+this.uid+")";
        }
        
        context.global = global;
        if (global instanceof nsIDOMWindow)
        {
        	context.window = global;
        }
        else
        {
        	if (jsContext)
        		var name = (jsClassName+" in "+(jsContext?jsContext.tag:0));
        	else if (jsClassName)
        		var name = jsClassName;
        	else if (global && toString in global)
        		var name = global.toString();
        	else 
        		var name ="noGlobal"
        	context.setName(name);  // need URI
        }
        
        context.global = global; // maybe equal to domWindow
        context.getGlobalScope = function()
        {
            return this.global;  // override Firebug's getGlobalScope; same iff global == domWindow
        };

        if (context.window)
            context.windows.push(context.window); // since we don't watchWindows in chromebug


        context.uid = this.contexts.length;

        var persistedState = FBL.getPersistedState(context, "script");
        if (!persistedState.enabled)  // for now default all chromebug window to enabled.
            persistedState.enabled = "enable";

        FBTrace.sysout("Chromebug.createContext: "+(context.global?" ":"NULL global ")+context.getName());
        
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

    syncContextsToJSContexts: function()
    {
        var jsContexts = cloneArray(Firebug.Chromebug.JSContextList.getLocationList());
        for (var i = 0; i < jsContexts.length; i++)
        {
            var jsContext = jsContexts[i];
            
            var context = Firebug.Chromebug.getOrCreateContext(jsContext);
            if (context)
                context.jsContextTag = jsContext.tag;
            else
            {
                FBTrace.sysout("syncContextsToJSContexts skipping jsContext: "+jsContext.tag);
            }
        }

        this.eachContext(function reportMissing(context)
        {
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("context "+context.getName()+" has jsContext "+context.jsContextTag);
            if (!context.jsContextTag)
                FBTrace.sysout("context "+context.getName()+" not bound to a jsContext!");
        });
    },

    getOrCreateContext: function(global, jsClassName, jsContext)
    {
    	var context = Firebug.Chromebug.getContextByGlobal(global);
    	if (!context)
    		context = Firebug.Chromebug.createContext(global, jsClassName, jsContext);
    		
    	return context;
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
                if (context.global && context.global.window && context.global.window == global.window)
                    return context;
            }
        }
        else
        {
            for (var i = 0; i < this.contexts.length; ++i)
            {
                var context = this.contexts[i];
                if (context.global && (context.global == global)) // will that test work?
                    return context;
            }
        }

        return null;
    },

    initContext: function(context)
    {
        if (FBTrace.DBG_CHROMEBUG)
        {
                try {
                    FBTrace.sysout("Firebug.Chromebug.Module.initContext "+this.dispatchName+" context: "+context.getName()+" FirebugContext="+(FirebugContext?FirebugContext.getName():"undefined")+"\n");
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
            Firebug.Chromebug.syncToolBarToContext(context);
            for( var i = 0; i < this.contexts.length; i++)
            {
                if (context == this.contexts[i])
                {
                    var sources = 0;
                    for (var s in context.sourceFileMap)
                        sources++;
                    this.setStatusText("context "+(i+1)+"/"+this.contexts.length+"; "+sources+" sources");
                    return;
                }
            }

            this.setStatusText("context (unmatched)/"+this.contexts.length);
            Firebug.Chromebug.contextAnalysis(context);
        }
        else
            this.setStatusText("context (unset)/"+this.contexts.length);
    },

    reattachContext: function(browser, context) // externalBrowser and FirebugContext from chrome.js
    {
        // this is called after the chromebug window has opened.
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBugPanel. reattachContext for context:"+context.uid+" isChromeBug:"+context.isChromeBug+"\n");
    },

    destroyContext: function(context)
    {
        this.PackageList.deleteContext(context);
        GlobalScopeInfos.destroy(context);
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBugPanel.destroyContext ---------------------- for context:"+context.uid+" :"+context.getName()+"\n");
    },

    // ********************************************************
    // implements Firebug.DebuggerListener

    onJSDActivate: function(jsd)  // just before hooks are set in fbs
    {
        if (Firebug.Chromebug.activated)
            return;
        // When are called the window mediator has been examined and contexts for the currently open windows have been created.
        // We may or may not know how the jsContexts are mapped to the windows.
        // We don't know how the scripts created up to this point are connected to the jsContexts.
        //if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBug onJSDActivate "+(this.jsContexts?"already have jsContexts":"take the stored jsContexts"));
        try
        {
            //Firebug.Chromebug.syncContextsToJSContexts(); // Update our contexts based on current jsContexts

            var appShellService = this.getAppShellService();
            var hiddenWindow = appShellService.hiddenDOMWindow;
            //https://developer.mozilla.org/En/Working_with_windows_in_chrome_code TODO after FF2 is history, us Application.storage
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

                //hiddenWindow.dump('adding hiddenWindow\n');
                //var context = GlobalScopeInfos.addHiddenWindow(hiddenWindow);

                var globals = hiddenWindow._chromebug.globals; // []
                var globalTagByScriptTag = hiddenWindow._chromebug.globalTagByScriptTag; // globals index by script tag
                var xulScriptsByURL = hiddenWindow._chromebug.xulScriptsByURL;
                Firebug.Chromebug.buildInitialContextList(globals, globalTagByScriptTag, xulScriptsByURL);

                delete hiddenWindow._chromebug.globalTagByScriptTag;
                delete hiddenWindow._chromebug.jsContexts;
            }
            else
                FBTrace.sysout("ChromebugPanel.onJSDActivate: no _chromebug in hiddenWindow, maybe the command line handler is broken\n");

        }
        catch(exc)
        {
            FBTrace.sysout("onJSDActivate fails "+exc);
        }
        finally
        {
            Firebug.Chromebug.activated = true;
            FBTrace.sysout("onJSDActivate exit");
        }
    },

    avoidSelf: function(URI)
    {
        return (URI.indexOf("/chromebug/") != -1 || URI.indexOf("/fb4cb/") != -1);
    },

    buildInitialContextList: function(globals, globalTagByScriptTag, xulScriptsByURL)
    {
        this.unreachablesContext = Firebug.Chromebug.createContext();
        this.unreachablesContext.setName("chrome://unreachable/");

        this.buildEnumeratedSourceFiles(this.unreachablesContext, globals, globalTagByScriptTag, xulScriptsByURL);

        for (var url in xulScriptsByURL)
            Firebug.Chromebug.onXULScriptCreated(url, xulScriptsByURL);
    },

    buildEnumeratedSourceFiles: function(unreachablesContext, globals, globalTagByScriptTag, xulScriptsByURL)
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
                if (Firebug.Chromebug.avoidSelf(url))
                {
                    delete globalTagByScriptTag[script.tag];
                    return;
                }

                var globalsTag = globalTagByScriptTag[script.tag];
                if (!globalsTag)
                {
                    if (FBTrace.DBG_SOURCEFILES)
                        FBTrace.sysout("buildEnumeratedSourceFiles no jsContext (isChromebug?) "+script.tag+" in "+script.fileName);
                    return;  // chromebug file (we hope)
                }

                var global = globals[globalsTag];
                if (global)
                	var context = Firebug.Chromebug.getOrCreateContext(global);
                
                if (!context)
                    context = unreachablesContext;

                var sourceFile = context.sourceFileMap[url];

                if (!sourceFile)
                {
                    sourceFile = new FBL.EnumeratedSourceFile(url);
                    context.addSourceFile(sourceFile);
                }
                if (FBTrace.DBG_SOURCEFILES)
                    FBTrace.sysout("Using globalsTag "+globalsTag+ " assigned "+script.tag+"|"+url+" to "+ context.getName());
                sourceFile.innerScripts[script.tag] = script;
            }});
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
            Firebug.dispatch("showContext", [context.browser, context]);

        var stopName = getExecutionStopNameFromType(type);
        FBTrace.sysout("ChromeBugPanel.onStop type: "+stopName, "context.getName():"+context.getName() + " context.stopped:"+context.stopped );
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

            //prefs.setCharPref("extensions.chromebug.previousContext", location);
            //prefService.savePrefFile(null);

            if (FBTrace.DBG_INITIALIZE)
                FBTrace.sysout("ChromeBugPanel.onResume previousContext:"+ location);
        }
    },

    onThrow: function(context, frame, rv)
    {
        return false; /* continue throw */
    },

    onError: function(context, frame, error)
    {
    },


    onXULScriptCreated: function(url, innerScripts)
    {
        FBTrace.sysout("Chromebug onXULScriptCreated "+url);
        // find context by URL
        // create XULSourceFile with innerScripts
        // add sourceFile to context

    },

    onFunctionConstructor: function(context, frame, ctor_script, url)
    {
        FBTrace.sysout("ChromeBug onFunctionConstructor");
    },

    onSourceFileCreated: function(context, sourceFile)
    {
        var description = Firebug.Chromebug.parseURI(sourceFile.href);
        var pkg = Firebug.Chromebug.PackageList.getOrCreatePackage(description);
        pkg.appendContext(context);
        if (FBTrace.DBG_SOURCEFILES)
            FBTrace.sysout("onSourceFileCreated sourceFile "+sourceFile.href+" in  "+pkg.name);
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
                    var context = FirebugContext;
                    var info = getAncestorByClass(event.target, "messageInfoBody");
                    var message = info.repObject;
                    if (!message && info.wrappedJSObject)
                        message = info.wrappedJSObject.repObject;
                    if (message)
                    {
                        if (message.scope)
                        {
                            context = Firebug.Chromebug.getContextByGlobal(message.scope);
                            if (context)
                            {
                                Firebug.Chromebug.syncToolBarToContext(context);
                                FBTrace.sysout("onLoadConsole.eventListener found message.scope: "+message.scope.location+" context set to "+context.getName(), message);
                            }
                            else
                                FBTrace.sysout("onLoadConsole.eventListener no context", message.scope);
                        }
                        else
                            FBTrace.sysout("onLoadConsole.eventListener found message, no scope", message);
                    }
                    else
                        FBTrace.sysout("onLoadConsole.eventListener no message found on info", info);

                    var line = event.target.getAttribute("lineNumber");
                    var filename = event.target.text;
                    var link = new SourceLink(filename, line, "js" );
                    FBTrace.sysout("Chromebug click on traceConsole isAStackFrame SourceLink:"+(link instanceof SourceLink), {target: event.target, href: filename, lineNo:line, link:link});
                    context.chrome.select(link);

                    event.stopPropagation();
                }

            },true);
            FBTrace.sysout("Chromebug onLoadConsole set hook");
        }
    },
    //******************************************************************************

    syncToolBarToContext: function(context)
    {
        if (context)
        {
            Firebug.Chromebug.ContextList.setCurrentLocation( context );
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("Firebug.Chromebug.syncToolBarToContext set location bar to "+context.getName());
        }

        if (context != FirebugContext)
        {
            var panel = FirebugChrome.getSelectedPanel();

            FirebugContext = context;

            if (panel)
            {
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("Firebug.Chromebug.syncToolBarToContext set FirebugContext to "+context.getName()+" at "+panel.name);

                FirebugChrome.selectPanel(panel.name);
            }
        }
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
                sourceFile = new FBL.EnumeratedSourceFile(url);
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
                    sourceFile = new FBL.EnumeratedSourceFile(url);
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
        var current_location = Firebug.Chromebug.ContextList.getCurrentLocation();
        FBTrace.sysout("Firebug.Chromebug.reload current_location", Firebug.Chromebug.ContextList.getObjectLocation(current_location));
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
            FBTrace.dumpProperties("Firebug.Chromebug.cleanUpXULExplorer no data for subject", subject);
    },

    openXPCOMExplorer: function()
    {
        var w = window.screen.availWidth;
        var h = window.screen.availHeight;
        features = "outerWidth="+w+","+"outerHeight="+h;
        var params = "";
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
            this.xpcomExplorer = openWindow('xpcomExplorer',xpcomExplorerURL, features, params);
        }
        else
            throw new Error("Could not find "+xpcomExplorerURL);
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
    }

});


window.timeOut = function(title)
{
    var t = new Date();
    if (window.startTime)
        window.dump(title+": "+(t - window.startTime)+"\n");
    window.startTime = t;
}
//**************************************************************************
    Firebug.Chromebug.GlobalScopeList = {
        // An array of objects that answer to getObjectLocation.
        // Only shown if panel.location defined and supportsObject true
        // xul window source URLs
        getLocationList: function()  // list of GlobalScopeInfos
        {
            if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("GlobalScopeList getLocationList from infos ", GlobalScopeInfos);
            return GlobalScopeInfos.getGlobalScopeInfos();
        },

        getDefaultLocation: function()
        {
            var location = Firebug.Chromebug.ContextList.getCurrentLocation();
            if (!location)
                return null;
            var context = location.getPreferedContext();
            return getGlobalScopeInfoByContext(context);
        },

        getCurrentLocation: function()
        {
            return $('cbGlobalScopelist').location;
        },

        setCurrentLocation: function(globalScope)
        {
            // TODO type test, cache?
            $('cbGlobalScopelist').location = globalScope;
        },

        getObjectLocation: function(globalScope)
        {
            return globalScope.getObjectLocation();
        },

        getObjectDescription: function(globalScope)
        {
            if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("GlobalScopeList getObjectDescription", globalScope);
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
                    FBTrace.sysout("Firebug.Chromebug.GlobalScopeList.onSelectLocation context:", context.getName());
                    FBTrace.sysout("Firebug.Chromebug.GlobalScopeList.onSelectLocation FirebugContext:", Firebugcontext.getName());
                }

                ChromeBugWindowInfo.selectBrowser(context.browser);
                Firebug.dispatch("showContext", [context.browser, context]);

                event.currentTarget.location = globalScope;
           }
           else
           {
               FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
           }
        },
    }

Firebug.Chromebug.GlobalScopeListLocator = function(xul_element)
{
    var list = Firebug.Chromebug.GlobalScopeList;
    return connectedList(xul_element, list);
}

function connectedList(xul_element, list)
{
    if (!list.elementBoundTo)
    {
        list.elementBoundTo = xul_element;
        xul_element.addEventListener("selectObject", bind(list.onSelectLocation, list), false);
    }
    return list;
}

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
        //if (FBTrace.DBG_LOCATIONS)
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
        var pkgName = description.pkgName;
        var kind = description.kind;

        if (!this.pkgs.hasOwnProperty(pkgName))
            this.pkgs[pkgName] = new Firebug.Chromebug.Package(pkgName, kind);

        return this.pkgs[pkgName];
    },

    assignContextToPackage: function(context)  // a window context owned by a package
    {
        var url = context.getName();
        var description = Firebug.Chromebug.parseURI(url);
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
          FBTrace.sysout("PackageList.setCurrentLocation sent onSetLocation to "+this.fbListeners.length)
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
            if (!FirebugContext)
                FirebugContext = context;

            //if (FBTrace.DBG_LOCATIONS)
                FBTrace.sysout("Firebug.Chromebug.PackageList.onSelectLocation context:"+ context.getName()+" FirebugContext:"+FirebugContext.getName());

            ChromeBugWindowInfo.selectBrowser(context.browser);
            Firebug.dispatch("showContext", [context.browser, context]);

            Firebug.Chromebug.PackageList.setCurrentLocation(filteredContext);
       }
       else
       {
           FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
       }
    },

});

Firebug.Chromebug.PackageListLocator = function(xul_element)
{
    var list = Firebug.Chromebug.PackageList;
    return connectedList(xul_element, list);
}

//**************************************************************************

Firebug.Chromebug.ContextList = {

    getCurrentLocation: function() // a context in a package
    {
        return cbContextList.repObject;
    },

 setCurrentLocation: function(context) // call from Firebug.Chromebug.syncToolBarToContext(context);
 {
     cbContextList.location = context;
     setTimeout( function delaySave()
     {
         Firebug.Chromebug.saveState(context);
     }, 500);
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
     var locations = this.getLocationList();
     if (locations && locations.length > 0) return locations[0];
 },

 getObjectLocation: function(context)
 {
     return  context.getWindowLocation();
 },

 getObjectDescription: function(context)
 {
     var title = (context.window ? context.getTitle() : null);
     var d = Firebug.Chromebug.parseURI(context.getName());

       d =  {path: d?d.path:"parseURI fails", name: context.getName() +(title?"   "+title:""), label: context.getName() };
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
             FBTrace.sysout("Firebug.Chromebug.ContextList.onSelectLocation context:"+ context.getName()+" FirebugContext:"+FirebugContext.getName());

         ChromeBugWindowInfo.selectBrowser(context.browser);
         Firebug.showContext(context.browser, context);

         event.currentTarget.location = context;
     }
     else
     {
         FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
     }
 },
}

Firebug.Chromebug.ContextListLocator = function(xul_element)
{
    var list = Firebug.Chromebug.ContextList;
    return connectedList(xul_element, list);
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
                    Firebug.dispatch("showContext", [context.browser, context]);

                    if (FBTrace.DBG_CHROMEBUG)
                        FBTrace.sysout("Firebug.Chromebug.WindowList.onSelectLocation context:", context.getName());
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

        Firebug.Chromebug.InterfaceList = {

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
                    FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
                if (Components.interfaces[ifaceName] instanceof Components.interfaces.nsIJSIID)
                    FBTrace.dumpProperties("onSelectLocation "+ifaceName, Components.interfaces[ifaceName]);
            }
        }

Firebug.Chromebug.InterfaceListLocator = function(xul_element)
{
    return connectedList(xul_element, Firebug.Chromebug.InterfaceList);
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
        eachSourceFileDescription(function extractPackageNames(d)
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
            return sourceFileDescription.sourceFile.href;
        else
            return "no sourcefile:";
    },

    getObjectDescription: function(sourceFileDescription) // path: package name, name: remainder
    {
        if (sourceFileDescription)
        {
            var cn = sourceFileDescription.context.getName();
            var description =
            {
                name: cropString(sourceFileDescription.name+(cn?" < "+cn:""), 120),
                path: cropString(sourceFileDescription.path, 120),
                label: cropString(sourceFileDescription.name, 40),
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
        FBTrace.sysout("setCurrentLocation ", description)
        this.elementBoundTo.location = description;
        dispatch(this.fbListeners, "onSetLocation", [this, description]);
    },

    onSelectLocation: function(event)
    {
        var description = event.currentTarget.repObject;
        if (description)
            this.doSelect(description);
        else
            FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
    },

    doSelect: function(description)
    {
        var context = description.context;
        if (context)
        {
             var sourceFile= context.sourceFileMap[description.href];
            FBTrace.sysout("AllFilesList.onSelectLocation context "+context.getName()+" url:"+description.href, description);
            ChromeBugWindowInfo.selectBrowser(context.browser);
            Firebug.dispatch("showContext", [context.browser, context]);

            Firebug.Chromebug.syncToolBarToContext(context);
            FirebugChrome.select(sourceFile, "script", "watch", true);  // SourceFile
            this.setCurrentLocation(description);
        }
        else
            FBTrace.sysout("AllFilesList.onSelectLocation no context in description"+description, description);
    }

});

Firebug.Chromebug.parseURI = function(URI)
{
    if (!URI || Firebug.Chromebug.avoidSelf(URI))
        return null;

    var description = Firebug.Chromebug.ComponentList.parseURI(URI);
    if (!description)
        description = Firebug.Chromebug.ExtensionList.parseURI(URI);
    if (!description)
        description = Firebug.Chromebug.ModuleList.parseURI(URI);
    if (!description)
    {
        if (FBTrace.SOURCEFILES)
            FBTrace.sysout("Firebug.Chromebug.parseURI: no match for "+URI);
        description = {path:"mystery", name:URI, kind: "mystery", pkgName: "unparsable"};
    }

    return description;
}

Firebug.Chromebug.ExtensionList = extend( new SourceFileListBase(), {

    kind: "extension",

    appURLStem: Firebug.Chromebug.getPlatformStringURL("resource:app"),

    parseURI: function(URIString)
    {
        if (Firebug.Chromebug.avoidSelf(URIString))
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

Firebug.Chromebug.ExtensionListLocator = function(xul_element)
{
    return connectedList(xul_element, Firebug.Chromebug.ExtensionList);
}


Firebug.Chromebug.AllFilesList = extend(new SourceFileListBase(), {

    kind: "all",

    parseURI: Firebug.Chromebug.parseURI,


    // **************************************************************************
    // PackageList listener

    onSetLocation: function(packageList, current)
    {
        FBTrace.sysout("onSetLocation current: "+current.pkg.name);
        var noFilter = packageList.getDefaultPackageName();
        if (current.pkg.name == noFilter)
            Firebug.Chromebug.AllFilesList.setFilter(null)
        else
        {
            var targetName = current.pkg.name;
            Firebug.Chromebug.AllFilesList.setFilter( function byPackageName(description)
            {
                return (targetName == description.pkgName)
            });
        }
    },

});

Firebug.Chromebug.AllFilesListLocator = function(xul_element)
{
    if (FBTrace.DBG_LOCATIONS)
        FBTrace.sysout("AllFilesListLocator called");
    return connectedList(xul_element, Firebug.Chromebug.AllFilesList);
}


Firebug.Chromebug.CategoryListLocator = function(xul_element)
{
    if (!Firebug.Chromebug.CategoryList)
    {
        Firebug.Chromebug.CategoryList = {
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
    return Firebug.Chromebug.CategoryList;
}

Firebug.Chromebug.OverlayListLocator = function(xul_element)
{
    if (!Firebug.Chromebug.OverlayList)
    {
        Firebug.Chromebug.OverlayList = {
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
                return Firebug.Chromebug.parseURI(overlay.href);
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
                    var description = Firebug.Chromebug.parseURI(object.href);
                    if (description)
                    {
                        var pkg = Firebug.Chromebug.ContextList.getPackageByName(description.path);
                        var browser = Firebug.Chromebug.OverlayList.getBrowserForOverlay(object.href);
                        var context = pkg.createContextInPackage(win, browser);
                        object.context = context;
                    }
                }
                FirebugChrome.showContext(object.context);
                FirebugChrome.selectPanel("HTML");

                FBTrace.dumpProperties("Firebug.Chromebug.OverlayList onSelectLocation object", object);
            }
        }
        xul_element.addEventListener("selectObject", Firebug.Chromebug.OverlayList.onSelectLocation, false);
    }
    return Firebug.Chromebug.OverlayList;
}


Firebug.Chromebug.ComponentList = extend(new SourceFileListBase(), {
      kind: "component",

    parseURI: function(URIString)
    {
        if (Firebug.Chromebug.avoidSelf(URIString))
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
            FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
    }
});

Firebug.Chromebug.ComponentListLocator = function(xul_element)
{
    return connectedList(xul_element, Firebug.Chromebug.ComponentList);
}

Firebug.Chromebug.ModuleList = extend( new SourceFileListBase(), {
      kind: "module",

    parseURI: function(URIString)
    {
        if (Firebug.Chromebug.avoidSelf(URIString))
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

Firebug.Chromebug.ModuleListLocator = function(xul_element)
{
    return connectedList(xul_element, Firebug.Chromebug.ModuleList);
}

// A list of the jsContexts built by enumerating them dynamically.
Firebug.Chromebug.JSContextList = {

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
        var global = jscontext.globalObject?jscontext.globalObject.getWrappedValue():null;
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
        if (Firebug.Chromebug.avoidSelf(URI))
            var d = {path:"avoided chromebug", name: URI};
        if (!d)
            var d = Firebug.Chromebug.parseURI( URI );
        if (!d)
            d = {path:"unparsable", name: this.getObjectLocation(jscontext)};
        d.name = d.name +" ("+jscontext.tag+")";
        return d;
    },

    getContextByLocation: function(location)  // TODO MOVE to context list
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
            {
                var context = Firebug.Chromebug.getContextByGlobal(global)
                if (context)
                {
                    ChromeBugWindowInfo.selectBrowser(context.browser);
                    Firebug.dispatch("showContext", [context.browser, context]);
                }
                else
                {
                    FirebugChrome.select(global, "DOM", null, true);
                }
            }
            else
            {
                FBTrace.sysout("Firebug.Chromebug.JSContextList onSelectLocation: FAILED to no globalObject in jscontext\n");
                FirebugChrome.select(object, "script", null, true);  // jscontext
            }
        }
        else
        {
            FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
        }
    }
}
Firebug.Chromebug.JSContextListLocator = function(xul_element)
{
     return connectedList(xul_element, Firebug.Chromebug.JSContextList);
}

Firebug.Chromebug.PathListLocator = function(xul_element)
{
    var ds = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);

    if (!Firebug.Chromebug.PathList)
    {
        Firebug.Chromebug.PathList = {
            elementBoundTo: xul_element,
            directoryService: ds,
            strings: ['ProfD', 'DefProfRt', 'UChrm', 'DefRt', 'PrfDef', 'APlugns', 'AChrom','ComsD', 'Home', 'TmpD', 'ProfLD', 'resource:app', 'Desk', 'Progs', 'BMarks', 'DLoads', 'UStor'],

            getLocationList: function()
            {
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("PathListLocator getLocationLst FirebugContext",FirebugContext.getName())
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
                    FBTrace.dumpProperties("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
            }
        }
        xul_element.addEventListener("selectObject", Firebug.Chromebug.PathList.onSelectLocation, false);
    }
    return Firebug.Chromebug.PathList;
}
Firebug.Chromebug.dumpFileTrack = function()
{
    var appShellService = this.getAppShellService();
    var hiddenWindow = appShellService.hiddenDOMWindow;

    fbs.dumpFileTrack(hiddenWindow.getTrackFiles());
}
Firebug.Chromebug.unitTest = function()
{
    this.toggleIntroduction();
    $('content').setAttribute("src", "chrome://unit/content/start.html");
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

