/* See license.txt for terms of usage */

// This code runs in the FBTest Window.
FBTestApp.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

// ************************************************************************************************
// Building xpi

SwarmInstaller.SwarmBuild =
{
};

SwarmInstaller.SwarmBuild.swarmPackageStep = extend(SwarmInstaller.WorkflowStep,
{
    stepName: "swarmPackageStep",

    onWorkflowSelect: function(doc, selectedWorkflow)
    {
        this.extensionSources = [];

        var externalExtensions = doc.getElementsByClassName("installNotAllowed");
        if (externalExtensions.length)
        {
            var externalExtensionIds = this.getExtensionIdsByElements(externalExtensions);
            for(var i = 0; i < externalExtensionIds.length; i++)
            {
                var extensionId = externalExtensionIds[i];
                var linkToExtension = this.getLinkToExtension(extensionId);
                if (linkToExtension)
                {
                    this.extensionSources.push({link: linkToExtension, id: extensionId});
                    externalExtensions[i].classList.add("buildableExtension");
                }
            }
        }

        if (!this.extensionSources.length)
            this.disableStep(doc);
    },

    getLinkToExtension: function(extensionId)
    {
        var installLocation = SwarmInstaller.extensions.getExtensionManager().getInstallLocation(extensionId);
        if (installLocation instanceof Ci.nsIInstallLocation)
        {
            var link = installLocation.location;
            if (link instanceof Ci.nsIFile)
            {
                link.append(extensionId); // dir/id
                if (!link.isDirectory())
                    return link;
            }
        }
        return null;
    },

    getExtensionIdsByElements: function(elts)
    {
        var extensionIds = [];
        for(var i = 0; i < elts.length; i++)
        {
            var extensionElement = elts[i].parentNode;
            var urlElements = extensionElement.getElementsByClassName("extensionURL")[0];
            extensionIds.push(urlElements.getAttribute('id'));
        }
        return extensionIds;
    },

    disableStep: function(doc)
    {
        var packaging = doc.getElementsByClassName(this.stepName);
        for(var i = 0; i < packaging.length; i++)
            packaging[i].setAttribute('disabled', 'disabled');
    },

    onStep: function(event, progress)
    {
        progress("Building " + this.extensionSources.length + " extensions");
        for (var i = 0; i < this.extensionSources.length; i++)
        {
            this.buildExtension(this.extensionSources[i], progress);
        }
    },

    buildExtension: function(src, progress)
    {
        var msg = src.id + " saving link";
        progress(msg);

        debugger;
    }
});

SwarmInstaller.workFlowMonitor.registerWorkflowStep("swarmPackageStep", SwarmInstaller.SwarmBuild.swarmPackageStep);

//************************************************************************************************
}});