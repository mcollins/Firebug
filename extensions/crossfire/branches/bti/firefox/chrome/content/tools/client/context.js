/* See license.txt for terms of usage */

define([
        "firebug/lib/object",
        "firebug/lib/events",
        "firebug/firebug",
        "firebug/chrome/tabContext",
        "firebug/js/tabCache"],
        function ( Obj, Events, Firebug, TabContext, TabCache) {

        function Context( contextId, webApp, name) {
            this.contextId = contextId;
            this.webApp = webApp;
            this.name = name;

            this.compilationUnits = {};

            // from TabContext
            this.panelMap = {};
            this.sidePanelNames = {};
            this.sourceCache = new Firebug.TabCache(this);

            // hack because we don't have a browser
            this.browser = {};
        }

        Context.prototype = TabContext.prototype;

        return Context;
});