/* See license.txt for terms of usage */

define([
    "firebug/lib",
    "firebug/reps",
    "firebug/domplate",
    "firebug/domPanel"
],
function(FBL, FirebugReps, Domplate)
{

// ***********************************************************************************
// Shorcuts and Services

const Cc = Components.classes;
const Ci = Components.interfaces;

const docShellTypeNames = ["Chrome", "Content", "ContentWrapper", "ChromeWrapper"]; // see nsIDocShellTreeItem

var windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"]
        .getService(Ci.nsIWindowMediator);

var windowWatcher = Cc["@mozilla.org/embedcomp/window-watcher;1"]
                       .getService(Ci.nsIWindowWatcher);

const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

var panelName = "window";

const reChromebug = /^chrome:\/\/chromebug\//;

// ***********************************************************************************
// Chromebug XULApp Module

/**
 * Implementation of a Module & Panel for XULApp viewer.
 */
Chromebug.XULAppModule = FBL.extend(Firebug.Module,
{

    // ****************************************************
    // A XUL App's windows

    xulWindows: [],  // all xul_windows
    xulWindowTags: [], // co-indexed strings for xulWindows

    getDocShellByDOMWindow: function(domWindow)
    {
       if (domWindow instanceof Ci.nsIInterfaceRequestor)
       {
           try
           {
               var navi = domWindow.getInterface(Ci.nsIWebNavigation);
           }
           catch (exc)
           {
               FBTrace.sysout("Chromebug getDocShellByDOMWindow, domWindow.getInterface FAILS "+exc, {exc: exc, domWindow: domWindow});
               return;
           }
           if (navi instanceof Ci.nsIDocShellTreeItem)
           {
               return navi;
           }
           else
               FBTrace.sysout("Chromebug getDocShellByDOMWindow, nsIWebNavigation notA nsIDocShellTreeItem "+domWindow);
        }
        else
        {
            FBTrace.sysout("Chromebug getDocShellByDOMWindow, window notA nsIInterfaceRequestor:", domWindow);
            FBTrace.sysout("getDocShellByDOMWindow domWindow.location:"+domWindow.location, " isA nsIDOMWindow: "+(domWindow instanceof Ci.nsIDOMWindow));
        }
    },

    getDocumentTypeByDOMWindow: function(domWindow)
    {
        var docShell = this.getDocShellByDOMWindow(domWindow);
        if (docShell instanceof Ci.nsIDocShellTreeItem)
        {
            var typeIndex = docShell.itemType;
            return docShellTypeNames[typeIndex];
        }
        else
            FBTrace.sysout("Chromebug.getDocumentType, docShell is not a nsIDocShellTreeItem:", docShell);
    },

    getXULWindowByRootDOMWindow: function(domWindow)
    {
        if(FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("XULAppModule.getXULWindowByRootDOMWindow "+domWindow.location.href+" for xulWIndows.length="+this.xulWindows.length+"\n");
        for (var i = 0; i < this.xulWindows.length; i++)
        {
            var xul_window = this.xulWindows[i];
            var xul_windows_domWindow = this.getDOMWindowByXULWindow(xul_window);
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

    getDOMWindowByXULWindow: function(xul_window)
    {
        return this.getDOMWindowByDocShell(xul_window.docShell);
    },

    getDOMWindowByDocShell: function(docShell)
    {
        try
        {
            if (docShell)
            {
                if (docShell instanceof Ci.nsIInterfaceRequestor)
                {
                    var win = docShell.getInterface(Ci.nsIDOMWindow);
                    if (win)
                        return win;
                    else
                    {
                        if (FBTrace.DBG_ERRORS)
                            FBTrace.sysout("getDOMWindowByXULWindow xul_win.docShell has nsIInterfaceRequestor but not nsIDOMWindow\n");
                    }
                }
                else
                {
                    if (FBTrace.DBG_ERRORS)
                        FBTrace.sysout("getDOMWindowByXULWindow xul_win.docShell has no nsIInterfaceRequestor\n");
                }
            }
            else
            {
                if (FBTrace.DBG_ERRORS)
                    FBTrace.sysout("getDOMWindowByXULWindow xul_win has no docShell");
            }
        }
        catch (exc)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("getDOMWindowByXULWindow FAILS "+exc, exc);
        }
    },

    getDocShellTreeItem: function(xul_window)
    {
        var docShell = xul_window.docShell;
        if (docShell instanceof Ci.nsIInterfaceRequestor)
        {
            var item = docShell.getInterface(Ci.nsIDocShellTreeItem);
            if (item instanceof Ci.nsIDocShellTreeItem)
                return item;
        }
        FBTrace.sysout("xulapp.getDocShellTreeItem fails for docShell ", docShell);
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

    eachXULWindow: function(iterator)
    {
        for(var i = 0; i < this.xulWindows.length; i++ )
        {
            var rc = iterator(this.xulWindows[i]);
            if (rc)
                return rc;
        }
        return null;
    },

    eachDocShell: function(docShell, content_chrome_OR_all, iterator)
    {
        var treeItemType = Ci.nsIDocShellTreeItem.typeAll;
        if (content_chrome_OR_all == "chrome")
            treeItemType = Ci.nsIDocShellTreeItem.typeChrome;
        else if (content_chrome_OR_all == "content")
            treeItemType = Ci.nsIDocShellTreeItem.typeContent;
        // From inspector@mozilla.org inspector.js appendContainedDocuments
        // Load all the window's content docShells
        var containedDocShells = docShell.getDocShellEnumerator(treeItemType,
                                          Ci.nsIDocShell.ENUMERATE_FORWARDS);
        while (containedDocShells.hasMoreElements())
        {
            try
            {
                var childDocShell = containedDocShells.getNext().QueryInterface(Ci.nsIDocShell);
                iterator(childDocShell);
            }
            catch (exc)
            {
                FBTrace.sysout("XULAppModule.eachDocShell FAILED", exc);
            }
        }
        return true;
    },

    iterateOuterDOMWindows: function(handler)
    {
        for(var i = 0; i < this.xulWindows.length; i++)
        {
            var xul_window = this.xulWindows[i];
            Chromebug.XULAppModule.eachDocShell
            (
                xul_window.docShell, true, function(childDocShell)
                {
                    if (childDocShell.contentViewer) // nsiDocShell.nsIContentViewer
                    {
                        var childDoc = childDocShell.contentViewer.DOMDocument;

                        if (childDoc instanceof Ci.nsIDOMDocument && childDoc.defaultView instanceof Ci.nsIDOMWindow)
                            //FBL.iterateWindows(childDoc.defaultView, handler);
                            handler(childDoc.defaultView);
                    }
                }
            );
        }
    },

    getDOMWindowTreeByXULWindow: function(xulWindow)
    {
        var docShell = xulWindow.docShell;
        return this.getDOMWindowTreeByDocShell(docShell);
    },

    getDOMWindowTreeByDocShell: function(docShell)
    {
        var domWindowTreeNode = {};

        var domWindow = Chromebug.XULAppModule.getDOMWindowByDocShell(docShell);
        var key = Chromebug.XULAppModule.getKeyByDOMWindow(domWindow);

        var isParent = false;
        this.eachDocShell(docShell, "all", function visitSubShells(childShell)
        {
            var childDOMWindow = Chromebug.XULAppModule.getDOMWindowByDocShell(childShell);
            var childKey = Chromebug.XULAppModule.getKeyByDOMWindow(childDOMWindow);

            if (childKey === key)
            {
                domWindowTreeNode[childKey] = {win: domWindow, children: {}, outer: true}; // outer DOM window
            }
            else
            {
                isParent = true;
                var familyTree = Chromebug.XULAppModule.getDOMWindowTreeByDocShell(childShell);  // recurse
                domWindowTreeNode[childKey] = {win: childDOMWindow, children: familyTree};
            }
        });
        domWindowTreeNode[key].isParent = isParent;
        return domWindowTreeNode;
    },

    getKeyByDOMWindow: function(domWindow, domWindowsByURL)
    {
        var id = FBL.getWindowId(domWindow);
        var key = id.outer;
        return key;
    },

    getDOMWindowTree: function()
    {
        var domWindowTreeNode = {};

        var enumerator = windowMediator.getXULWindowEnumerator(null);  // null means all
        while(enumerator.hasMoreElements())
        {
             var xul_window = enumerator.getNext();
             if (xul_window instanceof Ci.nsIXULWindow)
             {
                 if (xul_window.docShell)
                 {
                     var domWindow = this.getDOMWindowByXULWindow(xul_window);
                     var key = this.getKeyByDOMWindow(domWindow);

                     var familyTree = this.getDOMWindowTreeByXULWindow(xul_window);  // recurse
                     domWindowTreeNode[key] = {win: domWindow, children: familyTree, isParent: true};
                 }
                 else
                     FBTrace.sysout("A XUL Window without a docShell??", xul_window);
             }
             else
             {
                 FBTrace.sysout("getXULWindowEnumerator gave element that was not nsIXULWindow!", xul_window);
             }
         }
        return domWindowTreeNode;
    },

    getWindowMediatorDOMWindows: function()
    {
        // http://mxr.mozilla.org/mozilla-central/source/xpfe/appshell/public/nsIWindowMediator.idl

        var domWindowsByURL = {};
        var enumerator = windowMediator.getEnumerator(null);  // null means all
        while(enumerator.hasMoreElements()) {
             var domWindow = enumerator.getNext();
             var url = FBL.safeGetWindowLocation(domWindow);
             if (url)
                 domWindowsByURL[url] = domWindow;
             else
                 domWindowsByURL["(no location)"] = domWindow; // this will overwrite, but just to notify anyway
        }
        return domWindowsByURL;
    },

    //***********************************************************************************
    // observers

    unwatchXULWindow :
    {
        observe: function(subject, topic, data)
        {
            FBTrace.sysout("xulapp unwatchXULWindow.observe xul-window-destroyed == "+topic, {subject: subject, data: data});
            // The subject is null, the window is gone, see http://mxr.mozilla.org/mozilla-central/source/xpfe/appshell/src/nsXULWindow.cpp#556
            /* Apparently this event comes to late to do anything useful with the objects. */
        },
    },

    watchXULWindow :
    {
        observe: function(subject, topic, data)
        {
            FBTrace.sysout("xulapp watchXULWindow.observe xul-window-registered == "+topic, {subject: subject, data: data});

        },
    },

    watchedWindows: {},

    watchChromeWindow:
    {
        observe: function(subject, topic, data)
        {
            if (subject instanceof Ci.nsIDOMWindow)
            {
                var id = FBL.getWindowId(subject);
                var name = FBL.safeGetWindowLocation(subject);
                if (name)
                {
                    if (!Firebug.Chromebug.applicationReleased)  // then windows created could still be chromebug windows
                    {
                        if (Chromebug.XULAppModule.isChromebugDOMWindow(subject))
                        {
                            FBTrace.sysout("createContext dropping chromebug DOM window "+FBL.safeGetWindowLocation(subject));
                            return null;
                        }
                    }
                    var context = Firebug.Chromebug.getOrCreateContext(subject, name);
                    if (!context)
                    {
                        FBTrace.sysout("watchChromeWindow ERROR no context for id: "+id+" "+FBL.safeGetWindowLocation(subject));
                        return;
                    }
                    Chromebug.XULAppModule.watchedWindows[id.inner] =  {win: subject, kind: 'chrome', context: context};
                    FBTrace.sysout("watchChromeWindow location: "+subject.location+" id: "+id.outer+"."+id.inner+" context "+context.getName());
                    return;
                }
                FBTrace.sysout("watchChromeWindow ERROR window with no location,  id: "+id.outer+"."+id.inner);
            }
        }
    },

    watchContentWindow:
    {
        observe: function(subject, topic, data)
        {
            if (subject instanceof Ci.nsIDOMWindow)
            {
                var id = FBL.getWindowId(subject);
                FBTrace.sysout("watchContentWindow data: "+data+" location: "+subject.location+" id: "+id.outer+"."+id.inner);
                Chromebug.XULAppModule.watchedWindows[id.inner] = {win: subject, kind: 'content'};
            }
        }
    },

    unwatchInnerWindow:
    {
        observe: function(subject, topic, data)
        {
            var id = subject.QueryInterface(Components.interfaces.nsISupportsPRUint64).data
            var watched = Chromebug.XULAppModule.watchedWindows[id];
            if (!watched)
            {
                FBTrace.sysout("unwatchInnerWindow ERROR id: "+id+" not watched");
                return;
            }

            FBTrace.sysout("unwatchInnerWindow id: "+id+" "+watched.kind+" "+watched.win.location);

            delete Chromebug.XULAppModule.watchedWindows[id];
        }
    },

    unwatchOuterWindow:
    {
        observe: function(subject, topic, data)
        {
            var id = subject.QueryInterface(Components.interfaces.nsISupportsPRUint64).data
            FBTrace.sysout("unwatchOuterWindow id: "+id);
        }
    },

    //***********************************************************************************
    // nsIWindowMediatorListener

    onOpenWindow: function(xul_window)
    {
        try
        {
            if (xul_window instanceof Ci.nsIXULWindow)
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

        var outerDOMWindow = this.getDOMWindowByXULWindow(xul_window);

        if (outerDOMWindow == document.defaultView)
            return;  // This is my life we're talking about.

        if (outerDOMWindow.location.href == "chrome://fb4cb/content/traceConsole.xul")
            return; // don't track our own tracing console.

        this.xulWindows.push(xul_window);

        var newTag = "tag-"+this.xulWindowTagSeed++;
        this.xulWindowTags.push(newTag);  // co-indexed arrays

        FBL.dispatch(this.fbListeners, "onXULWindowAdded", [xul_window, outerDOMWindow]);

        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("Chromebug.XULAppModule.addXULWindow "+outerDOMWindow.location.href+ " complete length="+this.xulWindows.length, " index="+this.getXULWindowIndex(xul_window));

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
        this.cleanUpXULWindow(xul_win);
    },

   /* addCloser: function(xul_win, closer)
    {
        if (!this.closers[xul_win])
            this.closers[xul_win] = [];

        var win = Chromebug.XULAppModule.getDOMWindowByXULWindow(xul_win);
        FBTrace.sysout("addCloser win "+win+" xul_win "+xul_win);
        this.closerDOMWindows[xul_win] = win;
        this.closers[xul_win].push(closer);
    },
*/
    cleanUpXULWindow: function(xul_win)
    {
        try
        {
            if (xul_win instanceof Ci.nsIXULWindow)
            {
                var mark = this.getXULWindowIndex(xul_win);
                if (mark == -1)   // A window closed but we don't know which one.
                {
                    // https://bugzilla.mozilla.org/show_bug.cgi?id=325636
                    var SIP=Components.Constructor("@mozilla.org/supports-interface-pointer;1",
                        Ci.nsISupportsInterfacePointer);
                    for (var i = 0; i < this.xulWindows.length; i++)
                    {
                        var ptr = new SIP;
                        ptr.data = xul_win;
                        if (ptr.data == this.xulWindows[i])
                        {
                            mark = i;
                            if (FBTrace.DBG_CHROMEBUG)
                                FBTrace.sysout("XULAppModule.onclose: timeless nsISupportsInterfacePointer found mark="+mark+"\n");
                            break;
                        }
                    }
                }
                if (mark != -1)
                {
                    if (FBTrace.DBG_CHROMEBUG)
                        FBTrace.sysout("XULAppModule.onclose: removing getXULWindowIndex="+mark);

                    var tag = this.xulWindowTags[mark];
                    this.xulWindows.splice(mark,1);
                    this.xulWindowTags.splice(mark,1);
                    var outerDOMWindow = this.getDOMWindowByXULWindow(xul_win);
                    FBTrace.sysout("XULAppModule.onclose: removing getXULWindowIndex="+mark+" with outerDOMWindow "+outerDOMWindow);
                    Firebug.TabWatcher.unwatchTopWindow(outerDOMWindow);
                }
                else
                {
                    var outerDOMWindow = this.getDOMWindowByXULWindow(xul_win);
                    var url = new String(outerDOMWindow.location);
                    if (reChromebug.test(url))
                        return; // ignore self
                    FBTrace.sysout("XULAppModule.onclose: xul_window is unknown to us at location "+outerDOMWindow.location);
                }
             }
             else
                 FBTrace.sysout("XULAppModule.onclose: not a nsIXULWindow");
        }
        catch(e)
        {
            FBTrace.sysout("XULAppModule.onClose fails ", e);
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
                FBTrace.sysout("XULAppModule.onWindowTitleChange tag:"+tag+" to \'"+newTitle+"\'\n");

                var outerDOMWindow = this.getDOMWindowByXULWindow(xul_win);

                if (outerDOMWindow.location.href == "chrome://fb4cb/content/traceConsole.xul")
                {
                    FBTrace.sysout("onWindowTitleChange ignoring outerDOMWindow.location.href "+outerDOMWindow.location.href+"\n");
                    this.onCloseWindow(xul_win);  // don't track our own tracing console.
                }

            }
            catch (exc) {window.dump("XULAppModule.onWindowTitleChange:"+exc+"\n");}   // sometimes FBTrace is not defined?
        }
        return;
    },

    reloadWindow: function(xul_window)
    {
        var outerDOMWindow = Chromebug.XULAppModule.getDOMWindowByXULWindow(xul_window);
        if (outerDOMWindow && outerDOMWindow instanceof Ci.nsIDOMWindow)
        {
            try
            {
                if (!this.seesionStore)
                {
                    this.sessionStore = Components.classes["@mozilla.org/browser/sessionstore;1"].
                        getService(Ci.nsISessionStore);
                }
                var storedState = sessionStore.getWindowState(outerDOMWindow);
                var ss = sessionStore;
                // save until the window is ready for state
                this.stateReloader = function(event)
                {
                    var windowToBeRestored = event.currentTarget;
                    windowToBeRestored.dump("setWindowState for "+windowToBeRestored.location+" to "+storedState+"\n");
                    windowToBeRestored.removeEventListener("DOMContentLoaded", Chromebug.XULAppModule.stateReloader, "true");
                    sessionStore.setWindowState(windowToBeRestored, storedState, true);
                    delete Chromebug.XULAppModule.stateReloader;
                }
            }
            catch (exc)
            {
                var ssEnabled = prefs.getBoolPref("browser.sessionstore.enabled");
                FBTrace.sysout("Firebug.Chromebug.reloadWindow FAILS with browser.sessionstore.enabled= "+ssEnabled, exc);
            }

            FBTrace.sysout("Chromebug reloadWindow closing outerDOMWindow\n");
            outerDOMWindow.close();
            FBTrace.sysout("Chromebug reloadWindow opening new window\n");
            var ff = window.open();
            return ff;
        }
        else
            FBTrace.sysout("XULAppModule.reload, no domWindow for xul_window_tag:"+xul_window_tag+"\n");
        return false;
    },

    // *****************************************************
    dispatchName: panelName,

    initialize: function(prefDomain, prefNames)
    {
        if (FBTrace.DBG_CBWINDOW)
            FBTrace.sysout("Chromebug.XULAppModule.initialize" + prefDomain);

        this.xulWindowTagSeed = FBL.getUniqueId();
        windowWatcher.registerNotification(this);

        observerService.addObserver(Chromebug.XULAppModule.unwatchXULWindow, "xul-window-destroyed", false);
        observerService.addObserver(Chromebug.XULAppModule.watchXULWindow, "xul-window-registered", false);
        this.watchDOMWindows();
    },

    initializeUI: function()
    {
        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("xulapp.initializeUI -------------------------- start creating contexts --------");
        this.watchXULWindows();
    },

    watchXULWindows: function()
    {
        // get the existing windows first
        var enumerator = windowMediator.getXULWindowEnumerator(null);
        while(enumerator.hasMoreElements())
        {
            var xul_window = enumerator.getNext();
            if (xul_window instanceof Ci.nsIXULWindow)
                this.addXULWindow(xul_window);
        }
        try
        {
            // then watch for new ones
            windowMediator.addListener(this);  // removed in this.shutdown
        }
        catch(exc)
        {
            FBTrace.sysout("Chromebug.XULAppModule initialize fails", exc);
        }
    },

    watchDOMWindows: function()
    {
        observerService.addObserver(Chromebug.XULAppModule.watchChromeWindow, "chrome-document-global-created", false);
        observerService.addObserver(Chromebug.XULAppModule.watchContentWindow, "content-document-global-created", false);
        observerService.addObserver(Chromebug.XULAppModule.unwatchInnerWindow, "inner-window-destroyed", false);
        observerService.addObserver(Chromebug.XULAppModule.unwatchOuterWindow, "outer-window-destroyed", false);
    },

    shutdown: function()
    {
        try
        {
            windowWatcher.unregisterNotification(this);
            windowMediator.removeListener(this);  // added in this.initialize()
            observerService.removeObserver(Chromebug.XULAppModule.unwatchXULWindow, "xul-window-destroyed", false);
            observerService.removeObserver(Chromebug.XULAppModule.watchXULWindow, "xul-window-registered", false);
            observerService.removeObserver(Chromebug.XULAppModule.watchChromeWindow, "chrome-document-global-created", false);
            observerService.removeObserver(Chromebug.XULAppModule.watchContentWindow, "content-document-global-created", false);
            observerService.removeObserver(Chromebug.XULAppModule.unwatchInnerWindow, "inner-window-destroyed", false);
            observerService.removeObserver(Chromebug.XULAppModule.unwatchOuterWindow, "outer-window-destroyed", false);

        }
        catch (exc)
        {
            FBTrace.sysout("Chromebug.XULAppModule shutdown fails", exc);
        }
    },

    initContext: function(context)
    {
        if (FBTrace.DBG_CBWINDOW)
            FBTrace.sysout("Chromebug.XULAppModule.initContext; " + context.name);
    },

    // Helpers
    addStyleSheet: function()
    {
        var panelType = Firebug.getPanelType(panelName);
        var doc = Firebug.chrome.getPanelDocument(panelType);

        // Make sure the stylesheet isn't appended twice.
        if ($("cbXULApps", doc))
            return;

        var styleSheet = createStyleSheet(doc, "chrome://chromebug/skin/windowPanel.css");
        styleSheet.setAttribute("id", "cbXULApps");
        addStyleSheet(doc, styleSheet);
    },

    // UI Commands
    refresh: function(context)
    {
        var panel = context.getPanel(panelName, false);
        panel.refresh();
    },

    isChromebugDOMWindow: function(domWindow)
    {
        var root = FBL.getRootWindow(domWindow);
        var theContainingXULWindow = Chromebug.XULAppModule.getXULWindowByRootDOMWindow(root);
        if (Firebug.Chromebug.isChromebugURL(FBL.safeGetWindowLocation(theContainingXULWindow)))
            return true;
        else
            return false;
    },
});

// Helper shortcut
var Module = Chromebug.XULAppModule;

// ************************************************************************************************
// Firebug XUL Windows Panel

Chromebug.XULAppPanel = function() {}

Chromebug.XULAppPanel.prototype = FBL.extend(Firebug.DOMPanel.prototype,
{
    name: panelName,
    title: "XUL Windows",
    searchable: false,
    editable: false,

    supportsObject: function(object)
    {
        if (object instanceof Ci.nsIXULWindow)
            return 10;
        else
            return 0;
    },

    getDefaultSelection: function()
    {
        var tree = Chromebug.XULAppModule.getDOMWindowTree();
        // Convert the tree of {win, children} object to a tree of {description, descriptions}
        return this.getDescriptionByNode(tree);
    },

    getDescriptionByNode: function(node)
    {
        var description = new Chromebug.XULAppModule.WindowList();
        for (var key in node)
        {
            if (node.hasOwnProperty(key))
            {
                var childNode = node[key];
                if (childNode.outer)
                {
                    description["outer DOM window"] = childNode.win;
                }
                else
                {
                    var childName = this.getDOMWindowDescription(childNode.win);
                    if (childNode.isParent)
                    {
                        var childrenDescription = this.getDescriptionByNode(childNode.children);
                        description[childName] = childrenDescription;
                    }
                    else
                    {
                        description[childName] = childNode.win;
                    }
                }
            }
        }
        return description;
    },

    getDOMWindowDescription: function(domWindow)
    {
        var url = FBL.safeGetWindowLocation(domWindow);
        var title = domWindow.document.title;
        var id = FBL.getWindowId(domWindow);
        var key = url +"("+id.outer+"."+id.inner+") - "+title;

        return key;
    },

    addMember: function(object, type, props, name, value, level, order, context)
    {
        var member = Firebug.DOMPanel.prototype.addMember.apply(this, arguments);
        if (name === 'outer DOM window')
        {
            var index = props.indexOf(member);
            props.splice(index, 1);
        }
        return member;
    },

    show: function(state)
    {
        this.selection = null;
        if (FBTrace.DBG_CBWINDOW)
            FBTrace.sysout("Chromebug.XULAppModule.XULAppPanel.show;", state);

        FBTrace.sysout('xulapp show enumerating windows');
        var enumerator = windowWatcher.getWindowEnumerator();
        while (enumerator.hasMoreElements())
        {
            var win = enumerator.getNext();
            if (win instanceof Ci.nsIDOMWindow)
                FBTrace.sysout("xulapp show window "+FBL.safeGetWindowLocation(win));
            else
                FBTrace.sysout("xulapp show not an nsIDOMWindow");
        }

        this.showToolbarButtons("cbWindowButtons", true);
        Firebug.DOMPanel.prototype.show.apply(this, arguments);
    },

    hide: function()
    {
        if (FBTrace.DBG_CBWINDOW)
            FBTrace.sysout("Chromebug.XULAppModule.XULAppPanel.hide;");

        this.showToolbarButtons("cbWindowButtons", false);
        Firebug.DOMPanel.prototype.hide.apply(this, arguments);
    },

    getOptionsMenuItems: function()
    {
         var items = [];
         return items;
    },

    onPrefChange: function(optionName, optionValue)
    {
        if (FBTrace.DBG_CBWINDOW)
            FBTrace.sysout("Chromebug.XULAppModule.XULAppPanel.onPrefChange; " + optionName + "=" + optionValue);
    },
});

 // ************************************************************************************************
Chromebug.XULAppModule.WindowList = function()
{
}
with (Domplate) {

    Chromebug.XULAppModule.WindowListRep = domplate(Firebug.Rep,
    {
        supportsObject: function(object)
        {
                return (object instanceof Chromebug.XULAppModule.WindowList) ? 10 : 0;
            },

            tag:
                FirebugReps.OBJECTLINK("Window ", SPAN({"class": "objectPropValue"}, "$object|getLocation")),

            getLocation: function(windowList)
            {
                var win = windowList['outer DOM window'];
                try
                {
                    return (win && win.location && !win.closed) ? getFileName(win.location.href) : "";
                }
                catch (exc)
                {
                    if (FBTrace.DBG_ERRORS)
                        FBTrace.sysout("reps.Window window closed? "+exc, exc);
                }
            },

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

            className: "XULWindowList",
    });

}


// ************************************************************************************************
// Registration

Firebug.registerRep(Chromebug.XULAppModule.WindowListRep);
Firebug.registerModule(Chromebug.XULAppModule);
Firebug.registerPanel(Chromebug.XULAppPanel);

return Chromebug.XULAppModule;

// ************************************************************************************************

});
