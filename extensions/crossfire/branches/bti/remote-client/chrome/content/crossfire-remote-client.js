/* See license.txt for terms of usage */
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

try {
    Cu.import("resource://firebug/firebug-trace-service.js");
    FBTrace = traceConsoleService.getTracer("extensions.firebug");
} catch(ex) {
    FBTrace = { sysout: function() { window.dump(arguments);}};
}

FBTrace.sysout("*.*.*.*.* LOADING crossfire-remote-client");

//wait for onload so that modules are loaded into window
addEventListener("load", function() {

var RemoteTool;
var crossfireRemoteTool;
var CrossfireUI;


window.CrossfireRemote = {

    doConnect: function() {
        if (!CrossfireUI) {
            try {
                CrossfireUI =  require("crossfireModules/crossfire-ui");
                CrossfireUI.connect();
            } catch (e) {
                FBTrace.sysout("Can't connect because of: " +e, e);
            }
        }
    },

    doRestart: function doRestart() {
        Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup).
        quit(Ci.nsIAppStartup.eRestart | Ci.nsIAppStartup.eAttemptQuit);
    },

    doQuit: function doQuit() {
        Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup).
        quit(Ci.nsIAppStartup.eForceQuit);
    }
};

//--------------------------------------

var crossfireToolList = document.getElementById("crossfireToolList");
CrossfireRemote.toolList = {

    getCurrentLocation: function() {
        return crossfireToolList.repObject;
    },

    setCurrentLocation: function( loc) {
        crossfireToolList.location = loc;
    },

    getLocationList: function() {
        if (!crossfireRemoteTool) {
            try {
                RemoteTool = require("crossfireModules/crossfire-remote-tool");
                crossfireRemoteTool = new RemoteTool();
            } catch (e) {
                FBTrace.sysout("Can't get Location List because of: " +e, e);
            }
        }
        else return crossfireRemoteTool.tools;
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
        if (!crossfireRemoteTool) {
            try {
                RemoteTool = require("crossfireModules/crossfire-remote-tool");
                crossfireRemoteTool = new RemoteTool();
            } catch (e) {
                FBTrace.sysout("Can't get Location List because of: " +e, e);
            }
        }
        else return crossfireRemoteTool.contexts;
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

        //FBL.dispatch(this.fbListeners, "showContext", [browser, context]); // context is null if we don't want to debug this browser


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
        xul_element.addEventListener("selectObject", function() { list.onSelectLocation() }, false);
        if (list.onPopUpShown)
            xul_element.addEventListener("popupshown", function() { list.onPopUpShown() }, false);
    }
    return list;
};

CrossfireRemote.contextsListLocator = function(xul_element) {
    var list = CrossfireRemote.contextsList;
    if (!list.elementBoundTo)
    {
        list.elementBoundTo = xul_element;
        xul_element.addEventListener("selectObject", function() { list.onSelectLocation() }, false);
        if (list.onPopUpShown)
            xul_element.addEventListener("popupshown", function() { list.onPopUpShown() }, false);
    }
    return list;
};


// end onload
}, false);
