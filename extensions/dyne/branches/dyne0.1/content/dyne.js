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
    editors: {},

    initialize: function()
    {

    },

    showPanel: function(browser, panel)
    {
        if (!panel)
            return;

        panel.showToolbarButtons("fbEditButtons",  (panel.location instanceof CompilationUnit));
    },

    updateOption: function(name, value)
    {
        FBL.dispatch(this.editors, 'updateOption', arguments);
    },

    // **********************************************************************************************
    registerEditor: function(editor)
    {
        if (!editor.getName || !editor.initialize)
            throw new Error("registerEditor: editor needs a getName");

        this.editors[editor.getName()] = editor;
        editor.initialize();
    },

    unregisterEditor: function(editor)
    {
        if (!editor.getName)
            throw new Error("registerEditor: editor needs a getName");

        editor.destory();
        delete this.editors[editor.getName()];
    },

    // **********************************************************************************************

    toggleCSSEditing: function()
    {
        if (!Firebug.Dyne.toggleEditing()) // then we did not have web edit ide
        {
            // fall back to panel editor, mimic cmd_toggleCSSEditing in firebugOverlay.xul
            var panel = Firebug.currentContext.getPanel('stylesheet');
            Firebug.CSSStyleSheetPanel.prototype.toggleEditing.apply(panel, []);
        }
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
                var editor = this.getBestEditorSupportingLocation(Firebug.currentContext, location);
                if (editor)
                {
                    editor.beginEditing(Firebug.currentContext, location);
                    return true;
                }
                else
                {
                    // TODO some help UI
                    return false;
                }
            }
            catch (exc)
            {
                Firebug.Console.logFormatted([exc+"", exc], panel.context, "error");
                Firebug.chrome.selectPanel("console");
            }
        }
    },
    // ********************************************************************************************
    getBestEditorSupportingLocation: function(context, location)
    {
        var bestLevel = 0;
        var bestEditor = null;

        var editors = Firebug.Dyne.editors; // array of registered editors
        for (var i = 0; i < editors.length; ++i)
        {
            var editor = editors[i];
            var level = editor.supportsLocation(location);
            if (!bestLevel || (level && (level > bestLevel) ))
            {
                bestLevel = level;
                bestEditor = editor;
            }
            if (FBTrace.DBG_EDITORS)
                FBTrace.sysout("Firebug.Dyne.getBestEditorSupportingLocation level: "+level+" bestEditor: "+ bestEditor+" bestLevel: "+bestLevel);
        }

        return bestEditor;
    },

});

Firebug.Dyne.Editors =
{
    // API
    initialize: function()
    {
        // called after register
    },

    supportsLocation: function(context, location)
    {
        // return an integer. 0 means No. 1 means sure I guess. 100 means pick me pick me!
    },

    getName: function()
    {
        // return a string unique for this editor.
    },

    beginEditing: function(editor)
    {

    },

    getEditURLByFileURL: function(url)
    {
        // url if this editor can deal with files else null
    },

    destory: function()
    {
       // called after unregister
    },

    // Common code
    // --------------------------------------------------------------------
    // Extracting edit URL
    getEditURLbyURL: function(context, url)
    {
        if (url.substr(0,4) === "http")
            return this.getEditURLbyWebURL(context, url);
        else
            return this.getEditURLNotHTTP(url);
    },


    getEditURLNotHTTP: function(context, url)
    {
        if (url.substr(0,5) !== "file:")
        {
            var uri = FBL.getLocalSystemURI(url);
            FBTrace.sysout("getLocalSystemURI("+url+")="+uri);
            if (uri)
                url = uri.spec;
        }

        return this.getEditURLByFileURL(url);
    },



};

Firebug.Dyne.OrionEditor = FBL.extend(Firebug.Dyne.Editors,
{
    initialize: function()
    {
        Firebug.Dyne.initializeOrionPrefs();
    },

    supportsLocation: function(context, location)
    {
        // return an integer. 0 means No. 1 means 'sure', 100 means 'pick me pick me!'
    },

    getName: function()
    {
        return "Orion";
    },

    beginEdit: function(context, location)
    {
        var editURL = Firebug.Dyne.getEditURLNotHTTP(context, location);

    },

    destroy: function()
    {

    },

    open: function(editURL)
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
            FBTrace.sysout("beginWebEditing "+editURL);
            orionWindow.gBrowser.selectedTab = orionWindow.gBrowser.addTab(editURL);
        }
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
                return this.getEditURLbyNetFile(files[i]);
        }
        throw this.noMatchingRequest(url);
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
        var err = new Error(msg + url);
        err.kind = "noMatchingRequest";
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
