/* See license.txt for terms of usage */


FBL.ns(function chromebug() { with (FBL) {

const Ci = Components.interfaces;
const nsIDOMDocumentXBL = Ci.nsIDOMDocumentXBL;

var previousContext = {global: null};

var ChromebugOverrides = {

    //****************************************************************************************
    // Overrides

    // Override FirebugChrome
    syncTitle: function()
    {
        window.document.title = "ChromeBug";
        if (window.Application)
            window.document.title += " in " + Application.name + " " +Application.version;
        if(FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("Chromebug syncTitle "+window.document.title+"\n");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Location interface provider for binding.xml panelFileList

    getLocationProvider: function()
    {
        // a function that returns an object with .getObjectDescription() and .getLocationList()
        return function multiContextLocator()
        {
            FBTrace.sysout("ChromebugOverride running multiContextLocator");
            var locatorDelegator =
            {
                    getObjectDescription: function(object)
                    {
                        // the selected panel may not be able to handle this because its in the wrong context
                        if (FBTrace.DBG_LOCATIONS)
                            FBTrace.sysout("MultiContextLocator getObjectDescription "+object, object);
                        return Firebug.chrome.getSelectedPanel().getObjectDescription(object);
                    },
                    getLocationList: function()
                    {
                        // The select panel is in charge.
                        return Firebug.chrome.getSelectedPanel().getLocationList();
                    },
                    getObjectLocation: function(object)
                    {
                        var d = this.getObjectDescription(object);
                        return (d?d.path+d.name:"no description");
                    },
            }
            return locatorDelegator;
        }
     },


    // Override Firebug.HTMLPanel.prototype

    getFirstChild: function(node)
    {
        if (!this.treeWalker)
        {
            //http://mxr.mozilla.org/comm-central/source/mozilla/extensions/inspector/resources/content/viewers/dom/dom.js#819
            this.treeWalker = CCIN("@mozilla.org/inspector/deep-tree-walker;1", "inIDeepTreeWalker");
            this.treeWalker.showAnonymousContent = true;
            this.treeWalker.showSubDocuments = true; // does not matter, we don't visit children, only siblings
        }

        try
        {
            this.treeWalker.init(node, Components.interfaces.nsIDOMNodeFilter.SHOW_ALL);
            return this.treeWalker.firstChild();
        }
        catch(exc)
        {
            FBTrace.sysout("Falling back to DOM Tree walker, inIDeepTreeWalker in chromebug requires FF 3.6 or higher "+exc, exc);
            this.treeWalker = node.ownerDocument.createTreeWalker(
                    node, NodeFilter.SHOW_ALL, null, false);
            return this.treeWalker.firstChild();
        }
    },

    // Override debugger
    supportsWindow: function(win)
    {
        try {
            var context = (win ? Firebug.Chromebug.getContextByGlobal(win) : null);

            if (context && context.globalScope instanceof Chromebug.ContainedDocument)
            {
                if (context.window.Firebug)  // Don't debug, let Firebug do it.
                    return false;
            }

            if (FBTrace.DBG_LOCATIONS)
                FBTrace.sysout("ChromeBugPanel.supportsWindow win.location.href: "+((win && win.location) ? win.location.href:"null")+ " context:"+context+"\n");
            this.breakContext = context;
            return !!context;
        }
        catch (exc)
        {
            FBTrace.sysout("ChromebugPanel.supportsWindow FAILS", exc);
            return false;
        }
    },

    // Override debugger
    supportsGlobal: function(frameWin, frame)  // (set the breakContext and return true) or return false;
    {
        try {
            if (frame)
            {
                var context = ChromebugOverrides.getContextByFrame(frame, previousContext);
            }
            this.breakContext = context;

            if (context)
                previousContext = context; // private to this function
            else
                previousContext = {global: null};

            return !!context;
        }
        catch (exc)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("supportsGlobal FAILS:"+exc, exc);
        }

    },

    /*
     * Map the frame to a context, using optional previoucsContext cache
     * @param frame jsdIStackFrame
     * @param previousContext returned from a previous call to this function, optional
     * @return a context
     */
    getContextByFrame: function(frame, previousContext)
    {
        if (!frame || !frame.isValid)
            return previousContext;

        // To map this frame to a context, we want the outermost scope of the current frame.
        // This is unlike Firebug, where we want to be in a Window, not just any scope.
        var scope = frame.scope;
        if (scope)
        {
            while(scope.jsParent) // walk to the oldest scope
                scope = scope.jsParent;
            try
            {
                var global = null;
                if (scope.jsClassName == "Sandbox")
                {
                    var proto = scope.jsPrototype;
                    if (proto.jsClassName == "XPCNativeWrapper")  // this is the path if we have web page in a sandbox
                    {
                        proto = proto.jsParent;
                        if (proto.jsClassName == "Window")
                            global = new XPCNativeWrapper(proto.getWrappedValue());
                    }
                }
                if (!global)
                {
                    var unwrapped = scope.getWrappedValue();
                    if (unwrapped instanceof Ci.nsISupports) // https://bugzilla.mozilla.org/show_bug.cgi?id=522527#c49
                        global = new XPCNativeWrapper(unwrapped);
                    else
                        global = unwrapped;
                }
            }
            catch(exc)
            {
                FBTrace.sysout("ChromebugOverrides.getContextByFrame FAILS for "+scope.getWrappedValue()+": "+exc);
            }

            if (FBTrace.DBG_TOPLEVEL)
                FBTrace.sysout("ChromebugOverrides.getContextByFrame found oldest scope: "+scope.jsClassName, global);
        }
        var context = null;

        if (previousContext && global == previousContext.global)
            context = previousContext;

        if (!context && global)
            context = Firebug.Chromebug.getOrCreateContext(global);

        if (context)
        {
            if (FBTrace.DBG_TOPLEVEL)
                FBTrace.sysout("supportsGlobal "+normalizeURL(frame.script.fileName)+": frame.scope gave existing context "+context.getName());
        }
        else
        {
             FBTrace.sysout("supportsGlobal "+normalizeURL(frame.script.fileName)+": no context!");
        }
        return context;
    },

    showThisSourceFile: function(sourceFile)
    {
        if (sourceFile.isEval() && !this.showEvals)
               return false;

        if (sourceFile.isEvent() && !this.showEvents)
            return false;

        var description = Chromebug.parseURI(sourceFile.href);

        if (Chromebug.allFilesList.isWantedDescription(description))
            return true;
        else
            return false;
    },

    //Firebug.SourceFile.getSourceFileByScript
    _getSourceFileByScript: Firebug.SourceFile.getSourceFileByScript,
    getSourceFileByScript: function(context, script)
    {
        var sourceFile = ChromebugOverrides._getSourceFileByScript( context, script );
        if (!sourceFile)
        {
            sourceFile = Firebug.Chromebug.eachContext(function visitContext(context)
            {
                var rc = ChromebugOverrides._getSourceFileByScript( context, script );
                if (rc)
                    return rc;
            });
        }
        return sourceFile;
    },

    // Override
    // Override FBL
    getBrowserForWindow: function(win)
    {
        var browsers = Firebug.Chromebug.getBrowsers();
        for (var i=0; i < browsers.length; ++i)
        {
            var browser = browsers[i];
            if (browser.contentWindow == win)
                return browser;
        }
    },

    skipSpy: function(win)
    {
        var uri = win.location.href; // don't attach spy to chromebug
        if (uri &&  uri.indexOf("chrome://chromebug") == 0)
                return true;
    },

    isHostEnabled: function(context)
    {
        return true; // Chromebug is always enabled for now
    },

    isAlwaysEnabled: function(context)
    {
        return true; // Chromebug is always enabled for now
    },

    suspendFirebug: function()
    {
        // TODO if possible.
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromebugPanel.suspendFirebug\n");
    },

    resumeFirebug: function()
    {
        // TODO if possible.
        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromebugPanel.resumeFirebug\n");
    },

    tagBase: 1,
    tags:[],

    getTabIdForWindow: function(win)
    {
        if (!win)  // eg net.js getWindowForRequest gives null
        {
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("ChromebugOverrides.getTabIdForWindow null window");
            return null;
        }
        if (!win instanceof Window)
            return;

        if (! (win instanceof Ci.nsIDOMWindow) )  // eg net.js getWindowForRequest gives null
        {
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("ChromebugOverrides.getTabIdForWindow not a window", win);
            return null;
        }

        var tab = Firebug.getTabForWindow(win);
        if (tab)
            return tab.linkedPanel;

        if (!win.chromebugTag)
            win.chromebugTag = ChromebugOverrides.tagBase++;
        if (win.chromebugTag)
            return win.chromebugTag;

        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("ChromebugOverrides.getTabIdForWindow no id ", win);
    },

    // Override Firebug.disableXULWindow
    disableXULWindow: function()
    {
        // no op, ignore the call
    },
};

ChromebugOverrides.commandLine = {

        isAttached: function(context)
        {
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("ChromebugOverride isAttached for "+context.window, context.window);
            return context && context.window && context.window._FirebugCommandLine;
        },

        evaluate: function(expr, context, thisValue, targetWindow, successConsoleFunction, exceptionFunction)
        {
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout('ChromebugOverrides.commandLine context.window '+context.window.location+" targetWindow "+targetWindow);

            var halter = context.window.document.getElementById("chromebugHalter");
            if (halter)
                context.window.document.removeElement(halter);

            halter = addScript(context.window.document, "chromebugHalter", "debugger;");
            /*
            Firebug.Debugger.halt(function evaluateInAFrame(frame)
            {
                context.currentFrame = frame;
                FBTrace.sysout("ChromebugOverrides.commandLine halted", frame);

                Firebug.CommandLine.evaluateInDebugFrame(expr, context, thisValue, targetWindow, successConsoleFunction, exceptionFunction);
            });
            */
        },
        onCommandLineFocus: function(event)
        {
                if (FBTrace.DBG_CONSOLE)
                    FBTrace.sysout("onCBCommandLineFocus", event);
                // do nothing.
                event.stopPropagation();
        },
}
//**************************************************************************
function overrideFirebugFunctions()
{
    try {
        // Apply overrides
        top.Firebug.prefDomain = "extensions.chromebug";
        top.Firebug.chrome.getLocationProvider = ChromebugOverrides.getLocationProvider;
        top.Firebug.chrome.getBrowsers = bind(Firebug.Chromebug.getBrowsers, Firebug.Chromebug);
        top.Firebug.chrome.getCurrentBrowser = bind(Firebug.Chromebug.getCurrentBrowser, Firebug.Chromebug);

        // Override with added function: set the toolbar to match FirebugContext
        ChromebugOverrides.setFirebugContext = top.Firebug.chrome.setFirebugContext;
        top.Firebug.chrome.setFirebugContext = function(context)
        {
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("setFirebugContext to "+(context?context.getName():"NULL"));
            if (context)
            {
                ChromebugOverrides.setFirebugContext(context);
                Chromebug.contextList.setCurrentLocation( context );
            }
            else
            {
                var context = Chromebug.contextList.getDefaultLocation();
                Firebug.Chromebug.selectContext(context);
            }
        }

        Firebug.Chromebug.chromeSelect = Firebug.chrome.select;
        Firebug.chrome.select = function(object, panelName, sidePanelName, forceUpdate)
        {
            // Some objects need to cause context changes.
            if (object instanceof Ci.jsdIStackFrame)
            {
                var context = FirebugContext;
                context = ChromebugOverrides.getContextByFrame(object, context);
                if (context != FirebugContext)
                    Firebug.Chromebug.selectContext(context);
            }
            Firebug.Chromebug.chromeSelect.apply(Firebug.chrome,[object, panelName, sidePanelName, forceUpdate])
        };


        Firebug.Chromebug.syncResumeBox = Firebug.chrome.syncResumeBox;
        top.Firebug.chrome.syncResumeBox = function(context) { if (context) Firebug.Chromebug.syncResumeBox(context); }

        top.Firebug.chrome.syncTitle = ChromebugOverrides.syncTitle;

        top.Firebug.Inspector.FrameHighlighter.prototype.doNotHighlight = function(element)
        {
             return false;
        };

        top.Firebug.HTMLPanel.prototype.getFirstChild = ChromebugOverrides.getFirstChild;

        top.Firebug.Debugger.supportsWindow = ChromebugOverrides.supportsWindow;
        top.Firebug.Debugger.supportsGlobal = ChromebugOverrides.supportsGlobal;
        top.Firebug.Debugger.getContextByFrame = ChromebugOverrides.getContextByFrame;
        top.Firebug.ScriptPanel.prototype.showThisSourceFile = ChromebugOverrides.showThisSourceFile;
        top.Firebug.SourceFile.getSourceFileByScript = ChromebugOverrides.getSourceFileByScript;

        top.Firebug.showBar = function() {
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("ChromeBugPanel.showBar NOOP\n");
        }

        Firebug.Spy.skipSpy = ChromebugOverrides.skipSpy;
        Firebug.ActivableModule.isHostEnabled = ChromebugOverrides.isHostEnabled;
        Firebug.ActivableModule.isAlwaysEnabled = ChromebugOverrides.isAlwaysEnabled;
        Firebug.suspendFirebug = ChromebugOverrides.suspendFirebug;
        Firebug.resumeFirebug = ChromebugOverrides.resumeFirebug;

        top.Firebug.getTabIdForWindow = ChromebugOverrides.getTabIdForWindow;
        top.Firebug.disableXULWindow = ChromebugOverrides.disableXULWindow;
        FBL.getBrowserForWindow = ChromebugOverrides.getBrowserForWindow;

        for (var p in Chromebug.Activation)
            Firebug.Activation[p] = Chromebug.Activation[p];

        Firebug.getContextType = function getChromebugContextType()
        {
            return Chromebug.DomWindowContext;
        };

        FBL.getRootWindow = function(win) { return win; };

        //Firebug.CommandLine.evaluate = ChromebugOverrides.commandLine.evaluate;
        //Firebug.CommandLine.onCommandLineFocus = ChromebugOverrides.commandLine.onCommandLineFocus;
        Firebug.CommandLine.isAttached = ChromebugOverrides.commandLine.isAttached;
        // Trace message coming from Firebug should be displayed in Chromebug's panel
        //
        Firebug.setPref("extensions.firebug", "enableTraceConsole", "panel");

        window.dump("ChromebugPanel Overrides applied"+"\n");
    }
    catch(exc)
    {
        window.dump("ChromebugPanel override FAILS "+exc+"\n");
    }
}

function echo(header, elt)
{
    if (FBTrace.DBG_HTML && elt)
        FBTrace.sysout(header + (elt ? elt.localName:"null")+"\n");
    return elt;
}
// TODO make this FBL or chrome . functions
function panelSupportsObject(panelType, object)
{
    if (panelType)
    {
        try {
            // This tends to throw exceptions often because some objects are weird
            return panelType.prototype.supportsObject(object)
        } catch (exc) {}
    }

    return 0;
}

//*************************************************************************************************
// Override Firebug.Activation module logic

Chromebug.Activation =
{
    initialize: function()
    {
    },

    allOff: function()
    {

    },

    updateAllPagesActivation: function()
    {

    },

    shouldCreateContext: function(browser, url, userCommands)
    {
        FBTrace.sysout("Chromebug.Activation "+url, browser);
        return !Firebug.Chromebug.isChromebugURL(url);
    },

    shouldShowContext: function(context)
    {
        // Don't show chromebug's own windows.
        if (context && context.window && context.window instanceof Ci.nsIDOMWindow)
            return !Firebug.Chromebug.isChromebugURL(context.getName());
        else
            return true;  // show non-window contexts
    }
};

overrideFirebugFunctions();
}});