/* See license.txt for terms of usage */
FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
const SHOW_ALL = Ci.nsIDOMNodeFilter.SHOW_ALL;


// ************************************************************************************************

// Register string bundle of this extension so, $STR method (implemented by Firebug)
// can be used. Also, perform the registration here so, localized strings used
// in template definitions can be resolved.
Firebug.registerStringBundle("chrome://swarm/locale/swarm.properties");

// ************************************************************************************************


// ************************************************************************************************
Firebug.MenuItem = {

    createMainMenuItem: function(name, before)
    {
        var mainMenu = document.getElementById("fbFirebugMenuPopup");
        var item =
        {
            label: $STR(name+"_label"),
            id: "fbMenuItem_"+name,
            command: bind(this.onSelect, this),
            key: "fbKey_"+name,
        }
        var commandSet = document.getElementById('mainCommandSet');
        return createMenuItem(mainMenu, item, before);
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
/**
 * @menuitem "Manage Firebug Extensions"
 */
function SwarmEntry() {}
SwarmEntry.prototype = extend(Firebug.MenuItem,
/** @lends EventPanel */
{
    name: "swarm",

    onPopupShowing: function()
    {
        // activiate if the gBrowser page is a swarm definition page
    },

    onSelect: function()
    {

    },
}
//    Firebug.registerMenuItem(SwarmEntry);

// ************************************************************************************************
}});