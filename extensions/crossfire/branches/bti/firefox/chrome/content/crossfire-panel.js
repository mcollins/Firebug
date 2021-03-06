/* See license.txt for terms of usage */
define([ "firebug/lib/lib",
         "firebug/firebug",
         "firebug/domplate",
         "crossfireModules/crossfire",
         "crossfireModules/crossfire-remote-tool",
         "crossfireModules/crossfire-status"], function(FBL, Firebug, Domplate, CrossfireModule, CrossfireRemoteTool, CrossfireStatus) {

    var remoteTool = new CrossfireRemoteTool();

    function CrossfirePanel() {
        CrossfireModule.panel = this;
        this.remoteTool = remoteTool;
    }

    var remotePanelTemplate,
        sidePanelTemplate,
        contextsPanelTemplate;
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
            tag: DIV({ "class": "crossfire-packet" },
                    FOR("item", "$array",
                            DIV("$item")
                        )
                    )
        });

        contextsPanelTemplate = domplate(Firebug.Rep, {
            tag: DIV({"class":"crossfire-contexts"},
                    FOR("item", "$array",
                        A({"class": "context-item", onclick: "$onSelectContext"}, "$item.href")
                        )
                    ),
            onSelectContext: function( evt) {

            }
        });
    }

    /**
     *
     * @returns {CommandsPanel}
     */
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
            sidePanelTemplate.tag.replace({array: ["commands go here."]}, this.panelNode, remotePanelTemplate);
        },

        refresh: function() {

        }

    });

    /**
     *
     * @returns {EventsPanel}
     */
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
            sidePanelTemplate.tag.replace({array: ["events go here."]}, this.panelNode, sidePanelTemplate);
        },

        refresh: function() {

        }

    });

    /**
     *
     * @returns {ContextsPanel}
     */
    function ContextsPanel() {}
    ContextsPanel.prototype = FBL.extend(Firebug.Panel, {
        name: "CrossfireContextsPanel",
        title: "Contexts",
        parentPanel: "CrossfirePanel",

        initialize: function() {
            if (FBTrace.DBG_CROSSFIRE_PANEL)
                FBTrace.sysout("crossfire contexts panel initialize");

            Firebug.Panel.initialize.apply(this, arguments);
        },

        destroy: function() {
            Firebug.Panel.destroy.apply(this, arguments);
        },

        show: function() {
            contextsPanelTemplate.tag.replace({array: remoteTool.contexts}, this.panelNode, contextsPanelTemplate);
        },

        refresh: function() {

        }

    });

    /**
     *
     * @returns {ToolsPanel}
     */
    function ToolsPanel() {}
    ToolsPanel.prototype = FBL.extend(Firebug.Panel, {
        name: "CrossfireToolsPanel",
        title: "Tools",
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
            sidePanelTemplate.tag.replace({array: remoteTool.tools}, this.panelNode, sidePanelTemplate);
        },

        refresh: function() {

        }

    });

    /**
     *
     */
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

        }
    });

    //**************************************************************************

    Firebug.registerStylesheet("chrome://crossfire/skin/crossfire.css");
    Firebug.registerPanel(CrossfirePanel);
    Firebug.registerPanel(ContextsPanel);
    Firebug.registerPanel(ToolsPanel);
    Firebug.registerPanel(CommandsPanel);
    Firebug.registerPanel(EventsPanel);

    return CrossfirePanel;
});