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

// Deals with global UI sync
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
    },

    unregisterEditor: function(editor)
    {
        FBL.remove(editors, editor);
    },

    noActiveEditor: function()
    {
        Firebug.Console.logFormatted(["No active editor for save operation"]);
        Firebug.chrome.selectPanel('console');
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
            var link = new Firebug.EditLink(panel.context, location, panel);
            Firebug.chrome.select(link);
            FBTrace.sysout("Edit requested "+location);
        }
    },

});

Firebug.EditLink = function EditLink(context, location, panel)
{
    this.context = context;
    this.originLocation = location;
    this.originPanel = panel; // may be null
}

Firebug.Dyne.OrionPanel = function dynePanel() {};

Firebug.Dyne.OrionPanel.prototype = extend(Firebug.Panel,
{
    name: "orion",
    title: "Orion",
    searchable: false, // TODO
    breakable: false,
    enableA11y: false, // TODO
    order: 70,

    initialize: function(context, doc)
    {
        this.location = null;
        this.initializeOrionPrefs();
        Firebug.Panel.initialize.apply(this, arguments);
    },

    initializeNode: function(oldPanelNode)
    {
        this.onResizer = bind(this.onResize, this);
        this.resizeEventTarget = Firebug.chrome.$('fbContentBox');
        this.resizeEventTarget.addEventListener("resize", this.onResizer, true);

        Firebug.Panel.initializeNode.apply(this, arguments);
    },

    destroyNode: function()
    {
        this.resizeEventTarget.removeEventListener("resize", this.onResizer, true);

        Firebug.Panel.destroyNode.apply(this, arguments);
    },

    onResize: function()
    {
    },

    //*******************************************************************************************************
    supportsObject: function(object, type)
    {
        return (object instanceof Firebug.EditLink) ? 10 : false;  // TODO examine location to see if it is Orion
    },

    updateSelection: function(editLink)
    {
        if (Firebug.Dyne.OrionPanel.openInNewWindow)
        {
            var saveURL = this.getEditURLbyURL(editLink.context, editLink.originLocation);
            if (saveURL)
                this.openInWindow(editLink);
            else
                Firebug.Console.logFormatted(["No editing url for "+editLink.originLocation, editLink]);
        }
        else
        {
            // Assume the server supports PUT
            this.navigate(editLink.originLocation);
        }
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

    // location is something we can PUT to
    updateLocation: function(editURL)
    {
        if (!editURL)
            return;

        this.editInPanel();
    },

    editInPanel: function ()
    {
        this.orion = this.addEditor();  // an object in the panel window scope

        this.setSaveAvailable(false);

        var source = FBL.getResource(this.location);
        this.orion.editText = source; // see orionInPanel.js
        this.dispatch('orionEdit', this.orion.box);

        this.onOrionReady(); // TODO async event
    },

    addEditor: function()
    {
        var orionBox = this.document.getElementsByClassName('orionEditor')[0];
        if (orionBox)
            return orionBox;

        // append script tag with eclipse source
        if (this.useCompressed)
        {
            var src = FBL.getResource("http://download.eclipse.org/e4/orion/js/org.eclipse.orion.client.editor/orion-editor.js");
            FBL.addScript(this.document, 'orionEditorScript', src);
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
                FBL.addScript(this.document, 'orionEditorScript_'+i, src);
            }
        }

        // append div to contain lines
        orionBox = this.panelNode;
        FBL.setClass(orionBox, 'orionEditor');  // mark for orionInPanel to see

        // append script tag linking eclipse source to div with lines
        src = FBL.getResource("chrome://dyne/content/orionInPanel.js");
        FBL.addScript(this.document, 'orionEditorCode', src);

        var win = this.document.defaultView;
        win.FBTrace = FBTrace;
        win.orion.box = orionBox;

        return win.orion;
    },

    dispatch: function(eventName, elt)
    {
         var ev = elt.ownerDocument.createEvent("Events");
         ev.initEvent(eventName, true, false);
         elt.dispatchEvent(ev);
    },

    getModel: function()
    {
        return this.orion.editor.getModel();
    },

    onOrionReady: function(event)
    {
        var model = this.getModel();
        model.addListener(this);
    },

    // eclipse.TextModel listener
    onChanged: function()
    {
        FBTrace.sysout("dyne eclipse.TextModel onchanged "+this);
        this.setSaveAvailable(true);
    },

    setSaveAvailable: function(isAvailable)
    {
        $('fbToggleDyneSaveClear').disabled = !isAvailable;
    },

    saveEditing: function()
    {
        FBTrace.sysout("saveEditing "+this.location); // TODO need PUT
        var saver = new Firebug.Dyne.Saver();
        var src = this.getModel().getText();
        saver.save(this.location, src);
    },

    getLocationList: function()
    {
        return [this.location];
    },


    //*******************************************************************************************************
    show: function(state)
    {
        this.showToolbarButtons("fbEditorButtons", true);
        this.showToolbarButtons("fbLocationSeparator", true);
        this.showToolbarButtons("fbLocationButtons", true);

        Firebug.Dyne.saveEditing = bind(this.saveEditing, this);;

        //this.panelNode.ownerDocument.addEventListener("keypress", this.onKeyPress, true);

        // restore state
    },

    hide: function()
    {
        this.showToolbarButtons("fbEditorButtons", false);
        this.showToolbarButtons("fbLocationSeparator", false);
        this.showToolbarButtons("fbLocationButtons", false);

        Firebug.Dyne.saveEditing = Firebug.Dyne.noActiveEditor;

        delete this.infoTipURL;  // clear the state that is tracking the infotip so it is reset after next show()
        this.panelNode.ownerDocument.removeEventListener("keypress", this.onKeyPress, true);
    },


    //*******************************************************************************************************

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


    openInPanel: function(panel, editURL)
    {
        var editorPanel = panel.context.getPanel("orion");
        editorPanel.navigate(editURL);

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
        Firebug.Dyne.OrionPanel.openInNewWindow = Firebug.getPref(Firebug.prefDomain, "orion.openInNewWindow");
        FBTrace.sysout("Firebug.Dyne.OrionPanel ", Firebug.Dyne.OrionPanel);
    },

    updateOption: function(name, value)
    {
        FBTrace.sysout("updateOption "+name +" = "+value);
        if (name === "orion.openInNewWindow")
            Firebug.Dyne.OrionPanel.openInNewWindow = value;
    },

});

