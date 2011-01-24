/* See license.txt for terms of usage */
FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);

// ************************************************************************************************

// Register string bundle of this extension so, $STR method (implemented by Firebug)
// can be used. Also, perform the registration here so, localized strings used
// in template definitions can be resolved.
Firebug.registerStringBundle("chrome://dyne/locale/dyne.properties");

// ************************************************************************************************
// Front end

Firebug.Dyne = extend(Firebug.Module,
{
    dispatchName: "dyne",

    showPanel: function(browser, panel)
    {
        if (!panel)
            return;

        panel.showToolbarButtons("fbEditButtons",  (panel.location instanceof CompilationUnit));
    },

    /*
     * Integrate the selected panel with the selected editor
     */
    toggleEditing: function()
    {
        var panel = Firebug.chrome.getSelectedPanel();
        if (panel.dynamoEditing)
            FBTrace.sysout("Retry requested ");
        else
        {
            var location = Firebug.chrome.getSelectedPanelLocation();
            FBTrace.sysout("Edit requested "+location);
        }

    },
});



// ************************************************************************************************
// ************************************************************************************************
// Registration

// xxxHonza: what if the stylesheet registration would be as follows:
//Firebug.registerStylesheet("chrome://dyne/skin/dyne.css");

Firebug.registerModule(Firebug.Dyne);

// ************************************************************************************************
}});