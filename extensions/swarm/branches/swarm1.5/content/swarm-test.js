/* See license.txt for terms of usage */
FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);

// ************************************************************************************************

var FirebugSwarmTest
{
    // initialization -------------------------------------------------------------------

    addSigningButton: function()
    {
        FBTrace.sysout("addSigningButton goes here");
    },

    getKeyService: function()
    {
        FBTrace.sysout("getKeyService goes here");
        if (!this.keyService)
        {
            try
            {
                var keyServiceClass = Components.classes["@toolkit.mozilla.org/keyservice;1"];
                if (keyServiceClass)
                    this.keyService = keyServiceClass.getService(Components.interfaces.nsIKeyService);
                else
                    this.downloadAndInstallKeyService();  // maybe we have to restart
            }
            catch(exc)
            {
                throw new Error("Failed to get nsIKeyService "+exc);
            }

        }

        return this.keyService;
    },

    // User interface -------------------------------------------------------------------

    enableSigningButton: function(enable)
    {

    },

    doSigning: function(event)
    {

    },

    // real work -------------------------------------------------------------------

    downloadAndInstallKeyService: function()
    {
        // put up instructions and later do it by calling nsIZipReader on a url to mccoy.
    }
};

//************************************************************************************************
}});