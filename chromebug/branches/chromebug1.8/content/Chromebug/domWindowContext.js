/* See license.txt for terms of usage */

define([
        "chromebug/chromebug",
        "firebug/firebug",
        "firebug/tabContext",
        ],
function domWindowContextFactory(Chromebug, Firebug)
{


// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;
//************************************************************************************************


Chromebug.DomWindowContext = function(global, browser, chrome, persistedState)
{
    var tabContext = new Firebug.TabContext(global, browser, Firebug.chrome, persistedState);
    for (var n in tabContext)
    {
         if (typeof(this[n]) != 'function')
             this[n] = tabContext[n];
    }

    this.isChromebug = true;
    this.loaded = true;
    this.detached = window;  // the window containing firebug for the context is chromebug window
    this.originalChrome = null;


    this.global = global;

    if (global instanceof Ci.nsIDOMWindow)
    {
        this.window = global;
        var id = FBL.getWindowId(global);
        this.setName(safeGetWindowLocation(global)+"("+id.outer+","+id.inner+")")
    }
    else
    {
        delete this.window;
        if (global && global.location)
            var name = global.location; // special case for jetpack
        else if (global)
            var name = Firebug.Rep.getTitle(global);
        else
            var name ="mystery";

        if (name == "Sandbox")
        {
            if (browser.currentURI.spec)
            {
                var parts = browser.currentURI.spec.split('/');
                name += '/'+ parts.splice(-3).join('/');
                this.setName(browser.currentURI.spec);
            }
            else
                name += '/'+ browser.currentURI;
        }
        else
        {
            this.setName("noWindow://"+name);
        }
    }

    var persistedState = FBL.getPersistedState(this, "script");
    if (!persistedState.enabled)  // for now default all chromebug window to enabled.
        persistedState.enabled = "enable";

    if (FBTrace.DBG_CHROMEBUG)
        FBTrace.sysout("Chromebug.domWindowContext "+(this.window?"has window ":" no window ")+(this.global?" ":"NULL global ")+" and name "+this.getName(), {global: this.global, window: this.window});
}

Chromebug.DomWindowContext.prototype = FBL.extend(Firebug.TabContext.prototype,
{
    setName: function(name)
    {
        this.name = new String(name);
    },

    clearName: function()
    {
        delete this.name;
    },

    getGlobalScope: function()
    {
        return this.global;  // override Firebug's getGlobalScope; same iff global == domWindow
    },
    // *************************************************************************************************

    loadHandler: function(event)  // this is bound to a XULWindow's outerDOMWindow (only)
    {
        // We've just loaded all of the content for an outer nsIDOMWindow for a XUL window. We need to create a context for it.
        var outerDOMWindow = event.currentTarget; //Reference to the currently registered target for the event.
        var domWindow = event.target.defaultView;

        if (domWindow == outerDOMWindow)
        {
            var oldName = this.getName();
            this.clearName(); // remove the cache

            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("context.domWindowWatcher found outerDOMWindow "+outerDOMWindow.location+" tried context rename: "+oldName+" -> "+this.getName());
            return;
        }

        if (FBTrace.DBG_CHROMEBUG)
            FBTrace.sysout("context.domWindowWatcher, new "+Chromebug.XULAppModule.getDocumentTypeByDOMWindow(domWindow)+" window "+safeGetWindowLocation(domWindow)+" in outerDOMWindow "+ outerDOMWindow.location+" event.orginalTarget: "+event.originalTarget.documentURI);

        var context = Firebug.Chromebug.getContextByGlobal(domWindow);
        if (context)
        {
            // then we had one, say from a Frame
            var oldName = context.getName();
            this.clearName();  // remove name cache
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("ChromebugPanel.domWindowWatcher found context with id="+context.uid+" and outerDOMWindow.location.href="+outerDOMWindow.location.href+"\n");
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("ChromebugPanel.domWindowWatcher rename context with id="+context.uid+" from "+oldName+" to "+context.getName()+"\n");
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("loadHandler found context with sourceFileMap ", context.sourceFileMap);
        }
        else
        {
            var context = Firebug.Chromebug.getOrCreateContext(domWindow, safeGetWindowLocation(domWindow)); // subwindow

            if (!context.onUnload)
                context.onUnload = FBL.bind(context.unloadHandler, context)
            domWindow.addEventListener("unload", context.onUnload, true);

            if (FBTrace.DBG_CHROMEBUG) FBTrace.sysout("ChromebugPanel.domWindowWatcher created context with id="+context.uid+" and outerDOMWindow.location.href="+outerDOMWindow.location.href+"\n");
        }
    },

    unloadHandler: function(event)
    {
        try
        {
            //FBTrace.sysout("DOMWindowContext.unLoadHandler event.currentTarget.location: "+event.currentTarget.location, event);
            var outerDOMWindow = event.currentTarget; //Reference to the currently registered target for the event.
            var domWindow = event.target.defaultView;

            if (!domWindow)
            {
                FBTrace.sysout("Chromebug unloadHandler found no DOMWindow for event.target", event.target);
                return;
            }

            if (! domWindow instanceof Ci.nsIDOMWindow)
            {
                FBTrace.sysout("Chromebug unloadHandler domWindow not nsIDOMWindow event.currentTarget.location"+event.currentTarget.location, domWindow);
                return;
            }

            var context = Firebug.Chromebug.getContextByGlobal(domWindow);
            if (context)
            {
                if (domWindow == outerDOMWindow)
                {
                    FBTrace.sysout("Firebug.Chromebug.unloadHandler found outerDOMWindow with id="+context.uid+" name " +context.getName()+" and domWindow.location.href="+domWindow.location.href+"\n");
                    /*var xul_win = Chromebug.XULAppModule.getXULWindowByRootDOMWindow(outerDOMWindow);

                    Chromebug.XULAppModule.addCloser(xul_win, function delayUntilOnCloseWindow()
                    {
                        Firebug.TabWatcher.unwatchTopWindow(domWindow);
                    });
                    */
                }
                else
                {
                    FBTrace.sysout("Firebug.Chromebug.unloadHandler found context with id="+context.uid+" name " +context.getName()+" and domWindow.location.href="+domWindow.location.href+"\n");
                    Firebug.TabWatcher.unwatchTopWindow(domWindow);
                }

            }
            else
            {
                // Seems like the outer XUL window DOMWindow is cleaned up by onCloseWindow in xulapp
                FBTrace.sysout("Chromebug unloadHandler found no context for domWindow:"+domWindow.location);
            }
        }
        catch(exc)
        {
            if (FBTrace)
                FBTrace.sysout("domwindowContext.unloadHandler FAILS "+exc, exc);
        }
    },

});

return Chromebug.DomWindowContext;
});
