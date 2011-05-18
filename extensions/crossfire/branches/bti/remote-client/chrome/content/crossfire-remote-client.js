/* See license.txt for terms of usage */
try {
    Components.utils.import("resource://firebug/firebug-trace-service.js");
    FBTrace = traceConsoleService.getTracer("extensions.firebug");
} catch(ex) {
    FBTrace = {};
}

var CrossfireRemote = {};

var crossfireToolList = document.getElementById("crossfireToolList");
CrossfireRemote.toolList = {

    getCurrentLocation: function() {
        return crossfireToolList.repObject;
    },

    setCurrentLocation: function( loc) {
        crossfireToolList.location = loc;
    },

    getLocationList: function() {
        return CrossfireRemote.Tool.tools;
    },

    getDefaultLocation: function() {

    },

    setDefaultLocation: function( loc) {

    },

    getObjectLocation: function( obj) {
        return obj.toolName
    },

    getObjectDescription: function( obj) {
        if (obj) {
            return {path: obj.toolName, name: obj.toolName};
        }
    },

    onSelectLocation: function( evt) {

    },

    onPopupShown: function( evt) {

    }

};

var crossfireContextsList = document.getElementById("crossfireContextsList");
CrossfireRemote.contextsList = {

    getCurrentLocation: function() {
        return crossfireContextsList.repObject
    },

    setCurrentLocation: function( loc) {
        crossfireContextsList.location = loc;
    },

    getLocationList: function() {
        return CrossfireRemote.Tool.contexts;
    },

    getDefaultLocation: function() {
        return null;
    },

    setDefaultLocation: function( loc) {

    },

    getObjectLocation: function( obj) {
        return obj.href;
    },

    getObjectDescription: function( obj) {
        if (obj == null) {
            return "No contexts";
        } else if (obj.href) {
            return { path: obj.href, name: obj.href };
        }
    },

    onSelectLocation: function( evt) {
        FBTrace.sysout("**** onSelectLocation", evt);
        // need to get context here

        FBL.dispatch(this.fbListeners, "showContext", [browser, context]); // context is null if we don't want to debug this browser


    },

    onPopupShown: function( evt) {
        FBTrace.sysout("***** onPopupShown");
    }
};



CrossfireRemote.toolListLocator = function(xul_element) {
    var list = CrossfireRemote.toolList;
    if (!list.elementBoundTo)
    {
        list.elementBoundTo = xul_element;
        xul_element.addEventListener("selectObject", FBL.bind(list.onSelectLocation, list), false);
        if (list.onPopUpShown)
            xul_element.addEventListener("popupshown", FBL.bind(list.onPopUpShown, list), false);
    }
    return list;
};

CrossfireRemote.contextsListLocator = function(xul_element) {
    var list = CrossfireRemote.contextsList;
    if (!list.elementBoundTo)
    {
        list.elementBoundTo = xul_element;
        xul_element.addEventListener("selectObject", FBL.bind(list.onSelectLocation, list), false);
        if (list.onPopUpShown)
            xul_element.addEventListener("popupshown", FBL.bind(list.onPopUpShown, list), false);
    }
    return list;
};

// override default Firebug architecture for module loader
//FirebugLoadManager.arch = "remoteClient";

// wait for onload so that FBL and modules are loaded into window
addEventListener("load", function() {


}, false);




