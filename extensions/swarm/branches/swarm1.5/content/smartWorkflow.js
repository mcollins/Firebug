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

Swarm.smartWorkflowStep =   extend(Swarm.WorkflowStep,  // Don't you just hate things called "smart..."?
{
	initialize: function(doc, progress)
	{
		this.checkPackage();
		
		
	},
	
	checkPackage: function()
	{
		 
	},
});

Swarm.workflowMonitor.registerWorkflowStep("swarmSmartWorkflowStep", Swarm.smartWorkflowStep);

}}());
