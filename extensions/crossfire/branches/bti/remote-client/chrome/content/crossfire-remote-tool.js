/* See license.txt for terms of usage */

define(["firebug/lib",
        "crossfireModules/crossfire"],
        function factoryRemoteTool(FBL, CrossfireModule) {

        var RemoteTool = {
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

        CrossfireModule.registerTool("RemoteClient", RemoteTool);

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


        return RemoteTool;
});