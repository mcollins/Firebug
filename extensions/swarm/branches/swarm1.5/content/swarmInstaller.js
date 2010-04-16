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

/*
 * Common base object for workflow steps, all called with 'this' being the registered object in registerWorkflowStep
 */
SwarmInstaller.WorkflowStep =
{
    /*
     * Called when the workflow system is loaded into the UI, on all steps
     * @param doc, the document containing the workflow UI
     * @param progress, a place to post progress messages for users
     */
    initialize: function(doc, progress) {},
    /*
     * Called just after the UI selects any workflow, on all steps
     * @param doc, the document containing the workflow UI
     * @param selectedWorkflow, the element selected
     */
    onWorkflowSelect: function(doc, selectedWorkflow) {},
    /*
     * Called just before the UI unselects any workflow, on all steps
     * @param doc, the document containing the workflow UI
     */
    onWorkflowUnselect: function(doc) {},
    /*
     * Called just before any workflow step, on all steps in the selected workflow
     * @param doc, the document containing the workflow UI
     * @param stepElement the element stepping
     */
    onStepStarts: function(doc, stepElement) {},
    /*
     * Called to execute this workflow step
     */
    onStep: function(event, progress) {},
    /*
     * Called just after any workflow step, on all steps in the selected workflow
     */
    onStepEnds: function(doc, stepElement) {},
    /*
     * called when the workflow system is unloaded, on all steps
     * * @param doc, the document containing the workflow UI
     * @param stepElement the element stepping
     */
    destroy: function() {},
};

