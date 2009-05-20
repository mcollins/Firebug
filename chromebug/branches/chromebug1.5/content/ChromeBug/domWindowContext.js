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

});


}});
