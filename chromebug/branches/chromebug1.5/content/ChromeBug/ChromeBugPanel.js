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
const reWeb = /(^http:|^ftp:|^mailto:|^https:|^ftps:)\//;

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
        var index = Chromebug.XULWindowInfo.getXULWindowIndex(xul_window) + 1;
        var win = Chromebug.XULWindowInfo.getDOMWindowByDocShell(xul_window.docShell);
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
            this.docShell = Chromebug.XULWindowInfo.getDocShellByDOMWindow(this.getDOMWindow());
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
        return  Chromebug.XULWindowInfo.getDOMWindowByDocShell(this.xul_window.docShell);
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

    addDocumentAsScopes: function(xul_window, typeOfDocument)
    {
        var docShell = xul_window.docShell;
        if (!docShell)  // Too early??
            return;

        var parentDOMWindow = Chromebug.XULWindowInfo.getDOMWindowByDocShell(xul_window.docShell);  // its context also?

        Chromebug.XULWindowInfo.eachDocShell(docShell, (typeOfDocument=="Chrome"), function(childDocShell)
            {
                if (childDocShell.contentViewer)  // nsiDocShell.nsIContentViewer
                {
                    var childDoc = childDocShell.contentViewer.DOMDocument;
                    if (childDoc instanceof nsIDOMDocument)
                    {
                        var domWindow = Chromebug.XULWindowInfo.getDOMWindowByDocShell(childDocShell);

                        var context = Firebug.Chromebug.getContextByGlobal(domWindow);
                        if (context)
                        {
                            Chromebug.globalScopeInfos.remove(context.globalScope);
                        }
                        else
                        {
                            if (parentDOMWindow != domWindow)
                                context = Firebug.Chromebug.getOrCreateContext(domWindow, Firebug.Chromebug.getContextByGlobal(parentDOMWindow));
                            else
                                context = Firebug.Chromebug.getOrCreateContext(domWindow);
                        }

                        var gs = new Chromebug.ContainedDocument(xul_window, context);
                        Chromebug.globalScopeInfos.add(context, gs);
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
        if (gs && FBTrace.DBG_CHROMEBUG) FBTrace.sysout("globalScopeInfos remove "+ gs.kindOfInfo+ " "+gs.context.uid+", "+gs.context.getName());
    },

    destroy: function(context)
    {
        var gs = this.getGlobalScopeInfoByContext(context);
        this.remove(gs);
    }

}

//************************************************************************
//  XUL Windows

Chromebug.XULWindowInfo = {

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
                FBTrace.sysout("Chromebug getDocShellByDOMWindow, nsIWebNavigation notA nsIDowShellTreeItem");
        }
        else
        {
            FBTrace.sysout("Chromebug getDocShellByDOMWindow, window notA nsIInterfaceRequestor:", domWindow);
            FBTrace.sysout("getDocShellByDOMWindow domWindow.location:"+domWindow.location, " isA nsIDOMWindow: "+(domWindow instanceof nsIDOMWindow));
        }
    },

    destroyContextByDOMWindow: function(domWindow)
    {
        var context = Firebug.Chromebug.getContextByGlobal(domWindow);
        if (context)
        {
            if (FBTrace.DBG_WINDOWS)
                FBTrace.sysout("Firebug.Chromebug.deleteContextByDOMWindow for context "+context.getName()+" for domWindow "+domWindow.location);
            TabWatcher.unwatchContext(domWindow, context);
        }
        else
        {
            if (domWindow.closed)
                FBTrace.sysout("destroyContextByDOMWindow did not find context for closed window");
            else
            {
                try
                {
                    FBTrace.sysout("destroyContextByDOMWindow did not find context for domWindow:"+ domWindow.location+"\n");
                }
                catch(exc)
                {
                    if (FBTrace.DBG_ERRORS)
                        FBTrace.sysout("nsIDOMWindow.location fails "+exc);
                }
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
                    FBTrace.sysout("getXULWindowByRootDOMWindow no domWindow for xul_window #"+i, xul_window);
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
                FBTrace.sysout("Firebug.Chromebug.getDOMWindowByDocShell xul_win has no docShell");
        }
        catch (exc)
        {
            FBTrace.sysout("Firebug.Chromebug.getDOMWindowByDocShell FAILS", exc);
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
                FBTrace.sysout("ChromeBugPanels.eachDocShell FAILED", exc);
              }
        }
        return true;
    },

    iterateXULWindows: function(handler)
    {
        for(var i = 0; i < this.xulWindows.length; i++)
        {
            var xul_window = this.xulWindows[i];
            Chromebug.XULWindowInfo.eachDocShell
            (
                xul_window.docShell, true, function(childDocShell)
                {
                    if (childDocShell.contentViewer) // nsiDocShell.nsIContentViewer
                    {
                        var childDoc = childDocShell.contentViewer.DOMDocument;

                        if (childDoc instanceof nsIDOMDocument && childDoc.defaultView instanceof nsIDOMWindow)
                            //FBL.iterateWindows(childDoc.defaultView, handler);
                            handler(childDoc.defaultView);
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
            FBTrace.sysout("cb.Chromebug.XULWindowInfo.initialize");

        this.xulWindowTagSeed = FBL.getUniqueId();
        this.fakeTabBrowser = $("content");
        this.fakeTabBrowser.browsers = [];

        this.fullVersion = Firebug.loadVersion(versionURL);
        if (this.fullVersion)
            document.title = "Chromebug "+this.fullVersion;

     },

    watchXULWindows: function()
    {
        // get the existing windows first
        var enumerator = windowMediator.getXULWindowEnumerator(null);
        while(enumerator.hasMoreElements())
        {
            var xul_window = enumerator.getNext();
            if (xul_window instanceof nsIXULWindow)
                this.addXULWindow(xul_window);
        }
        try
        {
            // then watch for new ones
            windowMediator.addListener(this);  // removed in this.shutdown
        }
        catch(exc)
        {
            FBTrace.sysout("Chromebug.XULWindowInfo initialize fails", exc);
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
            FBTrace.sysout("Chromebug.XULWindowInfo shutdown fails", exc);
        }
    },

    //***********************************************************************************

    addJSContext: function(jsClassName, global, jsContext)  // global is not a window
    {
        var context = Firebug.Chromebug.getOrCreateContext(global, jsClassName, jsContext);

        var gs = new JSContextScopeInfo(jsClassName, global, context, jsContext);
        Chromebug.globalScopeInfos.add(context, gs);
        return context;
    },
    //***********************************************************************************
    // nsIWindowMediatorListener

    onOpenWindow: function(xul_window) {
        try
        {
            if (xul_window instanceof nsIXULWindow)
                this.addXULWindow(xul_window);
        }
        catch (e)
        {
            FBTrace.sysout("chromebug-onOpenWindow-FAILS", e);
            FBTrace.sysout("chromebug-onOpenWindow-xul_window", xul_window);
        }
    },

    addXULWindow: function(xul_window)
    {
        if (!xul_window.docShell)
            FBTrace.sysout("Firebug.Chromebug.addXULWindow no docShell", xul_window);

        var outerDOMWindow = this.getDOMWindowByDocShell(xul_window.docShell);

        if (outerDOMWindow == document.defaultView)
            return;  // This is my life we're talking about.

        if (outerDOMWindow.location.href == "chrome://fb4cb/content/traceConsole.xul")
            return; // don't track our own tracing console.

        //window.dump("outerDOMWindow.location.href "+outerDOMWindow.location.href+"\n");

        this.xulWindows.push(xul_window);
        var newTag = "tag-"+this.xulWindowTagSeed++;
        this.xulWindowTags.push(newTag);  // co-indexed arrays

        var context = Firebug.Chromebug.getOrCreateContext(outerDOMWindow);  // addXULWindow
        context.xul_window = xul_window;
        var gs = new ChromeRootGlobalScopeInfo(xul_window, context);
        Chromebug.globalScopeInfos.add(context, gs);

        if (Chromebug.XULWindowInfo.stateReloader)  // TODO this should be per xul_window
            outerDOMWindow.addEventListener("DOMContentLoaded", Chromebug.XULWindowInfo.stateReloader, true);

        // 'true' for capturing, so all of the sub-window loads also trigger
        outerDOMWindow.addEventListener("DOMContentLoaded", bind(context.loadHandler, context), true);

        outerDOMWindow.addEventListener("unload", bind(context.unloadHandler, context), true);

        outerDOMWindow.addEventListener("keypress", bind(this.keypressToBreakIntoWindow, this, context), true);

        if (xul_window.docShell instanceof nsIWebProgress)
        {
            var progressListener = new Chromebug.ProgressListener(xul_window, this);
            xul_window.docShell.addProgressListener(progressListener, Components.interfaces.nsIWebProgress.NOTIFY_ALL );
        }
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("Chromebug.XULWindowInfo.addXULWindow complete length="+this.xulWindows.length, " index="+this.getXULWindowIndex(xul_window));

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
                    Firebug.Chromebug.eachContext( function findContextsInXULWindow(context)
                    {
                        if (context.xul_window == xul_win)
                            TabWatcher.unwatchTopWindow(context.window);
                    });
                    var tag = this.xulWindowTags[mark];
                    this.xulWindows.splice(mark,1);
                    this.xulWindowTags.splice(mark,1);
                }
                else
                {
                    var outerDOMWindow = this.getDOMWindowByDocShell(xul_win.docShell);
                    FBTrace.sysout("Chromebugpanel.onclose: xul_window is unknown to us at location "+outerDOMWindow.location+"\n"+getStackDump());
                    throw "NO, do not exit";
                }
             }
             else
                 FBTrace.sysout("Chromebugpanel.onclose: not a nsIXULWindow");
        }
        catch(e)
        {
            FBTrace.sysout("ChromeBugPanel.onClose fails ", e);
            throw "NO, do not exit";
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
                    FBTrace.sysout("onWindowTitleChange ignoring outerDOMWindow.location.href "+outerDOMWindow.location.href+"\n");
                    this.onCloseWindow(xul_win);  // don't track our own tracing console.
                }

            }
            catch (exc) {window.dump("ChromeBugPanel.onWindowTitleChange:"+exc+"\n");}   // sometimes FBTrace is not defined?
        }
        return;
    },

    reloadWindow: function(xul_window)
    {
        var outerDOMWindow = Chromebug.XULWindowInfo.getDOMWindowByDocShell(xul_window.docShell);
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
                    windowToBeRestored.removeEventListener("DOMContentLoaded", Chromebug.XULWindowInfo.stateReloader, "true");
                    sessionStore.setWindowState(windowToBeRestored, storedState, true);
                    delete Chromebug.XULWindowInfo.stateReloader;
                }
            }
            catch (exc)
            {
                var ssEnabled = prefs.getBoolPref("browser.sessionstore.enabled");
                FBTrace.sysout("Firebug.Chromebug.reloadWindow FAILS with browser.sessionstore.enabled= "+ssEnabled, exc);
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
        browser.showFirebug = true;
        browser.detached = true;
        browser.webProgress =
            {
                isLoadingDocument: false // we are already in Firefox so we must not be loading...
            };
        browser.addProgressListener = function() {}
        browser.contentWindow = domWindow;
        browser.tag = this.fakeTabBrowser.browsers.length;

        var browserName = "chrome://chromebug/fakeTabBrowser/"+browser.tag;
        if (domWindow && 'location' in domWindow && domWindow.location && domWindow.location.toString())
            browserName = domWindow.location.toString();

        browser.currentURI = makeURI(browserName);

        this.fakeTabBrowser.browsers[browser.tag] = browser;
        this.fakeTabBrowser.selectedBrowser = this.fakeTabBrowser.browsers[browser.tag];
        FBTrace.sysout("createBrowser "+browser.tag+" for browserName "+browserName+' with URI '+browser.currentURI.spec);
        return browser;
    },

    selectBrowser: function(browser)
    {
        this.fakeTabBrowser.selectedBrowser = browser;
    },

    selectContext: function(context)
    {
        Chromebug.XULWindowInfo.selectBrowser(context.browser);
        Firebug.showContext(context.browser, context);
    },
};
// ************************************************************************************************

