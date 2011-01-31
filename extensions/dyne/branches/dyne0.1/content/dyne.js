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

    initialize: function()
    {
        Firebug.Dyne.initializeOrionPrefs();
    },

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
                if (editURL)
                    Firebug.Dyne.beginEditing(editURL);
            }
            catch (exc)
            {
                Firebug.Console.logFormatted([exc+"", exc], panel.context, "error");
                Firebug.chrome.selectPanel("console");
            }
        }
    },
    // --------------------------------------------------------------------

    beginEditing: function(editURL)
    {
        var orionWindow = Firebug.Dyne.Orion.window;
        if(!orionWindow || orionWindow.closed)
        {
            orionWindow = Firebug.Dyne.Orion.window = FBL.openWindow("Orion", "chrome://browser/content/browser.xul");
            function openEditURL()
            {
                FBTrace.sysout("openEditURL "+editURL);
                orionWindow.gBrowser.selectedTab = orionWindow.gBrowser.addTab(editURL);
                orionWindow.removeEventListener("load", openEditURL, false);
            }
            orionWindow.addEventListener("load", openEditURL, false);
        }
        else
        {
            FBTrace.sysout("beginEditing "+editURL);
            orionWindow.gBrowser.selectedTab = orionWindow.gBrowser.addTab(editURL); 
        }
    },

    // --------------------------------------------------------------------
    // Extracting edit URL
    getEditURLbyURL: function(context, url)
    {
        if (url.substr(0,4) === "http")
            return Firebug.Dyne.getEditURLbyWebURL(context, url);
        else
            return Firebug.Dyne.getEditURLbyLocalFile(context, url);
    },

    /*
     * @param url starts with 'http'
     */
    getEditURLbyWebURL: function(context, url)
    {
        var files = context.netProgress.files;
        for (var i = 0; i < files.length; i++)
        {
            var href = files[i].href;
            href = href.split('?')[0]; // discard query
            href = href.split('#')[0]; // discard fragment

            if (href === url)
                return Firebug.Dyne.getEditURLbyNetFile(files[i]);
        }
        throw Firebug.Dyne.noMatchingRequest(url);
    },

    getEditURLbyLocalFile: function(context, url)
    {
        if (url.substr(0,5) !== "file:")
        {
            var uri = FBL.getLocalSystemURI(url);
            FBTrace.sysout("getLocalSystemURI("+url+")="+uri);
            if (uri)
                url = uri.spec;
        }

        return Firebug.Dyne.getOrionEditURLByFileURL(url);
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
        var msg = "The web page has no x-edit-server header: "; // NLS
        return new Error(msg + file.href);
    },

    noMatchingRequest: function(url)
    {
        var msg = "The Net panel has no request matching "; // NLS
        return new Error(msg + url);
    },

    // ********************************************************************************************
    initializeOrionPrefs: function()
    {
        Firebug.Dyne.Orion = {};
        Firebug.Dyne.Orion.fileURLPrefix = Firebug.getPref(Firebug.prefDomain, "orion.fileURLPrefix");
        Firebug.Dyne.Orion.projectURLPrefix = Firebug.getPref(Firebug.prefDomain, "orion.projectURLPrefix");
        FBTrace.sysout("Firebug.Dyne.Orion ", Firebug.Dyne.Orion);
    },

    updateOption: function(name, value)
    {
        FBTrace.sysout("updateOption "+name +" = "+value);
        if (name === "orion.projectURLPrefix")
            Firebug.Dyne.Orion.projectURLPrefix = value;
        if (name === "orion.fileURLPrefix")
            Firebug.Dyne.Orion.fileURLPrefix = value;
    },

    getOrionEditURLByFileURL: function(fileURL)
    {
        if (!Firebug.Dyne.Orion.fileURLPrefix)
            throw new Error("No value set in about:config for extensions.firebug.orion.fileURLPrefix");
        if (!Firebug.Dyne.Orion.projectURLPrefix)
            throw new Error("No value set in about:config for extensions.firebug.orion.projectURLPrefix");

        FBTrace.sysout("getOrionEditURLByFileURL "+fileURL, Firebug.Dyne.Orion)
        return fileURL.replace(Firebug.Dyne.Orion.fileURLPrefix, Firebug.Dyne.Orion.projectURLPrefix);
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