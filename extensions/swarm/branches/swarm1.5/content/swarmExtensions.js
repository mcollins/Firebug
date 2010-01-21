/* See license.txt for terms of usage */



// This code runs in the FBTest Window BUT it should also run in Firebug XXX
FBTestApp.ns(function() { with (FBL) {


 // ************************************************************************************************
 // Constants

 const Cc = Components.classes;
 const Ci = Components.interfaces;

 const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
 const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

 const Application = Components.classes["@mozilla.org/fuel/application;1"].getService(Components.interfaces.fuelIApplication);
 const versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                            .getService(Components.interfaces.nsIVersionComparator);
 const xpInstallManager = Components.classes["@mozilla.org/xpinstall/install-manager;1"]
      .getService(Components.interfaces.nsIXPInstallManager);

FBTestApp.extensions =
{
    getInstalledExtensions: function()
    {
        FBTrace.sysout("FBTestApp.extensions Application: "+Application.name, Application);  // XXX crashes Firefox if you open the object tab
        var extensions = Application.extensions;
        FBTrace.sysout("FBTestApp.extensions Application.extensions: "+Application.name, extensions.all);
        return extensions.all;
    },

    prepareDeclaredExtensions: function(doc, progress)
    {
        progress("Swarm Tester checking your extensions");
        this.declaredExtensions = this.getDeclaredExtensions(doc);
        progress("Swarm document declares "+this.declaredExtensions.length+" extensions");

        this.installedExtensions = this.getInstalledExtensions();
        progress("Profile has "+this.installedExtensions.length+" extensions installed");

        this.notDeclared = this.getInstalledButNotDeclared(this.declaredExtensions, this.installedExtensions);
        progress("Profile has "+this.notDeclared.length+" extensions not listed in the swarm");

        var installButton = doc.getElementsByClassName("swarmInstall")[0];
        installButton.setAttribute("style", "display: block;");
        progress("Ready to Install "+this.declaredExtensions.length+" extensions");

        var self = this;
        installButton.addEventListener('click', function doInstall(event)
        {
            self.installDeclaredExtensions(doc, progress);
        }, true);

    },

    installDeclaredExtensions: function(doc, progress)
    {
        // http://mxr.mozilla.org/mozilla-central/source/xpinstall/public/nsIXPInstallManager.idl#70
         var urls = [];
         var hashes = [];
         var count = this.declaredExtensions.length;
         for (var i = 0; i < count; i++)
         {
             urls[i] = this.declaredExtensions[i].href;
             hashes[i] = this.declaredExtensions[i].hash;
         }
        var swarm = this.declaredExtensions;
        var listener =
        {
            states: ["download_start", "download_done", "install_start", "install_done", "dialog_close"],

            onStateChange: function(index, state, value )
            {
                FBTrace.sysout("onStateChange "+swarm[index].name+": "+this.states[state]+", "+value);
            },
            onProgress: function(index, value, maxValue )
            {
                FBTrace.sysout("onStateChange "+swarm[index].name+": "+value+"/"+maxValue);
            },
            QueryInterface: function(iid)
            {
                return this;
            },
        };
        xpInstallManager.initManagerWithHashes(urls, hashes, count, listener);
    },

    getDeclaredExtensions: function(doc)
    {
        var extensionElts = doc.getElementsByClassName("extensionURL");
        var extensions = [];
        for (var i = 0; i < extensionElts.length; i++)
        {
            var elt = extensionElts[i];
            var href = elt.getAttribute('href');
            var version = this.extractVersion(href);
            extensions.push({
                name: elt.innerHTML,
                id: elt.getAttribute('id'),
                href: href,
                version: version,
                hash: elt.getAttribute('hash'),
                element: elt,
            });
        }
        return extensions;
    },

    extractVersion: function(href)
    {
        var slashSplit = href.split("/");
        var filename = slashSplit[slashSplit.length - 1];
        var dashSplit = filename.split('-');
        if (dashSplit.length > 1)     	// name-1.6X.0a5.xpi
        {
            var m = /(.*)\.xpi/.exec(dashSplit[dashSplit.length -1]);
            if (m)
                return m[1];
        }
        else // name1.6X.0a5.xpi
        {
            var m = /([^\d]*)(.*)\.xpi/.exec(filename);
            if (m)
                return m[2];
        }
        return filename;
    },

    getInstalledButNotDeclared: function(declaredExtensions, installedExtensions)
    {
        var installedButNotDeclared = FBL.cloneArray(installedExtensions);

        for (var i = 0; i < declaredExtensions.length; i++)
        {
            var declaredExtension = declaredExtensions[i];
            var declaredExtensionStatus = declaredExtension.element.parentNode.getElementsByClassName("extensionStatus")[0];
            if (!declaredExtensionStatus)
                declaredExtension.element.innerHTML = "ERROR this element should have a sybling with class extensionStatus";

            var j = this.getExtensionIndexById(installedExtensions, declaredExtension.id);
            if (j != -1)
            {
                var relative = versionComparator.compare(installedExtensions[j].version, declaredExtension.version);

                if (relative === 0)
                    setClass(declaredExtensionStatus, "extensionSameVersion");
                else if (relative < 0)
                    setClass(declaredExtensionStatus, "extensionNewerVersion");
                else if (relative > 0)
                    setClass(declaredExtensionStatus, "extensionOlderVersion");

                installedButNotDeclared.splice(j, 1);
            }
            else
                setClass(declaredExtensionStatus, "extensionNotInstalled");

            declaredExtensionStatus.innerHTML = declaredExtension.version;
        }
        return installedButNotDeclared;
    },

    getExtensionIndexById: function(installedExtensions, id)
    {
        for (var i = 0; i < installedExtensions.length; i++)
        {
            if (installedExtensions[i].id === id)
                return i;
        }
        return -1;
    },
}

}});
