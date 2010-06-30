/* See license.txt for terms of usage */

// This code runs in the FBTest Window and Firefox Window
(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
const Application = Components.classes["@mozilla.org/fuel/application;1"]
    .getService(Components.interfaces.fuelIApplication);
const versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
    .getService(Components.interfaces.nsIVersionComparator);

// ************************************************************************************************

Swarm.Installer =
{
    getInstalledExtensions: function()
    {
        FBTrace.sysout("Swarm.Installer Application: "+Application.name, Application);  // XXX crashes Firefox if you open the object tab
        var extensions = Application.extensions;
        FBTrace.sysout("Swarm.Installer Application.extensions: "+Application.name, extensions.all);
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

        //this.notInstalled = this.getDeclaredAndNotInstalledExtensions();
    },

    getInstallableExtensions: function(doc, progress)
    {
        var installingExtensions = [];
        var count = this.declaredExtensions.length;
        for (var i = 0; i < count; i++)
        {
            if (this.declaredExtensions[i].statusElement.classList.contains("installedVersion-Same"))
                continue;

            if (this.declaredExtensions[i].statusElement.classList.contains("installedVersion-Newer"))
                continue;

            installingExtensions.push( this.declaredExtensions[i] );
        }
        return installingExtensions;
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

    eachDeclaredAndInstallableExtension: function(fnTakesExtension)
    {
        var declaredExtensions = Swarm.Installer.declaredExtensions;
        var count = declaredExtensions.length;
        for (var i = 0; i < count; i++)
        {
            if (declaredExtensions[i].statusElement.classList.contains("installNotAllowed"))
                continue;

            if (declaredExtensions[i].statusElement.classList.contains("installedVersion-Same"))
                continue;

            fnTakesExtension(declaredExtensions[i]);
        }
    },

    extractVersion: function(href)
    {
        var slashSplit = href.split("/");
        var filename = slashSplit[slashSplit.length - 1];
        var dashSplit = filename.split('-');
        if (dashSplit.length > 1)         // name-1.6X.0a5.xpi
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
                declaredExtension.element.innerHTML = "ERROR this element should have a sibling with class \'extensionStatus\'";
            declaredExtension.statusElement = declaredExtensionStatus;

            var relativeAge = 99;

            var j = this.getExtensionIndexById(installedExtensions, declaredExtension.id);
            if (j != -1)  // TODO this work does not belong in this method.
            {
                relativeAge = versionComparator.compare(installedExtensions[j].version, declaredExtension.version);

                if (relativeAge === 0)
                    setClass(declaredExtensionStatus, "installedVersion-Same");
                else if (relativeAge < 0)
                    setClass(declaredExtensionStatus, "installedVersion-Newer");
                else if (relativeAge > 0)
                    setClass(declaredExtensionStatus, "installedVersion-Older");

                if (this.isNotOverInstallable(installedExtensions[j].id))
                {
                    var linkToExtension = Swarm.WorkflowStep.getLinkToExtension(installedExtensions[j].id);
                    if (linkToExtension)
                        setClass(declaredExtensionStatus, "installLink");
                    else
                        setClass(declaredExtensionStatus, "installRegistry");

                    if (relativeAge > 0)  // then we would want to install, but cannot
                        setClass(declaredExtensionStatus, "installNotAllowed");
                }

                installedButNotDeclared.splice(j, 1);
            }
            else
                setClass(declaredExtensionStatus, "installedVersion-None");

            if (relativeAge > 0 && !declaredExtension.hash && !declaredExtensionStatus.classList.contains("installNotAllowed"))
            {
                setClass(declaredExtensionStatus, "installHashMissing");
                setClass(declaredExtensionStatus, "installNotAllowed");
            }

            declaredExtensionStatus.innerHTML = declaredExtension.version;
        }
        return installedButNotDeclared;
    },

    getExtensionManager: function()
    {
        if (!this.extmgr)
            this.extmgr = Cc["@mozilla.org/extensions/manager;1"].getService(Ci.nsIExtensionManager);
        return this.extmgr;
    },

    isNotOverInstallable: function(id)
    {
        var installLocation = this.getExtensionManager().getInstallLocation(id);
        var independent = installLocation.itemIsManagedIndependently(id);
        return independent;
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
    // -------------------------------------------------------------
    // implement Swarm.WorkflowStep
};

// Unfortunately any error in the following code seems to cause silent failures :-(
Swarm.Installer.nsIXPIProgressDialog =
{
    initialize: function()
    {
        this.installing = [];
    },

    add: function(extension)
    {
        this.installing.push(extension);
    },

    states: ["download_start", "download_done", "install_start", "install_done", "dialog_close"],

    reInstalledVersion: /installedVersion-[^\s]*/,
    reInstalling: /installing-[^\s]*/,

    onStateChange: function(index, state, value )
    {
        FBTrace.sysout("onStateChange "+this.installing[index].name+": "+this.states[state]+", "+value);

        var classes = this.installing[index].statusElement.getAttribute('class');
        var m = reInstalledVersion.exec(classes);
        if (m)
            removeClass(this.installing[index].statusElement, m[0]);

        m = reInstalling.exec(classes);
        if (m)
            removeClass(this.installing[index].statusElement, m[0]);

        if (this.states[state] === "install_done")
        {
            if (value != 0)
            {
                FBTrace.sysout("onStateChange "+this.installing[index].name+": "+this.states[state]+", "+errorNameByCode[value+""]);
                var errorCodePage = "http://getfirebug.com/wiki/index.php/Extension_Installation_Error_Codes";
                var errorCodeTitle ="Information on Installation Error Codes";
                this.installing[index].statusElement.innerHTML += ": <a target=\"_blank\" title=\""+errorCodeTitle+"\" href=\""+
                    errorCodePage+"#"+errorNameByCode[value+""]+"_"+value+"\">"+errorNameByCode[value+""]+"</a>";
                setClass(this.installing[index].statusElement, "install-failed");
            }
            else
            {
                setClass(this.installing[index].statusElement, "installing-"+this.states[state]);
                this.checkForRestart();
            }
        }
        else
        {
            if (this.states[state] === "dialog_close")
                return;

            setClass(this.installing[index].statusElement, "installing-"+this.states[state]);
        }
    },

    checkForRestart: function()
    {
        for (var i = 0; i < this.installing.length; i++)
        {
            if (this.installing[i].statusElement.classList.contains("installing-install_done"))
                continue;
            else
                return false;
        }
        // all installs are done
        window.alert("Installation is complete but you may have to restart the browser");
    },

    onProgress: function(index, value, maxValue )
    {
        window.dump("onProgress "+index+"\n");

        FBTrace.sysout("onProgress "+this.installing[index].name+": "+value+"/"+maxValue);
        this.installing[index].statusElement.innerHTML = this.installing[index].version +" "+Math.ceil(100*value/maxValue)+"%";
    },

    QueryInterface: function(iid)
    {
        window.dump("QueryInterface "+iid+"\n");
        return this;
    },
};

Swarm.Installer.swarmInstallStep = extend(Swarm.WorkflowStep,
{
    initialize: function(doc, progress)
    {
        this.progress = progress;
        var swarmFrame = doc.getElementById('swarmDefinition');
        if (swarmFrame)
        {
            progress("Found swarmDefinition");
            this.swarmDocument = swarmFrame.contentDocument;
            Swarm.Installer.prepareDeclaredExtensions(this.swarmDocument, this.progress);
        }
        else
        {
            progress("No swarmDefinition element found");
        }
    },

    onWorkflowSelect: function(doc, selectedWorkflow)
    {
        var installSteps = selectedWorkflow.getElementsByClassName("swarmInstallStep");
        if (installSteps.length === 0)
            return;

        var ext = Swarm.Installer.getInstallableExtensions();
        if (ext.length == 0)
            Swarm.workflowMonitor.stepWorkflows(doc, "swarmInstallStep");
    },

    onStepEnabled: function(doc, elt)
    {
        this.showSwarmTaskData(doc, "swarmDefinition");

        var uninstallable = this.swarmDocument.getElementsByClassName("installNotAllowed");
        if (uninstallable.length)
        {
            setClass(elt, "swarmStepBlocked");  /// TODO workflow lib function
            elt.disabled = 'disabled';
            this.progress("ERROR "+uninstallable.length+" extensions cannot be installed");
        }
    },

    onStep: function(event, progress)
    {
        // http://mxr.mozilla.org/mozilla-central/source/xpinstall/public/nsIXPInstallManager.idl#70
        var urls = [];
        var hashes = [];
        Swarm.Installer.nsIXPIProgressDialog.initialize();

        Swarm.Installer.eachDeclaredAndInstallableExtension(function buildInstallManagerData(extension)
        {
            urls.push( extension.href );
            hashes.push( extension.hash );
            Swarm.Installer.nsIXPIProgressDialog.add( extension );
        });

        count = urls.length;

        progress("Installing "+count+" extensions");

        if (count)
        {
            var xpInstallManager = Components.classes["@mozilla.org/xpinstall/install-manager;1"]
                .getService(Components.interfaces.nsIXPInstallManager);
            FBTrace.sysout("swarm.installer installing "+count+" extensions", {urls: urls, hashes: hashes, xpInstallManager: xpInstallManager, nsIXPIProgressDialog: Swarm.Installer.nsIXPIProgressDialog});
            try
            {
                xpInstallManager.initManagerWithHashes(urls, hashes, count, Swarm.Installer.nsIXPIProgressDialog);
            }
            catch(exc)
            {
                FBTrace.sysout("swarm.installer installing FAILS "+exc, exc);
            }

        }
    },
});

Swarm.workflowMonitor.registerWorkflowStep("swarmInstallStep", Swarm.Installer.swarmInstallStep);

Swarm.Installer.swarmInstallAndCheckStep = extend(Swarm.Installer.swarmInstallStep,
{
    onStepEnds: function(doc, step, element)
    {
        if (step !== "swarmInstallAndCheckStep")
            return;

        Swarm.Installer.prepareDeclaredExtensions(this.swarmDocument, this.progress);
        var todo = [];
        Swarm.Installer.eachDeclaredAndInstallableExtension(function buildToDoList(extension)
        {
            todo.push(extension);
        });
        if (todo.length)
            window.alert(todo.length +" extension"+(todo.length==1?'':'s')+" cannot be installed");
        else
        {
            Swarm.workflowMonitor.stepWorkflows(doc, "swarmInstallAndCheckStep");
        }
    },
});

Swarm.workflowMonitor.registerWorkflowStep("swarmInstallAndCheckStep", Swarm.Installer.swarmInstallAndCheckStep);

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
