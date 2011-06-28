/* See license.txt for terms of usage */

define([
        "firebug/lib/object",
        "firebug/lib/events",
        "firebug/firebug",
        "firebug/chrome/tabContext",
        "firebug/js/tabCache"],
        function ( Obj, Events, Firebug, TabContext, TabCache) {

        function Context( contextId, webApp) {
            this.contextId = contextId;
            this.webApp = webApp;
            this.compilationUnits = {};
            this.name = "FakeContext";

            // from TabContext
            this.panelMap = {};
            this.sidePanelNames = {};
            this.sourceCache = new Firebug.TabCache(this);
        }

        Context.prototype = TabContext.prototype;

        return Context;
});