Chromebug.ProgressListener = function(xul_window, xul_watcher)
{
    this.xul_window = xul_window;
    this.xul_watcher = xul_watcher;
    this.outerDOMWindow = this.xul_watcher.getDOMWindowByDocShell(this.xul_window.docShell);
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
            FBTrace.sysout("Chromebug.ProgressListener.onLocationChange "+this.traceWindow(webProgress, request)+" to uri=\'"                                        /*@explore*/
                                          +(uri?uri.spec:"null location")+"\'\n");                                     /*@explore*/
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
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // nsIObserver

Chromebug.globalObserver = {
    observe: function(subject, topic, data)
    {
        if (topic == 'domwindowopened')
        {
            try
            {
                if (subject instanceof nsIDOMWindow)
                {
                    if (FBTrace.DBG_CHROMEBUG || FBTrace.DBG_WINDOWS) FBTrace.sysout("Chromebug.globalObserver found domwindowopened "+subject.location+"\n");
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
                FBTrace.sysout("Chromebug.globalObserver notify console opener FAILED ", exc);
            }
        }
        else if (topic == 'domwindowclosed') // Apparently this event comes before the unload event on the DOMWindow
        {
            if (subject instanceof nsIDOMWindow)
            {
                //if (FBTrace.DBG_WINDOWS)
                    FBTrace.sysout("Chromebug.globalObserver found domwindowclosed "+subject.location+getStackDump());
                if (subject.location.toString() == "chrome://chromebug/content/chromebug.xul")
                    throw new Error("Chromebug.globalObserver should not find chromebug.xul");
            }
        }
        else if (topic == 'dom-window-destroyed')  // subject appears to be the nsIDOMWindow with a location that is invalid and closed == true; data null
        {
            return;
            if (FBTrace.DBG_WINDOWS)
                FBTrace.sysout("Chromebug.globalObserver found dom-window-destroyed subject:", subject);

            if (subject instanceof nsIDOMWindow)
            {
                Chromebug.XULWindowInfo.destroyContextByDOMWindow(subject);
            }
        }
    },

};

observerService.addObserver(Chromebug.globalObserver, "domwindowopened", false);
observerService.addObserver(Chromebug.globalObserver, "domwindowclosed", false);
observerService.addObserver(Chromebug.globalObserver, "dom-window-destroyed", false);

// ************************************************************************************************
// We register a Module so we can get initialization and shutdown signals and so we can monitor context activities
//
Firebug.Chromebug = extend(Firebug.Module,
{
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
        this.uid = FBL.getUniqueId();

        if (!this.contexts)
            this.contexts = TabWatcher.contexts;

        Firebug.disabledAlways = true; // The Chromebug will enable Firebug for specific windows

        Chromebug.XULWindowInfo.initialize();

        Firebug.Debugger.addListener(this);
        Firebug.Debugger.setDefaultState(true);

        Chromebug.packageList.addListener(Chromebug.allFilesList);  // how changes to the package filter are sensed by AllFilesList

        Firebug.TraceModule.addListener(this);

        if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("Chromebug.initialize module "+this.uid+" Firebug.Debugger:"+Firebug.Debugger.fbListeners.length+" window.location="+window.location+"\n");
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

        // cause onJSDActivate to be triggered.
        this.initializeDebugger();
        // from this point forward scripts should come via debugger interface


        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("Chromebug.initializeUI -------------------------- start creating contexts --------");
        Chromebug.XULWindowInfo.watchXULWindows(); // Start creating contexts

        // Wait to let the initial windows open, then return to users past settings
        this.retryRestoreID = setInterval( bind(Firebug.Chromebug.restoreState, this), 500);
        setTimeout( function stopTrying()
        {
            Firebug.Chromebug.stopRestoration();  // if the window is not up by now give up.
        }, 5000);

        window.addEventListener("unload", function whyIsThis(event)
        {
            FBTrace.sysout(window.location+ " unload "+getStackDump(), event);
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
        if (!FirebugContext)
            FirebugContext = Firebug.Chromebug.contexts[0];
        Chromebug.XULWindowInfo.selectContext(FirebugContext);
    },

    initializeDebugger: function()
    {
        fbs.DBG_FBS_FF_START = true;

        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("initializeDebugger start, enabled: "+fbs.enabled+" ******************************\n");

        // we are not going to count down the contexts, just leave it at one
        fbs.countContext(true); // connect to firebug-service

        Firebug.Debugger.isChromeDebugger = true;
        Firebug.Debugger.wrappedJSObject = Firebug.Debugger;
        Firebug.Debugger.addListener(this);
        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("initializeDebugger complete ******************************\n");

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


        Chromebug.XULWindowInfo.shutdown();
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
    createContext: function(global, jsClassName, jsContext)
    {
        var persistedState = null; // TODO
        // domWindow in fbug is browser.contentWindow type nsIDOMWindow.
        // docShell has a nsIDOMWindow interface

        var browser = Chromebug.XULWindowInfo.createBrowser(global);

        if (!FirebugChrome)
            FBTrace.sysout("FirebugChrome is null??");

        var browser = Chromebug.XULWindowInfo.createBrowser(global);
        var context = TabWatcher.createContext(global, browser, Chromebug.DomWindowContext);

        if (context.window && context.window.location)
            TabWatcher.watchWindow(context.window, context);

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

    getOrCreateContext: function(global, jsClassName, jsContext)
    {
        var context = Firebug.Chromebug.getContextByGlobal(global);
        FBTrace.sysout("--------------------------- getOrCreateContext got context: "+(context?context.getName():"to be created"));
        if (!context)
            context = Firebug.Chromebug.createContext(global, jsClassName, jsContext);

        return context;
    },

    getContextByGlobal: function(global)
    {
        if (!this.contexts)
            this.contexts = TabWatcher.contexts;

        if (global instanceof Window)
            return TabWatcher.getContextByWindow(global);

        for (var i = 0; i < this.contexts.length; ++i)
        {
            var context = this.contexts[i];
            if (context.global && (context.global == global)) // will that test work?
                return context;
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

    unwatchWindow: function(context, win)
    {
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBugPanel.unwatchWindow for context:"+context.uid+" isChromeBug:"+context.isChromeBug+"\n");

        // Firebug groups subwindows under context.  We have contexts for top level nsIDOMWindows.
        if (context.xul_window)
        {
            this.destroyContext(context);
        }
    },

    destroyContext: function(context)
    {
        if (context.browser)
            delete context.browser.detached;

        Chromebug.packageList.deleteContext(context);
        Chromebug.globalScopeInfos.destroy(context);
       // if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBugPanel.destroyContext ---------------------- for context:"+context.uid+" :"+context.getName()+"\n");
    },

    // ********************************************************
    // implements Firebug.DebuggerListener

    onPauseJSDRequested: function(rejection)
    {
        rejection.push(true);
        FBTrace.sysout("chromebug onPauseJSDRequested: rejection ", rejection);
    },

    onJSDDeactivate: function(jsd, why)
    {
        FBTrace.sysout("chromebug onJSDDeactivate "+why);
    },

    onJSDActivate: function(jsd)  // just before hooks are set in fbs
    {
        if (Firebug.Chromebug.activated)
            return;

        //if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromeBug onJSDActivate "+(this.jsContexts?"already have jsContexts":"take the stored jsContexts"));
        try
        {
            var startupObserver = Chromebug.getStartupObserver();
            var jsdState = startupObserver.jsdState;
            if (!jsdState || !jsdState._chromebug)
            {
                setTimeout(function waitForFBTrace()
                {
                    var startupObserver = Chromebug.getStartupObserver();
                    FBTrace.sysout("ChromeBug onJSDActivate NO jsdState! startupObserver:", startupObserver);
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
                var xulScriptsByURL = jsdState._chromebug.xulScriptsByURL;
                Firebug.Chromebug.buildInitialContextList(globals, globalTagByScriptTag, xulScriptsByURL);

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

    avoidSelf: function(URI)
    {
        return (URI.indexOf("/chromebug/") != -1 || URI.indexOf("/fb4cb/") != -1);
    },

    buildInitialContextList: function(globals, globalTagByScriptTag, xulScriptsByURL)
    {
        this.buildEnumeratedSourceFiles(globals, globalTagByScriptTag, xulScriptsByURL);

        for (var url in xulScriptsByURL)
            Firebug.Chromebug.onXULScriptCreated(url, xulScriptsByURL);
    },

    buildEnumeratedSourceFiles: function(globals, globalTagByScriptTag, xulScriptsByURL)
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
                {
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
                }
                previousContext = context;

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
            Firebug.showContext(context.browser, context);

        var stopName = getExecutionStopNameFromType(type);
        FBTrace.sysout("ChromeBugPanel.onStop type: "+stopName+ "context.getName():"+context.getName() + " context.stopped:"+context.stopped );
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
        var description = Chromebug.parseURI(sourceFile.href);
        var pkg = Chromebug.packageList.getOrCreatePackage(description);
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
                        var filename = event.target.text;

                        var found = Chromebug.allFilesList.eachSourceFileDescription(function findMatching(d)
                        {
                            var testName = d.href;
                            //window.dump(filename +"=?="+testName+"\n");
                            if (testName == filename)
                            {
                                var context = d.context;
                                if (context)
                                {
                                    Firebug.Chromebug.syncToolBarToContext(context);
                                    FBTrace.sysout("onLoadConsole.eventListener found matching description: "+d+" context set to "+context.getName(), message);
                                    var line = event.target.getAttribute("lineNumber");
                                    var link = new SourceLink(filename, line, "js" );
                                    FBTrace.sysout("Chromebug click on traceConsole isAStackFrame SourceLink:"+(link instanceof SourceLink), {target: event.target, href: filename, lineNo:line, link:link});
                                    Firebug.chrome.select(link);
                                    return true;
                                }
                                else
                                    FBTrace.sysout("onLoadConsole.eventListener no context in matching description", d);
                            }
                            return false;
                        });
                        if (!found)
                            FBTrace.sysout("onLoadConsole.eventListener no match for filename "+filename);
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

    syncToolBarToContext: function(context)
    {
        if (context)
        {
            Chromebug.contextList.setCurrentLocation( context );
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("Firebug.Chromebug.syncToolBarToContext set location bar to "+context.getName());
        }

        if (context != FirebugContext)
            FirebugContext = context;
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
        var current_location = Chromebug.contextList.getCurrentLocation();
        FBTrace.sysout("Firebug.Chromebug.reload current_location", Chromebug.contextList.getObjectLocation(current_location));
        if (current_location && current_location.getContainingXULWindow)
        {
            var xul_window = current_location.getContainingXULWindow();
            if (xul_window && xul_window instanceof nsIXULWindow)
            {
                var reloadedWindow = Chromebug.XULWindowInfo.reloadWindow(xul_window);
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
            if (!FirebugContext)
                FirebugContext = context;

            //if (FBTrace.DBG_LOCATIONS)
                FBTrace.sysout("Chromebug.packageList.onSelectLocation context:"+ context.getName()+" FirebugContext:"+FirebugContext.getName());

            Chromebug.XULWindowInfo.selectContext(context);

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

    setCurrentLocation: function(context) // call from Firebug.Chromebug.syncToolBarToContext(context);
    {
        cbContextList.location = context;
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
        var d = Chromebug.parseURI(context.getName());

        d = {
           path: d?d.path:"parseURI fails",
           name: context.getName() +(title?"   "+title:""),
           label: context.getName(),
           href: context.getName()
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

            Chromebug.XULWindowInfo.selectContext(context);

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
}

Chromebug.contextListLocator = function(xul_element)
{
    var list = Chromebug.contextList;
    return connectedList(xul_element, list);
}

Chromebug.windowListLocator = function(xul_element)
{
    if (!this.WindowList)
    {
        this.WindowList = {
            elementBoundTo: xul_element,

            getLocationList: function()  // a list of tags
            {
                var xul_windows = Chromebug.XULWindowInfo.getXULWindowTags();
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("WindowList getLocationList ", xul_windows);
                return xul_windows;
            },

            getDefaultLocation: function() // the default tag
            {
                var locations = this.getLocationList();
                if (locations && locations.length > 0) return locations[0];
            },

            getObjectLocation: function(xul_window_tag)  // a title for the tag
            {
                var xul_window = Chromebug.XULWindowInfo.getXULWindowByTag(xul_window_tag);
                var win = Chromebug.XULWindowInfo.getDOMWindowByDocShell(xul_window.docShell);
                var title = win.location.href+" ("+win.document.title+")";
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("WindowList  getObjectLocation arg="+xul_window+" title="+title+"\n");
                return title;
            },

            getObjectDescription: function(xul_window_tag) // path and name for the tag
            {
                var xulWindowInfo = Chromebug.XULWindowInfo;
                var xul_window = xulWindowInfo.getXULWindowByTag(xul_window_tag);

                var index = xulWindowInfo.getXULWindowIndex(xul_window) + 1;
                var win = Chromebug.XULWindowInfo.getDOMWindowByDocShell(xul_window.docShell);
                if (FBTrace.DBG_CHROMEBUG)
                    FBTrace.sysout("WindowList  getObjectDescription tag="+xul_window_tag+" title="+win.document.title+"\n");
                if (win)
                    return {path: win.location.href, name: index+". "+win.document.title};
                else
                {
                    FBTrace.sysout("Chromebug.windowList.getObjectDescription xul_window:",xul_window);
                    return {path: "xul_window", name: "no docShell"};
                }
            },

            onSelectLocation: function(event)
            {
                var xul_window_tag = event.currentTarget.repObject;
                if (xul_window_tag)
                {
                    var xul_window = Chromebug.XULWindowInfo.getXULWindowByTag(xul_window_tag);
                    var context = Chromebug.XULWindowInfo.getDOMWindowByDocShell(xul_window.docShell);
                    Chromebug.XULWindowInfo.selectContext(context);

                    if (FBTrace.DBG_CHROMEBUG)
                        FBTrace.sysout("Chromebug.windowList.onSelectLocation context:", context.getName());
                    event.currentTarget.location = xul_window_tag;
                }
                else
                    FBTrace.sysout("onSelectLocation FAILED, no repObject in currentTarget", event.currentTarget);
            }
        }
        xul_element.addEventListener("selectObject", Chromebug.windowList.onSelectLocation, false);  // where is the remove?
    }
    return this.WindowList;
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
            Chromebug.XULWindowInfo.selectContext(context);

            Firebug.Chromebug.syncToolBarToContext(context);
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
    if (!URI || Firebug.Chromebug.avoidSelf(URI))
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
            var d = Chromebug.parseURI( URI );
        if (!d)
            d = {path:"unparsable", name: this.getObjectLocation(jscontext)};
        d.name = d.name +" ("+jscontext.tag+")";
        return d;
    },

    getContextByLocation: function(location)  // TODO MOVE to context list
    {
        for (var i = 0; i < Chromebug.XULWindowInfo.contexts.length; ++i)
        {
            var context = Chromebug.XULWindowInfo.contexts[i];
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
                    Chromebug.XULWindowInfo.selectContext(context);
                }
                else
                {
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

Chromebug.getStartupObserver = function()
{
    var chromebugAppStartClass = Components.classes["@getfirebug.com/chromebug-startup-observer;1"];
    var startupObserver = chromebugAppStartClass.getService(Ci.nsISupports);
    return startupObserver.wrappedJSObject;
}

Chromebug.dumpFileTrack = function()
{
    var startupObserver = Chromebug.getStartupObserver();
    fbs.dumpFileTrack(startupObserver.getJSDState().getAllTrackedFiles());
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

