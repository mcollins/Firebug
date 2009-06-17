/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;
//************************************************************************************************

Chromebug.DomWindowContext = function(global, browser, chrome, persistedState)
{
    var tabContext = new Firebug.TabContext(global, browser, Firebug.chrome, persistedState);
    for (var n in tabContext)
         this[n] = tabContext[n];

    this.isChromeBug = true;
    this.loaded = true;
    this.detached = window;  // the window containing firebug for the context is chromebug window
    this.originalChrome = null;


    this.global = global;
    if (global instanceof Ci.nsIDOMWindow)
        this.window = global;
    else
    {
        if (global)
            var name = Firebug.Rep.getTitle(global);
        else if (jsContext)
            var name = (jsContext?jsContext.tag:0)+"/"+jsClassName;
        else if (jsClassName)
            var name = jsClassName;
        else
            var name ="mystery";

        this.setName("noWindow://"+name);
    }

    this.global = global; // maybe equal to domWindow

    if (this.window)
        this.windows.push(this.window); // since we don't watchWindows in chromebug

    var persistedState = FBL.getPersistedState(this, "script");
    if (!persistedState.enabled)  // for now default all chromebug window to enabled.
        persistedState.enabled = "enable";

    FBTrace.sysout("Chromebug.domWindowContext: "+(this.global?" ":"NULL global ")+this.getName(), this.getName());
}

Chromebug.DomWindowContext.prototype = extend(Firebug.TabContext.prototype,
{
    setName: function(name)
    {
        this.name = new String(name);
    },

    getGlobalScope: function()
    {
        return this.global;  // override Firebug's getGlobalScope; same iff global == domWindow
    },
    // *************************************************************************************************

    loadHandler: function(event)
    {
        // We've just loaded all of the content for an nsIDOMWindow. We need to create a context for it.
        var outerDOMWindow = event.currentTarget; //Reference to the currently registered target for the event.
        var domWindow = event.target.defaultView;

        if (domWindow == outerDOMWindow)
        {
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("context.domWindowWatcher found outerDOMWindow", outerDOMWindow.location);
            return;
        }

        if (domWindow.location.protocol != "chrome:")  // the chrome in ChromeBug
        {
            FBTrace.sysout("DomWindowContext.loadHandler skips "+domWindow.location);
            return;
        }

        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("context.domWindowWatcher, new window in outerDOMWindow", outerDOMWindow.location+" event.orginalTarget: "+event.originalTarget.documentURI);

        var context = Firebug.Chromebug.getContextByGlobal(domWindow, true);
        if (context)
        {
            // then we had one, say from a Frame
             if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("ChromeBugPanel.domWindowWatcher found context with id="+context.uid+" and outerDOMWindow.location.href="+outerDOMWindow.location.href+"\n");
            Chromebug.globalScopeInfos.remove(context.globalScope);
        }
        else
        {
            var context = Firebug.Chromebug.getOrCreateContext(domWindow); // subwindow
            if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("ChromeBugPanel.domWindowWatcher created context with id="+context.uid+" and outerDOMWindow.location.href="+outerDOMWindow.location.href+"\n");
        }
        var gs = new Chromebug.ContainedDocument(context.xul_window, context);
        Chromebug.globalScopeInfos.add(context, gs);
    },

    unloadHandler: function(event)
    {
        FBTrace.sysout("DOMWindowContext.unLoadHandler event.currentTarget.location: "+event.currentTarget.location+"\n");

        if (event.target instanceof HTMLDocument)  // we are only interested in Content windows
            var domWindow = event.target.defaultView;
        else if (event.target instanceof XULElement || event.target instanceof XULDocument)
        {
        //FBTrace.sysout("context.unloadHandler for context.window: "+this.window.location+" event", event);

            FBTrace.sysout("context.unloadHandler for typeof(event.target): "+typeof(event.target)+" event.target "+event.target+" tag:"+event.target.tagName+"\n");
            var document = event.target.ownerDocument;
            if (document)
                var domWindow = document.defaultView;
            else
            {
                FBTrace.sysout("context.unloadHandler cannot find document for context.window: "+this.window.location, event.target);
                return;   // var domWindow = event.target.ownerDocument.defaultView;
            }
        }

        if (domWindow)
        {
            if (domWindow instanceof Ci.nsIDOMWindow)
            {
                var context = Firebug.Chromebug.getContextByGlobal(domWindow);
                if (context)
                {
                    FBTrace.sysout("Firebug.Chromebug.unloadHandler found context with id="+context.uid+" and domWindow.location.href="+domWindow.location.href+"\n");
                    if (context.globalScope instanceof Chromebug.ContainedDocument && context.globalScope.getDocumentType() == "Content")
                    {
                        Chromebug.globalScopeInfos.remove(context.globalScope);
                        remove(Firebug.Chromebug.contexts, context);
                        Firebug.destroyContext(context);
                    }
                    return;
                }
                FBTrace.sysout("ChromeBug unloadHandler found no context for event.currentTarget.location"+event.currentTarget.location, domWindow);
                return;
            }
            FBTrace.sysout("ChromeBug unloadHandler domWindow not nsIDOMWindow event.currentTarget.location"+event.currentTarget.location, domWindow);
        }
        FBTrace.sysout("ChromeBug unloadHandler found no DOMWindow for event.target", event.target);
    },

});


}});
