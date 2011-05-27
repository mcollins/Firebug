/* See license.txt for terms of usage */

// ********************************************************************************************* //
// Constants

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

// ********************************************************************************************* //
// Firefox Bootstrap API

function startup(data, reason)
{
    try
    {
        FirebugManager.init(data, reason);
    }
    catch (exc)
    {
        Cu.reportError("Firebug Bootstrap; bootstrap.startup ERROR " + exc);
    }
}

function shutdown(data, reason)
{
    try
    {
        FirebugManager.shutdown(data, reason);
    }
    catch (exc)
    {
        Cu.reportError("Firebug Bootstrap; bootstrap.shutdown ERROR " + exc);
    }
}

function install(aData, aReason)
{
}

function uninstall(aData, aReason)
{
}

// ********************************************************************************************* //
// Firebug Boostrap API

var extensionName = "helloworld";

var FirebugManager =
{
    init: function(data, reason)
    {
        registerPackageAlias(data.installPath, extensionName, "chrome");

        var windowTracker = new WindowTracker(this);
    },

    shutdown: function()
    {
        unregisterPackageAlias(extensionName, "chrome");
    },

    onTrack: function onTrack(win)
    {
        if (!this.isFirebugWindow(win))
            return;

        var config = win.Firebug.getModuleLoaderConfig();
        config.paths[extensionName] = extensionName + "/content";

        // Load main.js module (the entry point of the extension).
        win.require(config, [
            "firebug/lib/trace",
            extensionName + "/main"
        ],
        function(FBTrace, Extension)
        {
            try
            {
                Extension.initialize();

                if (FBTrace.DBG_INITIALIZE)
                    FBTrace.sysout("Firebug Bootstrap; Extension '" + extensionName + "' loaded!");
            }
            catch (err)
            {
                if (FBTrace.DBG_ERRORS)
                    FBTrace.sysout("Firebug Bootstrap; ERROR " + err);
            }

            // Make sure any new panels immediately appears.
            if (win.Firebug.currentContext)
                win.Firebug.chrome.syncMainPanels();
        });
    },

    onUntrack: function onUntrack(win)
    {
        if (!this.isFirebugWindow(win))
            return;

        //xxxHonza: TODO
    },

    isFirebugWindow: function isFirebugWindow(win)
    {
        var winType = win.document.documentElement.getAttribute("windowtype");
        return winType === "navigator:browser" && win.Firebug;
    }
}

// ********************************************************************************************* //
// Window Tracker

var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);

function iterateWindows(callback)
{
    var iter = ww.getWindowEnumerator();
    while (iter.hasMoreElements())
        callback(iter.getNext().QueryInterface(Ci.nsIDOMWindow));
};

function WindowTracker(delegate)
{
    this.delegate = delegate;
    this.loadingWindows = [];

    var self = this;
    iterateWindows(function(win) {
        self.regWindow(win);
    })

    ww.registerNotification(this);
};

WindowTracker.prototype =
{
    regLoadingWindow: function regLoadingWindow(win)
    {
        this.loadingWindows.push(win);
        win.addEventListener("load", this, true);
    },

    unregLoadingWindow: function unregLoadingWindow(win)
    {
        var index = this.loadingWindows.indexOf(win);
        if (index != -1)
        {
            this.loadingWindows.splice(index, 1);
            win.removeEventListener("load", this, true);
        }
    },

    regWindow: function regWindow(win)
    {
        if (win.document.readyState == "complete")
        {
            this.unregLoadingWindow(win);
            this.delegate.onTrack(win);
        }
        else
            this.regLoadingWindow(win);
    },

    unregWindow: function unregWindow(win)
    {
        if (window.document.readyState == "complete")
            this.delegate.onUntrack(win);
        else
            this.unregLoadingWindow(win);
    },

    unload: function unload()
    {
        ww.unregisterNotification(this);
        var self = this;
        iterateWindows(function(win)
        {
            self.unregWindow(win);
        });
    },

    handleEvent: function handleEvent(event)
    {
        if (event.type == "load" && event.target)
        {
            var win = event.target.defaultView;
            if (win)
                this.regWindow(win);
        }
    },

    observe: function observe(subject, topic, data)
    {
        var win = subject.QueryInterface(Ci.nsIDOMWindow);
        if (topic == "domwindowopened")
            this.regWindow(win);
        else
            this.unregWindow(win);
    }
};

// ********************************************************************************************* //
// Registering URI namesapce (resource:)

Components.utils["import"]("resource://gre/modules/Services.jsm");

function registerPackageAlias(installLocation, extensionID, packagePath)
{
    var resource = Services.io.getProtocolHandler("resource")
        .QueryInterface(Ci.nsIResProtocolHandler);

    var packageURL = getPackageURL(installLocation, packagePath);
    resource.setSubstitution(extensionID, packageURL);
}

function unregisterPackageAlias(scheme, extensionID, packagePath)
{
    var resource = Services.io.getProtocolHandler("resource")
        .QueryInterface(Ci.nsIResProtocolHandler);

    resource.setSubstitution(extensionID, null);
}

function getPackageURL(installLocation, packagePath)
{
    var location = installLocation.clone();

    // If the extension is currently packed witin XPI file, jar: scheme must be used.
    if (!installLocation.isDirectory())
    {
        var url = Cc["@mozilla.org/network/protocol;1?name=file"]
            .createInstance(Ci.nsIFileProtocolHandler)
            .getURLSpecFromFile(location);

        url += "!";

        location = Cc["@mozilla.org/network/protocol;1?name=file"]
            .createInstance(Ci.nsIFileProtocolHandler)
            .getFileFromURLSpec(url);
    }

    var parts = packagePath ? packagePath.split("/") : "";
    for (var p in parts)
        location.append(parts[p]);

    var resource = Services.io.getProtocolHandler("resource")
        .QueryInterface(Ci.nsIResProtocolHandler);

    var alias = Services.io.newFileURI(location);

    if (!installLocation.isDirectory())
        alias = Services.io.newURI("jar:" + alias.spec + "/", null, null);

    return alias;
}

// ********************************************************************************************* //
