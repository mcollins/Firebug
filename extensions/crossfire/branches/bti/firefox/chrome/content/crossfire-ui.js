/* See license.txt for terms of usage */

define(
        [ "firebug/lib",
          "firebug/ToolsInterface",
          "crossfireModules/crossfire",
          "crossfireModules/crossfire-status" ],
          function(FBL, ToolsInterface, CrossfireModule, CrossfireStatus) {

            // -----Crossfire UI functions -----
        var CrossfireUI = {

            /**
             * @name _updateStatus
             * @function
             * @description update Crossfire UI with current status.
             * @param {String} status The current crossfire status.
             */
            updateStatus : function( status) {
                this._updateStatusText(status);
                this._updateStatusIcon(status);
            },

            /**
             * @name _updateStatusIcon
             * @description Update the Crossfire connection status icon.
             * @function
             * @private
             * @param status the status to update the icon to
             */
            _updateStatusIcon: function _updateStatusIcon( status) {
                if (FBTrace.DBG_CROSSFIRE)
                    FBTrace.sysout("CROSSFIRE updateStatusIcon");
                with (FBL) {
                    var icon = $("crossfireIcon");
                    if (icon) {
                        if (status == CrossfireStatus.STATUS_CONNECTED_SERVER
                                || status == CrossfireStatus.STATUS_CONNECTED_CLIENT) {
                            setClass($("menu_connectCrossfireClient"), "hidden");
                            setClass($("menu_startCrossfireServer"), "hidden");

                            removeClass($("menu_disconnectCrossfire"), "hidden");

                            removeClass(icon, "disconnected");
                            removeClass(icon, "waiting");
                            setClass(icon, "connected");

                        } else if (status == CrossfireStatus.STATUS_WAIT_SERVER
                                /* TODO: create a separate icon state for 'connecting' */
                                || status == CrossfireStatus.STATUS_CONNECTING) {
                            setClass($("menu_connectCrossfireClient"), "hidden");
                            setClass($("menu_startCrossfireServer"), "hidden");

                            removeClass($("menu_disconnectCrossfire"), "hidden");

                            removeClass(icon, "disconnected");
                            removeClass(icon, "connected");
                            setClass(icon, "waiting");

                        } else { //we are disconnected if (status == CrossfireStatus.STATUS_DISCONNECTED) {
                            setClass($("menu_disconnectCrossfire"), "hidden");
                            removeClass($("menu_connectCrossfireClient"), "hidden");
                            removeClass($("menu_startCrossfireServer"), "hidden");

                            removeClass(icon, "connected");
                            removeClass(icon, "waiting");
                            setClass(icon, "disconnected");
                           }
                       }
                   }
            },

            /**
             * @name _updateStatusText
             * @description Updates the Crossfire status text
             * @function
             * @private
             * @param status the status to update the text to
             */
            _updateStatusText: function _updateStatusText( status) {
                if (FBTrace.DBG_CROSSFIRE)
                    FBTrace.sysout("CROSSFIRE updateStatusText: " + status);

                with (FBL) {
                    var icon = $("crossfireIcon");
                    if (icon) {
                        if (status == CrossfireStatus.STATUS_DISCONNECTED) {
                            $("crossfireIcon").setAttribute("tooltiptext", "Crossfire: disconnected.");
                        } else if (status == CrossfireStatus.STATUS_WAIT_SERVER) {
                            $("crossfireIcon").setAttribute("tooltiptext", "Crossfire: accepting connections on port " + CrossfireModule.serverTransport.port);
                        } else if (status == CrossfireStatus.STATUS_CONNECTING) {
                            $("crossfireIcon").setAttribute("tooltiptext", "Crossfire: connecting...");
                        } else if (status == CrossfireStatus.STATUS_CONNECTED_SERVER) {
                            $("crossfireIcon").setAttribute("tooltiptext", "Crossfire: connected to client on port " + CrossfireModule.serverTransport.port);
                        } else if (status == CrossfireStatus.STATUS_CONNECTED_CLIENT) {
                            $("crossfireIcon").setAttribute("tooltiptext", "Crossfire: connected to " + CrossfireModule.clientTransport.host + ":" + CrossfireModule.clientTransport.port);
                        }
                    }
                }
            },

        /*
         * @name setRunning
         * @description Update the Crossfire running status.
         * @function
         * @public
         * @memberOf CrossfireModule
         * @param isRunning the desired running state for Crossfire
         *
        setRunning: function( isRunning) {
            if (FBTrace.DBG_CROSSFIRE)
                FBTrace.sysout("CROSSFIRE setRunning", isRunning);
            var icon = FBL.$("crossfireIcon");
            if (icon) {
                if (isRunning) {
                     FBL.setClass(icon, "running");
                } else {
                     FBL.removeClass(icon, "running");
                }
            }
            this.running = isRunning;
        }
        */

            //----- Crossfire XUL Event Listeners -----
            /**
             * @name Crossfire.onStatusClick
             * @description Call-back for menu pop-up
             * @function
             * @public
             * @memberOf Crossfire
             * @param el
             */
            onStatusClick : function( el) {
                FBL.$("crossfireStatusMenu").openPopup(el, "before_end", 0,0,false,false);
            },

            /**
             * @name Crossfire.startServer
             * @description Delegate to {@link CrossfireModule#startServer(host, port)}
             * @function
             * @public
             * @memberOf Crossfire
             */
            startServer : function() {
                var params = _getDialogParams(true);
                window.openDialog("chrome://crossfire/content/connect-dialog.xul", "crossfire-connect","chrome,modal,dialog", params);
                if (params.host && params.port) {
                    ToolsInterface.crossfireServer.startServer(params.host, parseInt(params.port));
                }
            },

            /**
             * @name Crossfire.connect
             * @description Delegate to {@link CrossfireClient#connectClient(host, port)}
             * @function
             * @public
             * @memberOf Crossfire
             */
            connect : function() {
                var params = this._getDialogParams(false);
                window.openDialog("chrome://crossfire/content/connect-dialog.xul", "crossfire-connect","chrome,modal,dialog", params);
                if (params.host && params.port) {
                    ToolsInterface.crossfireClient.connectClient(params.host, parseInt(params.port));
                }
            },

            /**
             * @name Crossfire.disconnect
             * @description delegate to {@link CrossfireModule#disconnect()}
             * @function
             * @public
             * @memberOf Crossfire
             */
            disconnect : function() {
                CrossfireModule.disconnect();
            },

            /**
             * @name _getDialogParams
             * @description Fetches the entered parameters from the server-start dialog
             * @function
             * @private
             * @memberOf Crossfire
             * @param isServer if the dialog should ask for server start-up parameters or client connect parameters
             * @type Array
             * @returns an Array of dialog parameters
             */
            _getDialogParams: function _getDialogParams( isServer) {
                var commandLine = Components.classes["@almaden.ibm.com/crossfire/command-line-handler;1"].getService().wrappedJSObject;
                var host = commandLine.getHost();
                var port = commandLine.getPort();
                var title;
                if (isServer) {
                    title = "Crossfire - Start Server";
                } else {
                    title = "Crossfire - Connect to Server";
                }
                return { "host": null, "port": null, "title": title, "cli_host": host, "cli_port": port };
            }

        };

        //*********************************************************************
        return CrossfireUI;
});