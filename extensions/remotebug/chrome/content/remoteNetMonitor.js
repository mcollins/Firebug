/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ********************************************************************************************* //
// Globals

// ********************************************************************************************* //
// Module

/**
 * @module
 */
Firebug.RemoteBug.NetMonitor = extend(Firebug.Module,
/** @lends Firebug.RemoteBug.NetMonitor */
{
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Initialization

    initialize: function()
    {
        Firebug.Module.initialize.apply(this, arguments);

        Firebug.RemoteBug.Module.addListener(this);
        Firebug.TraceModule.addListener(TraceListener);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        Firebug.RemoteBug.Module.removeListener(this);
        Firebug.TraceModule.removeListener(this);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Remote Protocol API

    getConnection: function()
    {
        return Firebug.RemoteBug.Module.connection;
    },

    getNetActor: function(tabActor, callback)
    {
        var conn = this.getConnection();
        conn.sendPacket(tabActor, "networkMonitorActor", true, callback);
    },

    subscribe: function(netActor, callback)
    {
        if (this.currentSubscription)
            this.unsubscribe(this.currentSubscription);

        var conn = this.getConnection();
        conn.sendPacket(netActor, "subscribe", false, callback);
        this.currentSubscription = netActor;
    },

    unsubscribe: function(netActor)
    {
        var conn = this.getConnection();
        conn.removeCallback(netActor);
        conn.sendPacket(netActor, "unsubscribe", true, function(packet)
        {
            if (FBTrace.DBG_REMOTENETMONITOR)
                FBTrace.sysout("remotenet; Unsubscribed from: " + packet.from);
            return;
        });
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // RemoteBug.Module Listener

    /**
     * Executed by RemoteBug.Module if a remote tab is selected.
     * @param {Object} tab The selcted tab descriptor
     */
    onTabSelected: function(tabActor)
    {
        if (!Firebug.NetMonitor.isAlwaysEnabled())
            return;

        var self = this;
        var callback = FBL.bind(this.onNetworkEvent, this);

        // A tab has been selected so, subscribe to the Net monitor actor. The callback
        // will receive events about any HTTP traffic within the target tab.
        this.getNetActor(tabActor, function(packet)
        {
            self.subscribe(packet.actor, callback);
        });
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // NetActor Events

    onNetworkEvent: function(packet)
    {
        if (packet.subscribe)
        {
            if (FBTrace.DBG_REMOTENETMONITOR)
                FBTrace.sysout("remotenet; Subscribed to: " + packet.from);
            return;
        }

        if (packet.type != "notify")
            return;

        if (FBTrace.DBG_REMOTENETMONITOR)
            FBTrace.sysout("remotenet; HTTP activity received from: " + packet.from, packet);

        var context = Firebug.currentContext;
        if (!context)
            return;

        var netPanel = context.getPanel("net", true);
        if (!netPanel)
            return;

        for (var i=0; i<packet.files.length; i++)
        {
            var file = packet.files[i];
            netPanel.updateFile(file);
        }
    }
});

// ********************************************************************************************* //
// Tracing Console Listener

var TraceListener =
{
    onLoadConsole: function(win, rootNode)
    {
        FBL.appendStylesheet(rootNode.ownerDocument, "chrome://remotebug/skin/remoteNetMonitor.css");
    },

    onDump: function(message)
    {
        var index = message.text.indexOf("remotenet;");
        if (index == 0)
        {
            message.text = message.text.substr("remotenet;".length);
            message.text = trim(message.text);
            message.type = "DBG_REMOTENETMONITOR";
        }
    },
}

// ********************************************************************************************* //
// Registration

Firebug.registerModule(Firebug.RemoteBug.NetMonitor);

// ********************************************************************************************* //
}});
