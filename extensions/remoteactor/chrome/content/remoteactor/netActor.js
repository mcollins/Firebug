/* See license.txt for terms of usage */

// ********************************************************************************************* //
// Globals

// ID generator
var gSerialNumber = 0;

try
{
    Components.utils["import"]("resource://remoteactor/trace.js");
    Components.utils["import"]("resource://remoteactor/lib.js");
    Components.utils["import"]("resource://remoteactor/networkProgress.js");
}
catch (err)
{
    FBTrace.sysout("EXCEPTION " + err, err);
}

// ********************************************************************************************* //
// Network Monitor Actor Implementation

function NetworkMonitorActor(tab)
{
    this.conn = tab.conn;
    this.tab = tab;
    this.serial = gSerialNumber++;
    this.networkMonitor = null;

    FBTrace.sysout("networkMonitorActor.constructor; " + this.serial + ", " + this.conn);
}

NetworkMonitorActor.prototype =
{
    actorPrefix: "networkMonitor",

    grip: function()
    {
        FBTrace.sysout("networkMonitorActor.grip " + this.actorID + ", " + this.serial);

        return {
            actor: this.actorID,
            serial: this.serial
        };
    },

    onPing: function(request)
    {
        FBTrace.sysout("networkMonitorActor.onPing ", request);
        return {"pong": this.serial};
    },

    onSubscribe: function(request)
    {
        FBTrace.sysout("networkMonitorActor.onSubscribe;", request);

        if (this.networkMonitor)
        {
            FBTrace.sysout("networkMonitorActor.onSubscribe; ERROR Already subscribed",
                this.networkMonitor);
        }

        try
        {
            var callback = Lib.bind(this.onFlushData, this);
            this.networkProgress = new NetworkProgress();
            this.networkProgress.initialize(this.tab._browser._contentWindow, callback);
        }
        catch (err)
        {
            FBTrace.sysout("networkMonitorActor.onSubscribe; EXCEPTION " + err, err);
        }

        return {"subscribe": this.serial};
    },

    onUnsubscribe: function(request)
    {
        FBTrace.sysout("networkMonitorActor.onUnsubscribe;", request);

        if (this.networkProgress)
        {
            this.networkProgress.destroy();
            this.networkProgress = null;
        }

        return {"unsubscribe": this.serial};
    },

    disconnect: function()
    {
        FBTrace.sysout("networkMonitorActor.disconnet");

        this.onUnsubscribe();

        delete this.tab.networkMonitorActor;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Network Monitor

    onFlushData: function(data)
    {
        FBTrace.sysout("networkMonitorActor.onFlushData;", data);

        var packet = {
            "type": "notify",
            "from": this.actorID,
            "serial": this.serial,
            "files": data
        };

        // Send network notification.
        this.conn.send(packet);
    }
};

/**
 * Request type definitions.
 */
NetworkMonitorActor.prototype.requestTypes =
{
    "ping": NetworkMonitorActor.prototype.onPing,
    "subscribe": NetworkMonitorActor.prototype.onSubscribe,
    "unsubscribe": NetworkMonitorActor.prototype.onUnsubscribe
};

// ********************************************************************************************* //
// Network Monitor Actor Handler

function networkMonitorActorHandler(tab, request)
{
    FBTrace.sysout("networkMonitorActorHandler ", {tab: tab, request: request});

    // Reuse a previously-created actor, if any.
    if (tab.sampleContextActor)
        return tab.sampleContextActor;


    var actor = new NetworkMonitorActor(tab);
    tab.networkMonitorActor = actor;
    tab.contextActorPool.addActor(actor);

    FBTrace.sysout("networkMonitorActor created for tab: " + tab);

    return actor.grip();
}

DebuggerServer.addTabRequest("networkMonitorActor", networkMonitorActorHandler);

// ********************************************************************************************* //
