/* See license.txt for terms of usage */



// This code runs in the FBTest Window and Firefox Window
(function() { with (FBL) {


 // ************************************************************************************************
 // Constants

 const Cc = Components.classes;
 const Ci = Components.interfaces;

 const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
 const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

 const Application = Components.classes["@mozilla.org/fuel/application;1"].getService(Components.interfaces.fuelIApplication);
 const versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                            .getService(Components.interfaces.nsIVersionComparator);

top.SwarmInstaller = {};

SwarmInstaller.workFlowMonitor =
{
    initialize: function(doc, progress)
    {
        this.enableSwarmWorkflows(doc);
        this.progress = progress;
        SwarmInstaller.extensions.prepareDeclaredExtensions(doc, this.progress);
    },

    enableSwarmWorkflows: function(doc)
    {
        var webWarning = doc.getElementById("swarmWebPage");
        webWarning.style.visibility = "hidden";

        var swarmWorkFlows = doc.getElementById("swarmWorkFlows");
        this.hookButtons(swarmWorkFlows);
        swarmWorkFlows.style.display = "block";
    },

    hookButtons: function(elt)
    {
        this.buttonHook = bind(this.doWorkFlowStep, this);
        elt.addEventListener('click', this.buttonHook, true);
    },

    detachFromPage: function()
    {
        var doc = browser.contentDocument;
        var swarmWorkFlows = doc.getElementById("swarmWorkFlows");
        this.unHookButtons(swarmWorkFlows);
    },

    unHookButtons: function(elt)
    {
        elt.removeEventListener('click',this.buttonHook ,true);
    },

    doWorkFlowStep: function(event)
    {
        if (event.target.tagName.toLowerCase() !== 'button')
            return;

        try
        {
            var button = event.target;

            var step = this.getStepFromButton(button);

            button.classList.add("swarmWorkFlowing");
            this.registeredWorkFlowSteps[step](event.target.ownerDocument, this.progress);
            button.classList.remove("swarmWorkFlowing");
            event.stopPropagation();
            event.preventDefault();
        }
        catch(exc)
        {
            FBTrace.sysout("SwarmInstaller FAILS "+exc, exc);
            this.progress(exc);
        }

    },

    getStepFromButton: function(button)
    {
        for(var i = 0; i < button.classList.length; i++)
        {
            if (button.classList[i] in this.registeredWorkFlowSteps)
                return button.classList[i];
        }

        throw new Error("SwarmInstaller.doWorkFlowStep no handler registered for "+button.getAttribute("class"));
    },


    //----------------------------------------------------------------------------------

    registeredWorkFlowSteps: {}, // key CSS class name, value function(document, progress);

    registerWorkFlowStep: function(key, fnc)
    {
        this.registeredWorkFlowSteps[key] = fnc;
    },

};

SwarmInstaller.extensions =
{
    getInstalledExtensions: function()
    {
        FBTrace.sysout("SwarmInstaller.extensions Application: "+Application.name, Application);  // XXX crashes Firefox if you open the object tab
        var extensions = Application.extensions;
        FBTrace.sysout("SwarmInstaller.extensions Application.extensions: "+Application.name, extensions.all);
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
    },

    installDeclaredExtensions: function(doc, progress)
    {
        // http://mxr.mozilla.org/mozilla-central/source/xpinstall/public/nsIXPInstallManager.idl#70
        var urls = [];
        var hashes = [];
        var count = this.declaredExtensions.length;
        for (var i = 0; i < count; i++)
        {
            if (this.declaredExtensions[i].statusElement.classList.contains("installedVersion-Same"))
                continue;

            urls.push( this.declaredExtensions[i].href );
            hashes.push( this.declaredExtensions[i].hash );
        }
        count = urls.length;

        var swarm = this.declaredExtensions;
        var listener =
        {
            states: ["download_start", "download_done", "install_start", "install_done", "dialog_close"],

            onStateChange: function(index, state, value )
            {
                FBTrace.sysout("onStateChange "+swarm[index].name+": "+this.states[state]+", "+value);

                var classes = swarm[index].statusElement.getAttribute('class');
                var m = /installedVersion-[^\s]*/.exec(classes);
                if (m)
                    removeClass(swarm[index].statusElement, m[0]);

                m = /installing-[^\s]*/.exec(classes);
                if (m)
                    removeClass(swarm[index].statusElement, m[0]);

                if (this.states[state] === "install_done")
                {
                    if (value != 0)
                    {
                        FBTrace.sysout("onStateChange "+swarm[index].name+": "+this.states[state]+", "+errorNameByCode[value+""]);
                        var errorCodePage = "http://getfirebug.com/wiki/index.php/Extension_Installation_Error_Codes";
                        var errorCodeTitle ="Information on Installation Error Codes";
                        swarm[index].statusElement.innerHTML += ": <a title=\""+errorCodeTitle+"\" href=\""+
                            errorCodePage+"#"+errorNameByCode[value+""]+"_"+value+"\">"+errorNameByCode[value+""]+"</a>";
                        setClass(swarm[index].statusElement, "install-failed");
                    }
                    else
                        setClass(swarm[index].statusElement, "installing-"+this.states[state]);
                }
                else
                {
                    setClass(swarm[index].statusElement, "installing-"+this.states[state]);
                }
            },
            onProgress: function(index, value, maxValue )
            {
                FBTrace.sysout("onStateChange "+swarm[index].name+": "+value+"/"+maxValue);
                swarm[index].statusElement.innerHTML = swarm[index].version +" "+Math.ceil(100*value/maxValue)+"%";
            },
            QueryInterface: function(iid)
            {
                return this;
            },
        };
        var xpInstallManager = Components.classes["@mozilla.org/xpinstall/install-manager;1"]
            .getService(Components.interfaces.nsIXPInstallManager);
        
        progress("Installing "+count+" extensions");

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
            declaredExtension.statusElement = declaredExtensionStatus;

            var j = this.getExtensionIndexById(installedExtensions, declaredExtension.id);
            if (j != -1)
            {
                var relative = versionComparator.compare(installedExtensions[j].version, declaredExtension.version);

                if (relative === 0)
                    setClass(declaredExtensionStatus, "installedVersion-Same");
                else if (relative < 0)
                    setClass(declaredExtensionStatus, "installedVersion-Newer");
                else if (relative > 0)
                    setClass(declaredExtensionStatus, "installedVersion-Older");

                installedButNotDeclared.splice(j, 1);
            }
            else
                setClass(declaredExtensionStatus, "installedVersion-None");

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

SwarmInstaller.workFlowMonitor.registerWorkFlowStep("swarmInstallStep", bind(SwarmInstaller.extensions.installDeclaredExtensions, SwarmInstaller.extensions));

var errorNameByCode =
{
        "-200":"BAD_PACKAGE_NAME",
        "-201":"UNEXPECTED_ERROR",
        "-202":"ACCESS_DENIED",
        "-203":"EXECUTION_ERROR",
        "-204":"NO_INSTALL_SCRIPT",
        "-205":"NO_CERTIFICATE",
        "-206":"NO_MATCHING_CERTIFICATE",
        "-207":"CANT_READ_ARCHIVE",
        "-208":"INVALID_ARGUMENTS",
        "-209":"ILLEGAL_RELATIVE_PATH",
        "-210":"USER_CANCELLED",
        "-211":"INSTALL_NOT_STARTED",
        "-212":"SILENT_MODE_DENIED",
        "-213":"NO_SUCH_COMPONENT",
        "-214":"DOES_NOT_EXIST",
        "-215":"READ_ONLY",
        "-216":"IS_DIRECTORY",
        "-217":"NETWORK_FILE_IS_IN_USE",
        "-218":"APPLE_SINGLE_ERR",
        "-219":"INVALID_PATH_ERR",
        "-220":"PATCH_BAD_DIFF",
        "-221":"PATCH_BAD_CHECKSUM_TARGET",
        "-222":"PATCH_BAD_CHECKSUM_RESULT",
        "-223":"UNINSTALL_FAILED",
        "-224":"PACKAGE_FOLDER_NOT_SET",
        "-225":"EXTRACTION_FAILED",
        "-226":"FILENAME_ALREADY_USED",
        "-227":"INSTALL_CANCELLED",
        "-228":"DOWNLOAD_ERROR",
        "-229":"SCRIPT_ERROR",
        "-230":"ALREADY_EXISTS",
        "-231":"IS_FILE",
        "-232":"SOURCE_DOES_NOT_EXIST",
        "-233":"SOURCE_IS_DIRECTORY",
        "-234":"SOURCE_IS_FILE",
        "-235":"INSUFFICIENT_DISK_SPACE",
        "-236":"FILENAME_TOO_LONG",
        "-237":"UNABLE_TO_LOCATE_LIB_FUNCTION",
        "-238":"UNABLE_TO_LOAD_LIBRARY",
        "-239":"CHROME_REGISTRY_ERROR",
        "-240":"MALFORMED_INSTALL",
        "-241":"KEY_ACCESS_DENIED",
        "-242":"KEY_DOES_NOT_EXIST",
        "-243":"VALUE_DOES_NOT_EXIST",
        "-244":"UNSUPPORTED_TYPE",
        "-260":"INVALID_SIGNATURE",
        "-261":"INVALID_HASH",
        "-262":"INVALID_HASH_TYPE",
        "-299":"OUT_OF_MEMORY",
        "-5550":"GESTALT_UNKNOWN_ERR",
        "-5551":"GESTALT_INVALID_ARGUMENT",
        "0":"SUCCESS",
        "999":"REBOOT_NEEDED",
};

}}());
