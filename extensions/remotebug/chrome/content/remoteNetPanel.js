/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ********************************************************************************************* //
// Constants

var panelName = "remotenet";
var Module = Firebug.RemoteBug.Module;

// ********************************************************************************************* //
// Panel

/**
 * @panel
 */
function RemoteNetPanel() {}
RemoteNetPanel.prototype = extend(Firebug.Panel,
/** @lends RemoteNetPanel */
{
    name: panelName,
    title: "Remote Net",

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Initialization

    initialize: function()
    {
        Firebug.Panel.initialize.apply(this, arguments);

        Module.addListener(this);

        this.updateUI();
    },

    destroy: function(state)
    {
        Firebug.Panel.destroy.apply(this, arguments);

        Module.removeListener(this);
    },

    show: function(state)
    {
        Firebug.Panel.show.apply(this, arguments);

        this.showToolbarButtons("fbRemoteNetButtons", true);
    },

    refresh: function()
    {
        FBL.eraseNode(this.panelNode);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Model Listener

    onConnect: function()
    {
        this.updateUI();
    },

    onDisconnect: function()
    {
        this.updateUI();
    },

    updateUI: function()
    {
        var connected = Module.isConnected();
        var connectBtn = Firebug.chrome.getElementById("fbConnect");
        var disconnectBtn = Firebug.chrome.getElementById("fbDisconnect");
        var getTabList = Firebug.chrome.getElementById("fbGetTabList");

        connectBtn.setAttribute("collapsed", connected ? "true" : "false");
        disconnectBtn.setAttribute("collapsed", connected ? "false" : "true");
        getTabList.setAttribute("collapsed", connected ? "false" : "true");

        this.refresh();
    },
});

// ********************************************************************************************* //
// Registration

//Firebug.registerPanel(RemoteNetPanel);

// ********************************************************************************************* //
}});
