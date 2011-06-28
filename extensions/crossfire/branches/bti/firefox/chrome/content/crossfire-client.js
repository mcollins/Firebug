/* See license.txt for terms of usage */

define([
        "firebug/lib/object",
        "firebug/lib/events",
        "firebug/firebug",
        "crossfireModules/crossfire",
        "crossfireModules/crossfire-status"],
        function ( Obj, Events, Firebug, CrossfireModule, CrossfireStatus) {

    function CrossfireClient( toolsInterface) {
        this.toolsInterface = toolsInterface;
        this.contexts = {};
        this.listeners = [];
    }
    /**
     * @name CrossfireClient
     * @description Firebug Module for Client-side Crossfire functions.
     */
    CrossfireClient.prototype = Obj.extend(Firebug.Module, {

        dispatchName: "CrossfireClient",
        toolName: "all", // receive all packets, regardless of 'tool' header
        responseListeners: {},

        /**
         * @name initialize
         * @description Initializes Crossfire
         * @function
         * @private
         * @memberOf CrossfireModule
         * @extends Firebug.Module
         */
        initialize: function() {
            var host, port;
            /*
            var commandLine = Components.classes["@almaden.ibm.com/crossfire/command-line-handler;1"].getService().wrappedJSObject;
            host = commandLine.getHost();
            port = commandLine.getPort();

            if (host && port) {
                this.connectClient(host, port);
            }
            */
        },


        /**
         * @name connectClient
         * @description Attempts to connect to remote host/port
         * @function
         * @public
         * @memberOf CrossfireModule
         * @param {String} host the remote host name.
         * @param {Number} port the remote port number.
         */
        connectClient: function(host, port) {
            if (FBTrace.DBG_CROSSFIRE_CLIENT) {
                FBTrace.sysout("CROSSFIRE connect: host => " + host + " port => " + port);
            }

            this.host = host;
            this.port = port;
            try {
                this.transport = CrossfireModule.getClientTransport();
                this.transport.addListener(this);
                this.transport.open(host, port);
            }
            catch(e) {
                if (FBTrace.DBG_CROSSFIRE_CLIENT) FBTrace.sysout(e);
            }
        },

        /**
         * @name onConnectionStatusChanged
         * @description Called when the status of the transport's connection changes.
         * @function
         * @public
         * @memberOf CrossfireModule
         * @param {String} status the status to report
         */
        onConnectionStatusChanged: function( status) {
            if (status == CrossfireStatus.STATUS_CONNECTED_CLIENT) {
                //FIXME: can we dispatch this?
                this.onActivateTool("script", true); //Force script panel on
            }
        },

        /**
         * @name fireEvent
         * @function
         * @description Listens for events from Crossfire socket,
         * and dispatch them to BTI calls.
         */
        fireEvent: function(event)
        {
            var eventName = event.event,
                data = event.data,
                context,
                contextId,// = event.contextId || data.contextId,
                selectedWebApp,
                script,
                toolsInterface = this.toolsInterface,
                self = this;

            if (FBTrace.DBG_CROSSFIRE_CLIENT)
                FBTrace.sysout("CrossfireClient fireEvent: " + eventName, event);

            if (eventName == "onContextCreated") {
                contextId = data.contextId;
                selectedWebApp = toolsInterface.browser.getCurrentSelectedWebApp(function( selectedWebApp) {
                    if (FBTrace.DBG_CROSSFIRE_CLIENT)
                        FBTrace.sysout("CrossfireClient creating context for webApp: " + selectedWebApp, selectedWebApp);
                    //toolsInterface.browser.getOrCreateContextByWebApp(selectedWebApp, contextId, function( context) {
                        context = selectedWebApp.context;
                        self.contexts[contextId] = context;

                        //xxxMcollins: from TabwatcherListener.initContext...
                        Events.dispatch(Firebug.modules, "initContext", [context]);
                        Firebug.chrome.setFirebugContext(context); // a newly created context becomes the default for the view
                        Firebug.connection.toggleResume(context); // a newly created context is active


                        //toolsInterface.browser.dispatch()
                   // });
                });
            } else if (eventName == "onContextLoaded") {
                contextId = data.contextId;
                context = this.contexts[contextId];
                Events.dispatch(Firebug.modules, "loadedContext", [context]);
            } else if (eventName == "onScript") {
                contextId = event.contextId;
                context = this.contexts[contextId];
                script = data.script;
                FBTrace.sysout("*.*.* CrossfireClient onScript contextId is: " + contextId, {"context": context, "contexts": this.contexts});
                //FIXME: process script kind correctly
                toolsInterface.browser.dispatch("onCompilationUnit", [context, script.url, toolsInterface.CompilationUnit.SCRIPT_TAG]);
            }
        },

        handleResponse: function( response) {
            if (FBTrace.DBG_CROSSFIRE_CLIENT)
                FBTrace.sysout("CrossfireClient handleResponse => " + response, response);

            var responseListener = this.responseListeners[response.seq];
            if (responseListener) {
                if (FBTrace.DBG_CROSSFIRE_CLIENT)
                    FBTrace.sysout("CrossfireClient handleResponse found listener => " + responseListener, responseListener);
                responseListener.apply({},[response]);
                delete this.responseListeners[response.seq];
            }
        },

        _sendCommand: function( command, data, callback) {
            var requestSeq = this.transport.sendRequest(command, data);
            if (FBTrace.DBG_CROSSFIRE_CLIENT)
                FBTrace.sysout("CrossfireClient _sendCommand: " + command + " got requestSeq: " + requestSeq, {"data":data});
            this.responseListeners[requestSeq] = callback;
        },

        // tools
        enableTool: function( toolName) {
            this._sendCommand("enableTool", {"toolName":toolName});
        },

        disableTool: function( toolName) {
            this._sendCommand("disableTool", {"toolName":toolName});
        },

        // ----- BTI/Crossfire-ish things -----
        getBrowserContexts: function() {
            this._sendCommand("listcontexts");
        },

        // Events

        /**
         * @name onActivateTool
         * @description A previously enabled tool becomes active and sends us an event.
         */
        onActivateTool : function(toolname, active)
        {
            if (FBTrace.DBG_CROSSFIRE_CLIENT)
                FBTrace.sysout("CrossfireClient onActivateTool");

            if (FBTrace.DBG_ACTIVATION)
                FBTrace.sysout("onActivateTool "+toolname+" = "+active);

            if (toolname === 'script')
            {
                //FIXME:
                Firebug.ScriptPanel.prototype.onJavaScriptDebugging(active);
                this.toolsInterface.browser.eachContext(function refresh(context)
                {
                    context.invalidatePanels('script');
                });
            }

        },

        /**
         * @name onStartDebugging
         */
        onStartDebugging : function(context, frame)
        {
            if (FBTrace.DBG_CROSSFIRE_CLIENT)
                FBTrace.sysout("CrossfireClient onStartDebugging");
            /*
            Firebug.selectContext(context);
            var panel = Firebug.chrome.selectPanel("script");
            panel.onStartDebugging(frame);
            */
        },

        /**
         * @name onStopDebugging
         */
        onStopDebugging : function(context)
        {
            if (FBTrace.DBG_CROSSFIRE_CLIENT)
                FBTrace.sysout("CrossfireClient onStopDebugging");
            /*
            var panel = context.getPanel("script", true);
            if (panel && panel === Firebug.chrome.getSelectedPanel())  // then we are looking at the script panel
                panel.showNoStackFrame(); // unhighlight and remove toolbar-status line

            if (panel)
            {
                panel.onStopDebugging();

            }
            */
        }

    });

    // register module
    Firebug.registerModule(CrossfireClient);

    return CrossfireClient;
});