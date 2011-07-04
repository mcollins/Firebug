/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ********************************************************************************************* //
// Globals

// Namespace of the entire extension. To properly define the namespace fro all the
// other object, this file must be loaded first.
Firebug.RemoteBug = {};

// ********************************************************************************************* //
// Module

/**
 * @module
 */
Firebug.RemoteBug.Module = extend(Firebug.Module,
/** @lends Firebug.RemoteBug.Module */
{
    currentTab: null,

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Initialization

    initialize: function()
    {
        Firebug.Module.initialize.apply(this, arguments);

        Firebug.TraceModule.addListener(TraceListener);

        if (FBTrace.DBG_REMOTEBUG)
            FBTrace.sysout("remotebug; RemoteNetModule.initialize");

        var onConnect = FBL.bind(this.onConnect, this);
        var onDisconnect = FBL.bind(this.onDisconnect, this);

        // Create connection.
        this.connection = new Firebug.RemoteBug.Connection(onConnect, onDisconnect);

        // Connect by default
        this.connect();
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        Firebug.TraceModule.removeListener(this);

        this.disconnect();
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Server Connection

    isConnected: function()
    {
        return (this.connection && this.connection.isConnected());
    },

    connect: function()
    {
        if (this.isConnected())
            return;

        // Connect remote server
        var host = Firebug.getPref(Firebug.prefDomain, "remotebug.serverHost");
        var port = Firebug.getPref(Firebug.prefDomain, "remotebug.serverPort");

        if (FBTrace.DBG_REMOTEBUG)
            FBTrace.sysout("remotebug; Connecting to " + host + ":" + port + " ...");

        try
        {
            this.connection.open(host, port);
        }
        catch (err)
        {
            if (FBTrace.DBG_REMOTEBUG || FBTrace.DBG_ERRORS)
                FBTrace.sysout("remotebug; connect EXCEPTION " + err, err);
        }
    },

    disconnect: function()
    {
        if (!this.isConnected())
            return;

        try
        {
            this.connection.close();
        }
        catch(err)
        {
            if (FBTrace.DBG_REMOTEBUG || FBTrace.DBG_ERRORS)
                FBTrace.sysout("remotebug; disconnect EXCEPTION " + err, err);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Connection hooks

    onConnect: function()
    {
        if (FBTrace.DBG_REMOTEBUG)
            FBTrace.sysout("remotebug; Connected OK");

        FBL.dispatch(this.fbListeners, "onConnect");
    },

    onDisconnect: function()
    {
        if (FBTrace.DBG_REMOTEBUG)
            FBTrace.sysout("remotebug; Disconnected");

        this.currentTab = null;

        FBL.dispatch(this.fbListeners, "onDisconnect");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Remote Tabs

    getTabList: function(callback)
    {
        if (this.isConnected())
            this.connection.sendPacket("root", "listTabs", true, callback);
    },

    selectTab: function(tab)
    {
        if (!this.isConnected())
            return;

        if (FBTrace.DBG_REMOTEBUG)
            FBTrace.sysout("remotebug; Selected remote tab: " + tab.title, tab);

        var self = this;
        this.connection.sendPacket(tab.actor, "attach", true, function(packet)
        {
            if (FBTrace.DBG_REMOTEBUG)
                FBTrace.sysout("remotebug; Remote tab selected: " + packet.from, packet);

            self.currentTab = tab;

            FBL.dispatch(self.fbListeners, "onTabSelected", [tab.actor]);
        });
    },

    getCurrentTab: function()
    {
        return this.currentTab;
    },

    getCurrentTabActor: function()
    {
        return this.currentTab ? this.currentTab.actor : null;
    }
});

// ********************************************************************************************* //
// Tracing Console Listener

var TraceListener =
{
    onLoadConsole: function(win, rootNode)
    {
        FBL.appendStylesheet(rootNode.ownerDocument, "chrome://remotebug/skin/remoteBug.css");
    },

    onDump: function(message)
    {
        var index = message.text.indexOf("remotebug;");
        if (index == 0)
        {
            message.text = message.text.substr("remotebug;".length);
            message.text = trim(message.text);
            message.type = "DBG_REMOTEBUG";
        }
    },
}

// ********************************************************************************************* //
// Registration

Firebug.registerModule(Firebug.RemoteBug.Module);
Firebug.registerStylesheet("chrome://remotebug/skin/remoteBug.css");

// ********************************************************************************************* //
}});
