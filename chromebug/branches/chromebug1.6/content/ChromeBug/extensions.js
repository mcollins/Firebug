/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ***********************************************************************************
// Shorcuts and Services

const Cc = Components.classes;
const Ci = Components.interfaces;

//************************************************************************************************
//Chromebug Extensions Panel

Chromebug.ExtensionsPanel = function() {}

//************************************************************************************************


Chromebug.ExtensionsPanel.prototype = extend(Firebug.DOMPanel.prototype,
{
    name: "extensions",
    title: "Extensions",
    searchable: false,
    editable: false,

    supportsObject: function(object)
    {
        if (object instanceof Ci.nsIInstallLocation)
            return 10;
        else
            return 0;
    },

    getDefaultSelection: function()
    {
        this.refresh();
        return this.extensions;
    },

    refresh: function()
    {
        if (!this.extmgr)
            this.extmgr = Cc["@mozilla.org/extensions/manager;1"].getService(Ci.nsIExtensionManager);

        this.extensions = {};
        var enumerateLocations = this.extmgr.installLocations;
        while(enumerateLocations.hasMoreElements())
        {
            var installLocation = enumerateLocations.getNext();
            if (installLocation instanceof Ci.nsIInstallLocation)
            {
                var enumerateItemLocations = installLocation.itemLocations;
                if (enumerateItemLocations instanceof Ci.nsIDirectoryEnumerator)
                {
                    while (itemLocation = enumerateItemLocations.nextFile)
                    {
                        var id = installLocation.getIDForLocation(itemLocation);
                        if (id) // else not an extension
                        {
                            var updateItem = this.extmgr.getItemForID(id);

                            this.extensions[id] =
                            {
                                itemLocation: itemLocation,
                                installLocation: installLocation,
                                external: installLocation.itemIsManagedIndependently(id),
                                updateItem: (updateItem instanceof Ci.nsIUpdateItem ? updateItem : null),
                            };
                        }

                    }
                }
            }
        }

    },

    show: function(state)
    {
        this.selection = null;
        if (FBTrace.DBG_EXTENSIONS)
            FBTrace.sysout("Chromebug.ExtensionsPanel.show;", state);

        this.showToolbarButtons("cbExtensionButtons", true);
        Firebug.DOMPanel.prototype.show.apply(this, arguments);
    },

    hide: function()
    {
        if (FBTrace.DBG_CBWINDOW)
            FBTrace.sysout("Chromebug.ExtensionsPanel.hide;");

        this.showToolbarButtons("cbExtensionButtons", false);
        Firebug.DOMPanel.prototype.hide.apply(this, arguments);
    },

    getOptionsMenuItems: function()
    {
         var items = [];
         return items;
    },

    onPrefChange: function(optionName, optionValue)
    {
        if (FBTrace.DBG_CBWINDOW)
            FBTrace.sysout("Chromebug.ExtensionsPanel.onPrefChange; " + optionName + "=" + optionValue);
 },
});


Firebug.registerPanel(Chromebug.ExtensionsPanel);

}});