Firebug.Dyne.Saver = function dyneSaver(onSaveSuccess)
{
    var request = new XMLHttpRequest();
    request.onreadystatechange = function(event)
    {
        FBTrace.sysout("Saver onreadystatechange "+request.readyState, event);
        if (request.readyState === 4)
        {
            if (request.status === 200)
            {
                // onSaveSuccess();
            }
        }
    }
    request.addEventListener("progress", function updateProgress(event)
    {
        if (event.lengthComputable)
        {
            var percentComplete = event.loaded / event.total;
            FBTrace.sysout("Save progress "+percentComplete, event);
        }

    }, false);

    request.addEventListener("load", function transferComplete(event)
    {
        FBTrace.sysout("Save load", event);
    }, false);

    request.addEventListener("error", function transferFailed(event)
    {
        FBTrace.sysout("Save error", event);
    }, false);

    request.addEventListener("abort", function transferCanceled(event)
    {
        FBTrace.sysout("Save abort", event);
    }, false);

    this.request = request;
}

Firebug.Dyne.Saver.prototype =
{
    save: function(url, src)
    {
        this.request.open("PUT", url, true);
        this.request.send(src);
    }
}

// ************************************************************************************************
// ************************************************************************************************
// Registration

// xxxHonza: what if the stylesheet registration would be as follows:
Firebug.registerStylesheet("chrome://dyne/skin/dyne.css");

Firebug.registerModule(Firebug.Dyne);
Firebug.registerPanel(Firebug.Dyne.OrionPanel);

Firebug.Dyne.registerEditor(Firebug.Dyne.OrionPanel);

// ************************************************************************************************
}});
