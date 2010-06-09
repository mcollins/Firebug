/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
const SHOW_ALL = Ci.nsIDOMNodeFilter.SHOW_ALL;

// ************************************************************************************************

Firebug.Swarm = extend(Firebug.Module,
{
    initialize: function(owner)
    {
        if (Firebug.TraceModule)
            Firebug.TraceModule.addListener(this.TraceListener);

        Firebug.Module.initialize.apply(this, arguments);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        if (Firebug.TraceModule)
            Firebug.TraceModule.removeListener(this.TraceListener);
    },
});

// ************************************************************************************************

Firebug.MenuItem =
{
    createMainMenuItem: function(name, beforeID, controller)
    {
        var mainMenu = document.getElementById("fbFirebugMenuPopup");
        var item =
        {
            label: $STR(name+"_label"),
            command: bind(controller.onSelect, controller),
            key: "fbKey_"+name,
        }
        if (beforeID)
            var before = document.getElementById(beforeID);
        var mainMenuItem = createMenuItem(mainMenu, item, before);
        mainMenuItem.setAttribute("id", "fbMenuItem_"+name);

        return mainMenuItem;
    },

    getLastMenuItemAfter: function(searchID)
    {
        var separator = document.getElementById(separatorID);
        var lastSibling = separator.nextSibling;
        while(lastSibling.tagName === "menuitem")
            lastSibling = lastSibling.nextSibling;
        return lastSibling.previousSibling;
    },
};

// ************************************************************************************************

/**
 * @menuitem "Manage Firebug Extensions"
 */
var SwarmEntry = extend(Firebug.MenuItem,
{
    name: "swarm",

    initialize: function()
    {
        if (FBTrace.DBG_SWARM)
            FBTrace.sysout("swarm.SwarmEntry.initialize();");

        this.mainMenuItem = this.createMainMenuItem(this.name, "menu_aboutSeparator", this);
    },

    onSelect: function(event)
    {
        var doc = context.window.document;
        var buttons = doc.getElementsByClassName("swarmInactive");
        if (buttons.length)
        {
            for (var i = 0; i < buttons.length; i++ )
            {
                removeClass(buttons[i], "swarmInactive");
                setClass(buttons[i], "swarmActive");
                buttons[i].addEventListener('click', FirebugSwarm.install, true);
            }
        }
        else
        {
            if (FBTrace.DBG_SWARM)
                FBTrace.sysout("swarm.SwarmEntry.onSelect need to notify or prevent this case.");
        }
    },
});

// ************************************************************************************************

var FirebugSwarm =
{
    install: function(event)
    {
        var button = event.target;
        var swarms = document.getElementsByClassName("firebug signed swarm");
        var iSwarm = -1;
        for (var i  = 0; i  < swarms.length; i++)
            if (swarms[i] === button.parentNode)
                iSwarm = i;

        if (iSwarm >= 0)
        {
            var swarm = swarms[iSwarm];
            event.target.innerHTML = "Check Signature";
            var extensions = swarm.getElementsByClassName("extensionURL");
            var extensionURLs = [];
            var extensionHash = [];
            for (var i = 0; i < extensions.length; i++)
            {
                extensionURLs[i] = extensions[i].getAttribute("href");
                extensionHash[i] = extensions[i].getAttribute("hash");
            }
            event.target.innerHTML = "Ready for "+extensions.length+" extensions";
        }
        else
        {
            event.target.innerHTML = "No valid swarm found";
        }
    },
}

// ************************************************************************************************

Firebug.Swarm.TraceListener =
{
    onLoadConsole: function(win, rootNode)
    {
        var doc = rootNode.ownerDocument;
        var styleSheet = createStyleSheet(doc, "chrome://swarm/skin/swarm.css");
        styleSheet.setAttribute("id", "swarmLogs");
        addStyleSheet(doc, styleSheet);
    },

    onDump: function(message)
    {
        var index = message.text.indexOf("swarm.");
        if (index == 0)
        {
            message.text = message.text.substr(index);
            message.type = "DBG_SWARM";
        }
    }
};

// ************************************************************************************************
// Registration

Firebug.registerMenuItem(SwarmEntry);
Firebug.registerStringBundle("chrome://swarm/locale/swarm.properties");
Firebug.registerModule(Firebug.Swarm);

// ************************************************************************************************
}});