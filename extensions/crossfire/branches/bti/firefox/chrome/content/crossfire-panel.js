/* See license.txt for terms of usage */
define([ "firebug/lib/object",
         "firebug/firebug",
         "firebug/domplate",
         "crossfireModules/crossfire",
         "crossfireModules/crossfire-status"], function(FBL, Firebug, Domplate, CrossfireModule, CrossfireStatus) {

    function CrossfirePanel() {
        CrossfireModule.panel = this;
    }

    var remotePanelTemplate;
    var sidePanelTemplate;
    with(Domplate) {
        remotePanelTemplate = domplate(Firebug.Rep, {
                tag: DIV({"class": "crossfire-panel"},
                        DIV({"class": "crossfire-image"},
                            IMG({"src": "chrome://crossfire/skin/crossfire-lg.png"})
                        ),
                        DIV({"class": "crossfire-stuff"},
                                SPAN({"class": "crossfire-header"}, "Crossfire"),
                                BR(),
                                SPAN({"class": "crossfire-status"}, "Current Status: $object.status"),
                                BR(),
                                BR(),
                                BUTTON({
                                    type: "button",
                                    onclick: "$onButtonClick"
                                }, "Toggle Connection")
                        )
                    ),

               onButtonClick: function(evt) {
                   FBTrace.sysout("CrossfirePanel toggle connect CrossfireModule is " + CrossfireModule, CrossfireModule);
                   CrossfireModule.disconnect();
                   //FBL.$("crossfireStatusMenu").openPopup(el, "before_end", 0,0,false,false);
               }
        });

        sidePanelTemplate = domplate(Firebug.Rep, {
            tag: DIV({ "class": "crossfire-packet" }, "$object.packet")
        });
    }

    function CommandsPanel() {}
    CommandsPanel.prototype = FBL.extend(Firebug.Panel, {
        name: "CrossfireCommandsPanel",
        title: "Commmands",
        parentPanel: "CrossfirePanel",

        initialize: function() {
            if (FBTrace.DBG_CROSSFIRE_PANEL)
                FBTrace.sysout("crossfire commands panel initialize");

            Firebug.Panel.initialize.apply(this, arguments);
        },

        destroy: function() {
            Firebug.Panel.destroy.apply(this, arguments);
        },

        show: function() {
            sidePanelTemplate.tag.replace({object: {"packet": "commands go here."}}, this.panelNode, remotePanelTemplate);
        },

        refresh: function() {

        }

    });

    function EventsPanel() {}
    EventsPanel.prototype = FBL.extend(Firebug.Panel, {
        name: "CrossfireEventsPanel",
        title: "Events",
        parentPanel: "CrossfirePanel",

        initialize: function() {
            if (FBTrace.DBG_CROSSFIRE_PANEL)
                FBTrace.sysout("crossfire events panel initialize");

            Firebug.Panel.initialize.apply(this, arguments);
        },

        destroy: function() {
            Firebug.Panel.destroy.apply(this, arguments);
        },

        show: function() {
            sidePanelTemplate.tag.replace({object: {"packet": "events go here."}}, this.panelNode, sidePanelTemplate);
        },

        refresh: function() {

        }

    });

    CrossfirePanel.prototype = FBL.extend(Firebug.Panel, {
        name: "CrossfirePanel",
        title: "Remote",

        initialize: function() {
            if (FBTrace.DBG_CROSSFIRE_PANEL)
                FBTrace.sysout("crossfire panel initialize");

            Firebug.Panel.initialize.apply(this, arguments);
        },

        destroy: function() {
            Firebug.Panel.destroy.apply(this, arguments);
        },

        show: function() {
            this.refresh();
        },

        refresh: function( status) {
            var message = " unknown.";

            if (CrossfireModule && !status)
                status = CrossfireModule.status;

            if (status == CrossfireStatus.STATUS_DISCONNECTED) {
                message = "disconnected.";
            } else if (status == CrossfireStatus.STATUS_WAIT_SERVER) {
                 message = "accepting connections on port " + CrossfireModule.serverTransport.port;
            } else if (status == CrossfireStatus.STATUS_CONNECTING) {
                 message = "connecting...";
            } else if (status == CrossfireStatus.STATUS_CONNECTED_SERVER) {
                 message = "connected to client on port " + CrossfireModule.serverTransport.port;
            } else if (status == CrossfireStatus.STATUS_CONNECTED_CLIENT) {
                 message =  "connected to " + CrossfireModule.clientTransport.host + ":" + CrossfireModule.clientTransport.port;
            }

            remotePanelTemplate.tag.replace({object: {"status": message}}, this.panelNode, remotePanelTemplate);
        },

        hide: function() {

        },
    });

    Firebug.registerStylesheet("chrome://crossfire/skin/crossfire.css");
    Firebug.registerPanel(CrossfirePanel);
    Firebug.registerPanel(CommandsPanel);
    Firebug.registerPanel(EventsPanel);

    return CrossfirePanel;
});