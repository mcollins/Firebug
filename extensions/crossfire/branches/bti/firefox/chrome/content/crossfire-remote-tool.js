/* See license.txt for terms of usage */

define(["firebug/lib",
        "crossfireModules/crossfire"],
        function factoryRemoteTool(FBL, CrossfireModule) {

        function RemoteTool() {
            CrossfireModule.registerTool("RemoteTool", this);
        }
        RemoteTool.prototype = {
            //FIXME: we need to be 'all' to hear the listcontexts response
            toolName: "all",
            commands: [],
            events: [],

            contexts: [],
            tools: [],

            handleRequest: function( request) {

            },

            supportsEvent: function( event) {
                return true;
            },

            // xxxMcollins this should really be handleEvent, but we're cheating
            fireEvent: function(event) {
                var eventName = event.event;
                if (eventName == "onContextCreated") {
                    this.contexts.push(event.data);
                } else if (eventName == "onContextDestroyed") {
                    for (var i = 0; i < this.contexts.length; i++) {
                        if (this.contexts[i].context_id == event.context_id) {
                            this.contexts.splice(i, 1);
                        }
                    }
                }
            },

            supportsResponse: function( response) {
                if (response.command == "listcontexts") return true;
            },

            handleResponse: function( response) {
                if (FBTrace.DBG_CROSSFIRE_REMOTE)
                    FBTrace.sysout("CrossfireRemote Tool handleResponse");
                var body = response.body;
                if (response.command == "listcontexts") {
                    if (FBTrace.DBG_CROSSFIRE_REMOTE)
                        FBTrace.sysout("CrossfireRemote Tool got contexts => " + body.contexts);
                    this.contexts = body.contexts;
                } else if (response.command == "gettools") {
                    if (FBTrace.DBG_CROSSFIRE_REMOTE)
                        FBTrace.sysout("CrossfireRemote Tool got tools => " + body.tools);
                    this.tools = body.tools;
                }
            },

            onConnectionStatusChanged: function( status) {
                this.status = status;
                FBTrace.sysout(this.toolName +" status changed "+status);
                if (status == "connected_client") {
                    this.transport.sendRequest("gettools", {}, "RemoteClient");
                }
            },

            onRegistered: function() {
                FBTrace.sysout(this.toolName +" onRegistered ");
            },

            onUnregistered: function() {
                FBTrace.sysout(this.toolName +" onUnRegistered ");
            },

            onTransportCreated: function( transport) {
                if (FBTrace.DBG_CROSSFIRE_TOOLS)
                    FBTrace.sysout("onTransportCreated recieved by: " + this.toolName);
                this.transport = transport;
                this.transport.addListener(this);
            },

            onTransportDestroyed: function() {

            }
        };

        return RemoteTool;
});