SwarmInstaller.workFlowMonitor =
{
    initialize: function(doc, progress)
    {
        this.injectSwarmWorkflows(doc);
        this.progress = progress;
        SwarmInstaller.extensions.prepareDeclaredExtensions(doc, this.progress);
    },

    injectSwarmWorkflows: function(doc)
    {
        var webWarning = doc.getElementById("swarmWebPage");
        webWarning.style.visibility = "hidden";

        var swarmWorkflowInsertionPoint = doc.getElementById("swarmWorkflowInsertion");
        var swarmWorkflowInsertion = getResource("chrome://swarm/content/swarmWorkflow.htm");
        swarmWorkflowInsertionPoint.innerHTML = swarmWorkflowInsertion;
    },

    initializeUI: function(doc, progress)
    {
        var swarmWorkflows = doc.getElementById("swarmWorkflows");
        this.hookButtons(swarmWorkflows);
        swarmWorkflows.style.display = "block";
        this.dispatch("initialize", [doc, this.progress]);
    },

    detachFromPage: function()  // XXXjjb NOT BEING CALLED!
    {
        var doc = browser.contentDocument;
        var swarmWorkflows = doc.getElementById("swarmWorkflows");
        this.unHookButtons(swarmWorkflows);
    },

    hookButtons: function(workflowsElement)
    {
        this.buttonHook = bind(this.doWorkflowEvent, this);
        workflowsElement.addEventListener('click', this.buttonHook, true);

        var selectWorkflow = workflowsElement.ownerDocument.getElementById("selectWorkflow");
        selectWorkflow.addEventListener('click', this.unSelectWorkflow, true);
    },

    doWorkflowEvent: function(event)
    {
        if (event.target.tagName.toLowerCase() === 'button')
            this.doWorkflowStep(event);
        if (event.target.tagName.toLowerCase() === 'input')
            this.selectWorkflow(event);
        // TODO become a joehewitt some day.
    },

    unHookButtons: function(workflowsElement)
    {
        workflowsElement.removeEventListener('click',this.buttonHook ,true);

        var selectWorkflow = workflowsElement.ownerDocument.getElementById("selectWorkflow");
        selectWorkflow.addEventListener('click', this.unSelectWorkflow, true);
    },

    // ------------------------------------------------------------------------------------------
    selectWorkflow: function(event)
    {
        var doc = event.target.ownerDocument;
        this.unSelectSelectedWorkflow(doc);

        // select the new workflow
        var selectedWorkflowSelector = event.target;
        var parent = selectedWorkflowSelector;
        while(parent = parent.parentNode)
        {
            if (parent.classList && parent.classList.contains("swarmWorkflowSelection"))
            {
                parent.classList.add("swarmWorkflowSelected");
                var input = parent.getElementsByTagName('input')[0];
                input.checked = true;
                break;
            }
        }

        // enable some buttons in this workflow
        var selectedWorkflow = parent.getElementsByClassName("swarmWorkflow")[0];

        var buttons = selectedWorkflow.getElementsByTagName('button');
        for (var j = 0; j < buttons.length; j++)
        {
            button = buttons[j];
            if (button.classList.contains("swarmWorkflowStep")) continue; // leave disabled
            if (button.classList.contains("swarmWorkflowEnd")) continue;
            button.removeAttribute("disabled");
        }

        // mark the selector closed
        var swarmWorkflows = doc.getElementById("swarmWorkflows");
        swarmWorkflows.classList.add("swarmWorkflowIsSelected");

        // initialize the newly selected workflow
        this.dispatch("onWorkflowSelect", [doc, selectedWorkflow]);
        return true;
    },

    unSelectSelectedWorkflow: function(doc)
    {
        this.dispatch("onWorkflowUnselect", [doc])
        // unselect the previously selected workflow
        var workFlowSelectors = doc.body.getElementsByClassName("swarmWorkflowSelection");
        for (var i = 0; i < workFlowSelectors.length; i++)
            workFlowSelectors[i].classList.remove("swarmWorkflowSelected");

        // disable all of the buttons in all of the workflows
        var workFlows = doc.getElementById("swarmWorkflows");
        var buttons = workFlows.getElementsByTagName('button');
        for (var j = 0; j < buttons.length; j++)
            buttons[j].setAttribute("disabled", "disabled");

        var inputs = workFlows.getElementsByTagName("input");
        for (var j = 0; j < inputs.length; j++)
             inputs[j].checked = false;
    },

    unSelectWorkflow: function(event)
    {
        var doc = event.target.ownerDocument;
        var swarmWorkflowIsSelected = doc.getElementsByClassName("swarmWorkflowIsSelected");
        for (var i = 0; i < swarmWorkflowIsSelected.length; i++)
            swarmWorkflowIsSelected[i].classList.remove("swarmWorkflowIsSelected");

        SwarmInstaller.workFlowMonitor.unSelectSelectedWorkflow(doc);
    },

    doWorkflowStep: function(event)
    {
        if (event.target.tagName.toLowerCase() !== 'button')
            return;

        try
        {
            var button = event.target;

            var step = this.getStepFromButton(button);
            var doc = event.target.ownerDocument;

            button.classList.add("swarmWorkflowing");
            this.dispatch("onStepStarts", [doc, button])

            var handler = this.registeredWorkflowSteps[step];
            if (handler)
                handler.onStep(event, this.progress);
            else
                this.progress("no workflow step registered at "+step);

            this.dispatch("onStepEnds", [doc, button])
            button.classList.remove("swarmWorkflowing");
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
            if (button.classList[i] in this.registeredWorkflowSteps)
                return button.classList[i];
        }

        throw new Error("SwarmInstaller.doWorkflowStep no handler registered for "+button.getAttribute("class"));
    },

    stepWorkflows: function(doc, stepClassName)
    {
        var elts = doc.getElementsByClassName(stepClassName);
        for (var i = 0; i < elts.length; i++)
        {
            if (elts[i].classList.contains("swarmWorkflowEnd"))
                elts[i].classList.add("swarmWorkflowComplete");
            else
            {
                var nextStep = this.getNextStep(elts[i]);
                if (nextStep)
                {
                    elts[i].setAttribute('disabled', 'disabled');
                    nextStep.removeAttribute('disabled');
                }
            }
        }
    },

    getNextStep: function(elt)
    {
        while(elt = elt.nextSibling)
        {
            if (!elt.classList)  // eg TextNode
                continue;

            if (elt.classList.contains('swarmWorkflowStep'))
                return elt;
            else if (elt.classList.contains('swarmWorkflowEnd'))
                return elt;
        }
    },

    //----------------------------------------------------------------------------------

    registeredWorkflowSteps: {}, // key CSS class name, value obj shaped as SwarmInstaller.WorkflowStep

    registerWorkflowStep: function(key, obj)
    {
        this.registeredWorkflowSteps[key] = obj;
    },

    dispatch: function(eventName, args)
    {
        FBTrace.sysout("swarmInstaller.dispatch "+eventName, args);

        for(var p in this.registeredWorkflowSteps)
        {
            if (this.registeredWorkflowSteps.hasOwnProperty(p))
            {
                var listener = this.registeredWorkflowSteps[p];
                try
                {
                    listener[eventName].apply(listener, args);
                }
                catch(exc)
                {
                    FBTrace.sysout("swarmInstaller.dispatch FAILS for "+eventName+" to "+listener.toSource()+" because "+exc, exc);
                }
            }
        }
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

                if (this.isNotOverInstallable(installedExtensions[j].id))
                    setClass(declaredExtensionStatus, "installNotAllowed");

                installedButNotDeclared.splice(j, 1);
            }
            else
                setClass(declaredExtensionStatus, "installedVersion-None");

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
    // implement SwarmInstaller.WorkflowStep

    swarmInstallStep:
    {
        onWorkflowSelect: function(doc, selectedWorkflow)
        {
            var ext = SwarmInstaller.extensions.getInstallableExtensions();
            if (ext.length == 0)
                SwarmInstaller.workFlowMonitor.stepWorkflows(elt.ownerDocument, "swarmInstallStep");
        },

        onStep: function(event, progress)
        {
            // http://mxr.mozilla.org/mozilla-central/source/xpinstall/public/nsIXPInstallManager.idl#70
            var urls = [];
            var hashes = [];
            var installingExtensions = [];
            var declaredExtensions = SwarmInstaller.extensions.declaredExtensions;
            var count = declaredExtensions.length;
            for (var i = 0; i < count; i++)
            {
                if (declaredExtensions[i].statusElement.classList.contains("installNotAllowed"))
                    continue;

                if (declaredExtensions[i].statusElement.classList.contains("installedVersion-Same"))
                    continue;

                urls.push( declaredExtensions[i].href );
                hashes.push( declaredExtensions[i].hash );
                installingExtensions.push( declaredExtensions[i] );
            }
            count = urls.length;


            var listener =
            {
                states: ["download_start", "download_done", "install_start", "install_done", "dialog_close"],

                onStateChange: function(index, state, value )
                {
                    FBTrace.sysout("onStateChange "+installingExtensions[index].name+": "+this.states[state]+", "+value);

                    var classes = installingExtensions[index].statusElement.getAttribute('class');
                    var m = /installedVersion-[^\s]*/.exec(classes);
                    if (m)
                        removeClass(installingExtensions[index].statusElement, m[0]);

                    m = /installing-[^\s]*/.exec(classes);
                    if (m)
                        removeClass(installingExtensions[index].statusElement, m[0]);

                    if (this.states[state] === "install_done")
                    {
                        if (value != 0)
                        {
                            FBTrace.sysout("onStateChange "+installingExtensions[index].name+": "+this.states[state]+", "+errorNameByCode[value+""]);
                            var errorCodePage = "http://getfirebug.com/wiki/index.php/Extension_Installation_Error_Codes";
                            var errorCodeTitle ="Information on Installation Error Codes";
                            installingExtensions[index].statusElement.innerHTML += ": <a target=\"_blank\" title=\""+errorCodeTitle+"\" href=\""+
                                errorCodePage+"#"+errorNameByCode[value+""]+"_"+value+"\">"+errorNameByCode[value+""]+"</a>";
                            setClass(installingExtensions[index].statusElement, "install-failed");
                        }
                        else
                        {
                            setClass(installingExtensions[index].statusElement, "installing-"+this.states[state]);
                            this.checkForRestart();
                        }
                    }
                    else
                    {
                        if (this.states[state] === "dialog_close")
                            return;

                        setClass(installingExtensions[index].statusElement, "installing-"+this.states[state]);
                    }
                },

                checkForRestart: function()
                {
                    for (var i = 0; i < installingExtensions.length; i++)
                    {
                        if (installingExtensions[i].statusElement.classList.contains("installing-install_done"))
                            continue;
                        else
                            return false;
                    }
                    // all installs are done
                    window.alert("Installation is complete but you may have to restart the browser");
                },

                onProgress: function(index, value, maxValue )
                {
                    FBTrace.sysout("onStateChange "+installingExtensions[index].name+": "+value+"/"+maxValue);
                    installingExtensions[index].statusElement.innerHTML = installingExtensions[index].version +" "+Math.ceil(100*value/maxValue)+"%";
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
    },
}

SwarmInstaller.workFlowMonitor.registerWorkflowStep("swarmInstallStep", SwarmInstaller.extensions.swarmInstallStep);

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
