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
            try
            {
                var editURL = Firebug.Dyne.getEditURLbyURL(panel.context, location);
                Firebug.Dyne.beginEditing(editURL);
            }
            catch (exc)
            {
                Firebug.Console.logFormatted(exc+"", exc);
                Firebug.chrome.selectPanel("console");
            }
        }
    },
    // --------------------------------------------------------------------

    beginEditing: function(editURL)
    {
        FBL.openNewTab(editURL);
    },

    // --------------------------------------------------------------------
    // Extracting edit URL
    getEditURLbyURL: function(context, url)
    {
        var files = context.netProgress.files;
        for (var i = 0; i < files.length; i++)
        {
            if (files[i].href === url)
                return Firebug.Dyne.getEditURLbyNetFile(files[i]);
        }
        throw Firebug.Dyne.noMatchingRequest(url);
    },

    getEditURLbyNetFile: function(file)
    {
        var server = null;
        var token = null;
        var headers = file.responseHeaders;
        for (var i = 0; i < headers.length; i++)
        {
            if (headers[i].name.toLowerCase() === "x-edit-server")
                server = headers[i].value;
            if (headers[i].name.toLowerCase() === "x-edit-token")
                token = headers[i].value;
        }
        var editURL = server + token;
        if (editURL)
            return editURL;
        else
            throw Firebug.Dyne.noEditServerHeader(file);
    },

    noEditServerHeader: function(file)
    {
        var msg = "ERROR: The web page has no x-edit-server header: "; // NLS
        return new Error(msg + file.href);
    },

    noMatchingRequest: function(url)
    {
        var msg = "ERROR: The Net panel has no request matching "; // NLS
        return new Error(msg + url);
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