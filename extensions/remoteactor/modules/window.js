/* See license.txt for terms of usage */

// ********************************************************************************************* //
// Constants

var EXPORTED_SYMBOLS = ["Window"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;

var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

var Window = {};

// ********************************************************************************************* //
// API

Window.getWindowProxyIdForWindow = function(win)
{
    var id = Window.getWindowId(win).outerWindowID;
};

Window.getWindowId = function(win)
{
    var util = win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
    var innerWindowID = "(none)";

    try
    {
        var outerWindowID = util.outerWindowID;
        innerWindowID = util.currentInnerWindowID;
    }
    catch(exc)
    {
        // no - op
    }

    return {
        outer: outerWindowID,
        inner: innerWindowID,
        toString: function() {
            return this.outer+"."+this.inner;
        }
    };
};

Window.safeGetWindowLocation = function(window)
{
    try
    {
        if (window)
        {
            if (window.closed)
                return "(window.closed)";
            if ("location" in window)
                return window.location+"";
            else
                return "(no window.location)";
        }
        else
            return "(no context.window)";
    }
    catch (exc)
    {
        if (FBTrace.DBG_WINDOWS || FBTrace.DBG_ERRORS)
        {
            FBTrace.sysout("TabContext.getWindowLocation failed "+exc, exc);
            FBTrace.sysout("TabContext.getWindowLocation failed window:", window);
        }

        return "(getWindowLocation: "+exc+")";
    }
};

Window.getWindowForRequest = function(request)
{
    var loadContext = Window.getRequestLoadContext(request);
    try
    {
        if (loadContext)
            return loadContext.associatedWindow;
    }
    catch (ex)
    {
    }

    return null;
};

Window.getRequestLoadContext = function(request)
{
    try
    {
        if (request && request.notificationCallbacks)
        {
            return request.notificationCallbacks.getInterface(Ci.nsILoadContext);
        }
    }
    catch (exc)
    {
    }

    try
    {
        if (request && request.loadGroup && request.loadGroup.notificationCallbacks)
        {
            return request.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext);
        }
    }
    catch (exc)
    {
    }

    return null;
};

// ********************************************************************************************* //
