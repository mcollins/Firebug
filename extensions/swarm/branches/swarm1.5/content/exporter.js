/* See license.txt for terms of usage */

// This code runs in the FBTest Window.
FBTestApp.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************

top.Swarm.Exporter =
{
    // initialization -------------------------------------------------------------------

    /*
     * Obtain the Public Key Infrastructure service.
     * It may not be installed!
     */
    getKeyService: function()
    {
        if (!this.keyService)
        {
            try
            {
                var keyServiceClass = Cc["@toolkit.mozilla.org/keyservice;1"];
                if (keyServiceClass)
                    this.keyService = keyServiceClass.getService(Ci.nsIKeyService);
                else
                    this.downloadAndInstallKeyService();  // maybe we have to restart
            }
            catch(exc)
            {
                throw new Error("Failed to get nsIKeyService "+exc);
            }
        }

        FBTrace.sysout("getKeyService "+this.keyService);

        return this.keyService;
    },

    installKeyServiceInstructionsURL: "chrome://swarm/content/installKeyService.html",
    downloadAndInstallKeyService: function()
    {
        var componentsDir = this.getComponentsDirectory();
        var taskBrowser = $("taskBrowser");
        taskBrowser.addEventListener("load", function onInstructionsLoaded(event)
        {
            taskBrowser.removeEventListener("load",onInstructionsLoaded, true);

            var doc = event.target;
            var elt = doc.getElementById("openFBTestComponentDirectory");
            elt.addEventListener("click", function onClickDirectory(event)
            {
                const nsIFilePicker = Ci.nsIFilePicker;

                var fp = Cc["@mozilla.org/filepicker;1"]
                               .createInstance(nsIFilePicker);
                fp.init(window, "Dialog Title", nsIFilePicker.modeGetFolder);
                fp.defaultString = componentsDir;
                fp.appendFilters(nsIFilePicker.filterAll);

                var rv = fp.show();

            }, true);
        }, true);
        taskBrowser.setAttribute("src", installKeyServiceInstructionsURL);
    },

    getComponentsDirectory: function()
    {
        var fbtest = "fbtest@mozilla.com"; // the extension's id from install.rdf
        var em = Cc["@mozilla.org/extensions/manager;1"].
                 getService(Ci.nsIExtensionManager);
        // the path may use forward slash ("/") as the delimiter
        // returns nsIFile for the extension's install.rdf
        var file = em.getInstallLocation(fbtest).getItemFile(fbtest, "components/");
        return file.path;
    },



};

// ----------------------------------------------------------------------------------
// Handlers contributed to Swarm
Swarm.Exporter.swarmExportPageStep = extend(Swarm.WorkflowStep,
{
    initialize: function(doc, progress)
    {
		this.progress = progress;
    },

    onStepEnabled: function(doc, elt)
    {
    	if (!Swarm.Tester.testResults)
    	{
    		// TODO mark red
    		alert("No Test Results to Export!");
    		return;
    	}
    	this.progress("Found export document template frame");

    	var template = this.getTemplate();
        this.setSwarmDefined(template, this.progress);
        this.setTestResults(template, this.progress);

    	this.showSwarmTaskData(doc, "swarmCertification");
    },

    onStep: function(event, progress)
    {
    	var template = this.getTemplate();
        this.doExport(template, progress);
    },

    getTemplate: function()
    {
    	var taskBrowser = $("taskBrowser");
    	var templateFrame = taskBrowser.contentDocument.getElementById("swarmCertification");
    	if (!templateFrame)
    		this.progress("ERROR: exporter.js needs element id swarmCertification");
    	else
    		return templateFrame.contentDocument;
    },

    setSwarmDefined: function(template, progress)
    {
    	var exportedSwarmDefinitionFrame = template.getElementById("swarmDefinition");
    	if (!exportedSwarmDefinitionFrame)
    	{
    		progress("ERROR: exporter.js needs swarmDefinition element in swarmCertification web page");
    		return;
    	}
        progress("Found export point for swarmDefinition");
        var swarmDefinitionAsDataURL = this.getDataURLForContent(Swarm.Tester.testedSwarmDefinition, "text/html");
        exportedSwarmDefinitionFrame.setAttribute("src", swarmDefinitionAsDataURL);
        progress("Set export on point for swarmDefinition");
    },

    setTestResults: function(template, progress)
    {
        var exportedTestResultsFrame = template.getElementById("FBTest");
        if (!exportedTestResultsFrame)
        {
    		progress("ERROR: exporter.js needs FBTest element in swarmCertification web page");
    		return;
        }
        progress("Found export point for test results");

        var testResultAsDataURL = this.getDataURLForContent(Swarm.Tester.testResults, "text/plain");
        exportedTestResultsFrame.setAttribute("src", testResultAsDataURL);
        progress("Set export on point for testResults");
    },

    doExport: function(template, progress)
    {
    	var sourceURL = Swarm.Tester.testedSwarmDefinitionURL;
    	var sourceParts = sourceURL.split('/');
    	var sourceLeafName = sourceParts[sourceParts.length - 1];

    	Components.utils.import("resource://firebug/storageService.js");
		if (typeof(TextService) != "undefined")
        {
			var html = getElementHTML(template.documentElement);
	        var file = TextService.getProfileDirectory();
	        file = TextService.getFileInDirectory(file, "firebug/"+sourceLeafName);
            var result = TextService.writeText(file, html);
            progress("exported to "+result);
            FBL.openWindow(null, FBL.getURLFromLocalFile(file));
        }
        else
        {
            progress("exporter.doExport TextService FAILS");
        }

    },

    onStepEnds: function(doc, step, element)
    {
        if (step !== "swarmExportPageStep")
            return;

    	Swarm.workflowMonitor.stepWorkflows(doc, "swarmExportPageStep");
    },

    getDataURLForContent: function(content, mimetype, params)
    {
        // data:text/javascript;fileName=x%2Cy.js;baseLineNumber=10,<the-url-encoded-data>
        var uri = "data:"+mimetype+";";
        if (params)
        {
        	for (var p in params)
        		uri += p +"="+encodeURIComponent(params[p])+",";
        }
        else
        {
        	uri += ",";
        }
        uri += encodeURIComponent(content);
        return uri;
    },


});

Swarm.Tester.signPage = extend(Swarm.WorkflowStep,
{
    onStep: function(event, progress)
    {
        FBTrace.sysout("Swarm.Tester signPage ", event);
        var keyservice = this.getKeyService();
        FBTrace.sysout("Swarm.Tester doSigning keyservice: "+this.keyservice);
        if (!keyservice)
            return;
        debugger;
    },
});

Swarm.workflowMonitor.registerWorkflowStep("swarmExportPageStep", Swarm.Exporter.swarmExportPageStep);

//************************************************************************************************
}});