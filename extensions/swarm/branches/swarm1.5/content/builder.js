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

Swarm.SwarmBuild =
{
};

Swarm.SwarmBuild.swarmPackageStep = extend(Swarm.WorkflowStep,
{
    dispatchName: "swarmPackageStep",

    /*
     * The builder can only be invoked if there is a file link
     */
    onWorkflowSelect: function(doc, selectedWorkflow)
    {
        this.extensionSources = [];

        var externalExtensions = Swarm.Installer.getDeclaredExtensions();
        if (externalExtensions.length)
        {
            for(var i = 0; i < externalExtensions.length; i++)
            {
                var extensionId = externalExtensions[i].id;
                var linkToExtension = this.getLinkToExtension(extensionId);
                if (linkToExtension)
                {
                    this.extensionSources.push({link: linkToExtension, id: extensionId});
                    externalExtensions[i].element.classList.add("buildableExtension");
                }
            }
        }

        if (!this.extensionSources.length)
            this.disableStep(doc);
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
    },

    getDateFormatted: function()
    {
        function pad(n)
        {
            return (n < 10) ? '0'+n : n;
        }

        var d = new Date();

        var formatted =  d.getUTCFullYear()+'-';
        formatted += pad(d.getUTCMonth()+1)+'-';
        formatted += pad(d.getUTCDate())+'T';
        formatted += pad(d.getUTCHours())+':';
        formatted += pad(d.getUTCMinutes())+':';
        formatted += pad(d.getUTCSeconds())+'Z';

        return formatted;
    },

});

Swarm.workflowMonitor.registerWorkflowStep(Swarm.SwarmBuild.swarmPackageStep);

//************************************************************************************************
}});