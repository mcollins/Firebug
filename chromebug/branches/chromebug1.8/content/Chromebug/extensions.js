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

    getContextMenuItems: function()
    {
         var items = [];
         items.push(
                 {label: "Add New Extension Link",
                     command: bindFixed(this.addNewExtensionLink, this) }
             );
         return items;
    },

    onPrefChange: function(optionName, optionValue)
    {
        if (FBTrace.DBG_CBWINDOW)
            FBTrace.sysout("Chromebug.ExtensionsPanel.onPrefChange; " + optionName + "=" + optionValue);
    },
    
    addNewExtensionLink: function()
    {
        try
        {
            FBTrace.sysout("extensions.addNewExtensionLink ");
            // ask the user for the source folder
            var filePicker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
            filePicker.init(window, "Select the install.rdf file in the source folder you want to link", Ci.nsIFilePicker.modeOpen);
            filePicker.appendFilter("install.rdf", "install.rdf"); 

            var rv = filePicker.show();
            
            if (rv == Ci.nsIFilePicker.returnOK || rv == Ci.nsIFilePicker.returnReplace) 
            {
                var file = filePicker.file;
                    FBTrace.sysout("extensions.addNewExtensionLink "+file.path);
                    Components.utils.import("resource://firebug/storageService.js");
                    var installRDF = TextService.readText(file);
                    FBTrace.sysout("extensions.addNewExtensionLink read "+installRDF);
                    var installRDF = installRDF.split('\n').join('');
                  FBTrace.sysout("extensions.addNewExtensionLink remove newlines "+installRDF);
                  
                    var reTargetApplication = /<[^>]*?targetApplication>.*?<[^>]*?targetApplication>/;
                    var cleanup = installRDF.replace(reTargetApplication, "", 'gim');
                    FBTrace.sysout("extensions.addNewExtensionLink remove targetApplication "+cleanup, cleanup.split(">"));
                    
                    var reId = /<[^>]*?id>(.*?)<[^>]*?id>/;
                    var m = reId.exec(cleanup);
                    if (m)
                        var id = m[1];
                     
                    if (!id)
                    {
                        window.alert("Did not find id in install.rdf, sorry");
                        FBTrace.sysout("extensions.addNewExtensionLink FAILS to find id in "+cleanup, m);
                    }
                    FBTrace.sysout("extensions.addNewExtensionLink found id "+id);
                    // Link files is just path to install.rdf directory in a file named by |id|
                    var dir = TextService.getProfileDirectory();
                    var link = TextService.getFileInDirectory(dir, "extensions/"+id);
                  var result = TextService.writeText(link, file.parent.path);
                  window.alert("wrote "+file.parent.path+" into file "+result);
            }
            
        }
        catch(exc)
        {
            FBTrace.sysout("extensions.addNewExtensionLink FAILS "+exc, exc);
        }
        
    },
});


Firebug.registerPanel(Chromebug.ExtensionsPanel);

}});