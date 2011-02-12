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
    editors: [],

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
        this.editors.push(editor);
        editor.initialize();
    },

    unregisterEditor: function(editor)
    {
        editor.destory();
        FBL.remove(editors, editor);
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
        {
            FBTrace.sysout("Retry requested ");
        }
        else
        {
            var location = Firebug.chrome.getSelectedPanelLocation();
            FBTrace.sysout("Edit requested "+location);
            try
            {
                var editor = this.getBestEditorSupportingLocation(Firebug.currentContext, location);
                if (editor)
                {
                    editor.beginEditing(Firebug.currentContext, panel, location);
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

    toString: function()
    {
        // return a string unique for this editor.
    },

    beginEditing: function(context, panel, location)
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
            return this.getEditURLNotHTTP(context, url);
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
        Firebug.Dyne.OrionEditor.initializeOrionPrefs();
    },

    supportsLocation: function(context, location)
    {
        // return an integer. 0 means No. 1 means 'sure', 100 means 'pick me pick me!'
    },

    toString: function()
    {
        return "Orion";
    },

    beginEditing: function(context, panel, location)
    {
        var saveURL = this.getEditURLbyURL(context, location);

        var editURL = saveURL || location

        FBTrace.sysout('dyne.beginEditing this.openInNewWindow: '+Firebug.Dyne.OrionEditor.openInNewWindow+" url "+editURL);
        if (Firebug.Dyne.OrionEditor.openInNewWindow)
            this.openInWindow(editURL);
        else
            this.openInPanel(panel, location);

        // TODO if (saveURL) save
    },

    destroy: function()
    {

    },

    openInWindow: function(editURL)
    {
        var orionWindow = this.orionWindow;
        if(!orionWindow || orionWindow.closed)
        {
            orionWindow = this.orionWindow = FBL.openWindow("Orion", "chrome://browser/content/browser.xul");
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

    openInPanel: function(panel, editURL)
    {
        var source = FBL.getResource(editURL);
        this.inPanel(panel, source);
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
        return editURL; // maybe null
    },

    noEditServerHeader: function(file)
    {
        var msg = "The web page has no x-edit-server header: "; // NLS
        var err = new Error(msg + file.href);
        err.kind = "noEditServerHeader";
        return err;
    },

    noMatchingRequest: function(url)
    {
        var msg = "The Net panel has no request matching "; // NLS
        var err = new Error(msg + url);
        err.kind = "noMatchingRequest";
        return err;
    },
    // ********************************************************************************************
    initializeOrionPrefs: function()
    {
        Firebug.Dyne.OrionEditor.openInNewWindow = Firebug.getPref(Firebug.prefDomain, "orion.openInNewWindow");
        FBTrace.sysout("Firebug.Dyne.OrionEditor ", Firebug.Dyne.OrionEditor);
    },

    updateOption: function(name, value)
    {
        FBTrace.sysout("updateOption "+name +" = "+value);
        if (name === "orion.openInNewWindow")
            Firebug.Dyne.OrionEditor.openInNewWindow = value;
    },

    addEditor: function(panel)
    {
        var orionBox = panel.document.getElementsByClassName('orionEditor')[0];
        if (orionBox)
            return orionBox;

        // append script tag with eclipse source
        if (this.useCompressed)
        {
            var src = FBL.getResource("http://download.eclipse.org/e4/orion/js/org.eclipse.orion.client.editor/orion-editor.js");
            FBL.addScript(panel.document, 'orionEditorScript', src);
        }
        else
        {
            var editorFiles = ["js/editor.js", "js/model.js", "samples/rulers.js", "samples/styler.js",];
            for (var i = 0; i < editorFiles.length; i++)
            {
                var baseUrl = "http://localhost:8080/file/org.eclipse.orion.client.editor/web/";
                // var baseUrl = "chrome://dyne/content/orion/"
                var url = baseUrl + editorFiles[i];
                var src = FBL.getResource(url);
                FBL.addScript(panel.document, 'orionEditorScript_'+i, src);
            }
        }

        // append div to contain lines
        orionBox = panel.document.createElement("div");
        FBL.setClass(orionBox, 'orionEditor');  // mark for orionInPanel to see
        panel.panelNode.appendChild(orionBox);

        // append script tag linking eclipse source to div with lines
        src = FBL.getResource("chrome://dyne/content/orionInPanel.js");
        FBL.addScript(panel.document, 'orionEditConnection', src);
        return orionBox;
    },

    inPanel: function(panel, source)
    {
        var orionBox = this.addEditor(panel);
        var win = panel.document.defaultView;
        win.orion.editText = source; // see orionInPanel.js
        win.FBTrace = FBTrace;
        this.dispatch('orionEdit', orionBox);
        FBL.collapse(panel.selectedSourceBox, true);
    },

    dispatch: function(eventName, elt)
    {
         var ev = elt.ownerDocument.createEvent("Events");
         ev.initEvent(eventName, true, false);
         elt.dispatchEvent(ev);
    },


});

// ************************************************************************************************
// ************************************************************************************************
// Registration

// xxxHonza: what if the stylesheet registration would be as follows:
//Firebug.registerStylesheet("chrome://dyne/skin/dyne.css");

Firebug.registerModule(Firebug.Dyne);

Firebug.Dyne.registerEditor(Firebug.Dyne.OrionEditor);

// ************************************************************************************************
}});
