/* See license.txt for terms of usage */

// This code runs in the FBTest Window.
FBTestApp.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

Swarm.zipper = {

};

Swarm.Installer.swarmPackageStep = extend(Swarm.WorkflowStep,
{
	initialize: function()
	{
		// if restart pref set, ?
	},
    onStepEnabled: function(doc, elt)
    {
        this.showSwarmTaskData(doc, "swarmDefinition");
    },

    onWorkflowSelect: function(doc, selectedWorkflow)
    {
    	var installed = Swarm.Installer.getInstalledExtensions();
    	for (var i = 0; i < installed.length; i++)
        {
    		var id = installed[i].id;
            var installLocation = this.getExtensionManager().getInstallLocation(id);
            var fileLink = getFileLink(id);
            if (fileLink)
            {
            	// activate the packager button,
            	// mark the extension div as packageable
            }
        },
        
    },
    
    /*
     * nsIFile for the linkFile to extension id, or null if not linked 
     * @param id, extension id
     * @return nsIFile, the link file
     */
    getFileLink: function(id)
    {
    	var installLocation = this.getExtensionManager().getInstallLocation(id);
    	var linkFileParent = installLocation.location;
    	if (linkFileParent.isDirectory())
    	{
    		var linkFile = linkFileParent;
    		linkFile.append(id);
    		if (linkFile.exists() && !linkFile.isDirectory())
    		{
    			return linkFile;
    		}
    	}
    	return null;
    },

    onStep: function(event, progress)
    {
        // if restart pref not set
    	// Initialize the zipper with the root directory of the extension
    	var installed = Swarm.Installer.getInstalledExtensions();
    	for (var i = 0; i < installed.length; i++)
        {
    		var id = installed[i].id;
            	
    		var fileLink = this.getFileLink(id);
    		if (fileLink)
    		{
    	    	// Write the zip file into the staging area
    	    	// Copy to link file from extensions/ to firebug/    			
    		}	
    		// else not packageable
        }
    	// Exit to cause installation
    },

});



}});