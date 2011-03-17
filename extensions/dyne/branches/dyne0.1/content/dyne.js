/* See license.txt for terms of usage */
FBL.ns(function() { with (FBL) {


if (Firebug.ToolsInterface) // 1.8
    var CompilationUnit = Firebug.ToolsInterface.CompilationUnit;

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

    initialize: function()
    {
        Firebug.CSSModule.registerEditor("Orion", this);
        Firebug.ScriptPanel.registerEditor("Source", Firebug.Dyne.JSTextAreaEditor);
        Firebug.ScriptPanel.registerEditor("Orion", this);
    },

    showPanel: function(browser, panel)
    {
        if (!panel)
            return;

        if (panel.name === "script")
        {
            panel.showToolbarButtons("fbToggleJSEditor",  true);
            Firebug.ScriptPanel.updateEditButton();
        }
        else
        {
            panel.showToolbarButtons("fbToggleJSEditor",  false);
        }

    },

    updateOption: function(name, value)
    {
        FBL.dispatch(this.editors, 'updateOption', arguments);
    },

    // **********************************************************************************************

    noActiveEditor: function()
    {
        Firebug.Console.logFormatted(["No active editor for save operation"]);
        Firebug.chrome.selectPanel('console');
    },
    // **********************************************************************************************

    toggleJSEditing: function()
    {
        var panel = Firebug.chrome.getSelectedPanel();
        var panel = panel.context.getPanel("script");
        if (panel.editing)
        {
            this.currentJSEditor.stopEditing(panel.location, Firebug.currentContext);
            panel.editing = false;
        }
        else
        {
            try
            {
                this.currentJSEditor = Firebug.ScriptPanel.getCurrentEditor();
                this.currentJSEditor.startEditing(panel.location, Firebug.currentContext);
                panel.editing = true;
            }
            catch(exc)
            {
                if (FBTrace.DBG_ERRORS)
                    FBTrace.sysout("editor.startEditing ERROR "+exc, {name: Firebug.ScriptPanel.getCurrentEditorName(), currentEditor: this.currentJSEditor, location: panel.location});
            }
        }
    },
    /*
     * Integrate the selected panel with the selected editor
     */
    startEditing: function()
    {
        var panel = Firebug.chrome.getSelectedPanel();
        FBTrace.sysout("dyne.startEditing Firebug.jsDebuggerOn:"+Firebug.jsDebuggerOn)
        var url = Firebug.chrome.getSelectedPanelURL();
        var link = new Firebug.EditLink(panel.context, url, panel);
        Firebug.chrome.select(link);
        FBTrace.sysout("Edit requested "+url);
        return true;
    },

    stopEditing: function()
    {
        FBTrace.sysout("dyne.stopEditing");
    }

});

Firebug.EditLink = function EditLink(context, location, panel)
{
    this.context = context;
    this.originURL = location;
    this.originPanel = panel; // may be null
}

//*****************************************************************************
// A simple text area editor

Firebug.Dyne.JSTextAreaEditor = function(doc)
{
    this.box = this.tag.replace({}, doc, this);
    this.input = this.box.firstChild;
}


// Class methods
Firebug.Dyne.JSTextAreaEditor.startEditing = function(location, context)
{
    location.getSourceLines(-1, -1, function loadSource(unit, firstLineNumber, lastLineNumber, linesRead)
    {
        var scriptPanel = context.getPanel("script");
        var currentEditor = new Firebug.Dyne.JSTextAreaEditor(scriptPanel.document);
        src = linesRead.join("");
        Firebug.Editor.startEditing(scriptPanel.panelNode, src, currentEditor);

        currentEditor.input.scrollTop = scriptPanel.panelNode.scrollTop;
    });
};

Firebug.Dyne.JSTextAreaEditor.stopEditing = function()
{
    Firebug.Editor.stopEditing();
};

Firebug.Dyne.JSTextAreaEditor.prototype = domplate(Firebug.StyleSheetEditor.prototype,
{

});


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
        this.onOrionError = bind(this.onOrionError, this);
        Firebug.Panel.initialize.apply(this, arguments);
        context.orionBoxes = {}; // divs by location
    },

    initializeNode: function(oldPanelNode)
    {
        this.onResizer = bind(this.onResize, this);
        this.resizeEventTarget = Firebug.chrome.$('fbContentBox');
        this.resizeEventTarget.addEventListener("resize", this.onResizer, true);

        Firebug.Panel.initializeNode.apply(this, arguments);

        this.loadingBox = this.document.getElementById('orionLoadingBox');
        if (!this.loadingBox)
        {
            this.loadingBox = this.document.createElement('div');
            this.loadingBox.setAttribute('id', 'orionLoadingBox');
            this.loadingBox.innerHTML = "Loading Orion...";
            collapse(this.loadingBox, true);
            this.panelNode.parentNode.insertBefore(this.loadingBox, this.panelNode);
        }
    },

    destroyNode: function()
    {
        this.resizeEventTarget.removeEventListener("resize", this.onResizer, true);

        if (Firebug.Dyne.orionInPanel)
            Firebug.Dyne.orionInPanel.removeEventListener("orionError", this.onOrionError, true);

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
            editLink.saveURL = this.getEditURLbyURL(editLink.context, editLink.originURL);
            if (editLink.saveURL)
                this.openInWindow(editLink);
            else
                Firebug.Console.logFormatted(["No editing url for "+editLink.originURL, editLink]);
        }
        else
        {
            // Assume the server supports PUT
            this.navigate(editLink.originURL);
        }
    },

    openInWindow: function(editLink)
    {
        var editURL = editLink.saveURL;
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
            Firebug.chrome.selectPanel(editLink.originPanel.name);
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

        this.selectOrionBox(this.location);
    },

    editLocalFile: function()
    {
        this.setSaveAvailable(false);

        var source = FBL.getResource(this.location);
        this.currentEditor.setText(source);
    },

    selectOrionBox: function(location)
    {
        if (this.selectedOrionBox)
            collapse(this.selectedOrionBox, true);

        this.selectedOrionBox = this.context.orionBoxes[location];

        if (this.selectedOrionBox)
            collapse(this.selectedOrionBox, false);
        else
            this.createOrionBox(location);
    },

    createOrionBox: function(location)
    {
        var win = this.document.defaultView;
        win.FBTrace = FBTrace;

        collapse(this.loadingBox, false);

        this.selectedOrionBox = this.document.createElement('div');  // DOM calls always seem easier than domplate...at first.
        this.selectedOrionBox.setAttribute("class", "orionBox");
        this.panelNode.appendChild(this.selectedOrionBox);

        var editLocation = location;
        if (this.isLocalURI(location))
            editLocation = "";  // set editLocal

        var iframe = this.insertOrionScripts(this.selectedOrionBox, location);

        // the element is available synchronously, but orion still needs to load
        var panel = this;
        iframe.contentWindow.addEventListener("load", function orionFrameLoad()
        {
            iframe.contentWindow.removeEventListener('load', orionFrameLoad, true);
            collapse(panel.loadingBox, true);
            FBTrace.sysout("dyne.createOrionBox orion frame load Firebug.jsDebuggerOn "+Firebug.jsDebuggerOn);
            panel.integrateOrion(iframe.contentWindow);
        }, true);

        FBTrace.sysout("dyne.createOrionBox load listener added Firebug.jsDebuggerOn "+Firebug.jsDebuggerOn);
    },

    insertOrionScripts: function(parentElement, location)
    {
        var orionWrapper = "http://localhost:8080/coding.html#";
        var url = orionWrapper + (location || "");
        var width = parentElement.clientWidth + 1;
        var height = parentElement.clientHeight + 1;
        parentElement.innerHTML = "<iframe src='"+url+"' style='border:none;' width='"+width+"' height='"+height+"' scrolling='no' seamless></iframe>";

        var iframes = parentElement.getElementsByTagName('iframe');
        if (iframes.length === 1)
            return iframes[0];

        FBTrace.sysout("dyne insertOrionScripts ERROR "+iframes.length+" frames!");
    },

    insertScriptTag: function(doc, id, url)
    {
        var element = doc.createElementNS("http://www.w3.org/1999/xhtml", "html:script");
        element.setAttribute("type", "text/javascript");
        element.setAttribute("id", id);
        if (!FBTrace.DBG_CONSOLE)
            FBL.unwrapObject(element).firebugIgnore = true;

        element.setAttribute("src", url);
        this.appendToHead(doc, element);

        return element;
    },

    appendToHead: function(doc, child)
    {
        var heads = doc.getElementsByTagName("head");
        if (heads.length)
        {
            heads[0].appendChild(child);
        }
        else
        {
            if (doc.documentElement)
                doc.documentElement.appendChild(element);
            else
            {
                // See issue 1079, the svg test case gives this error
                if (FBTrace.DBG_ERRORS)
                    FBTrace.sysout("lib.addScript doc has no documentElement:", doc);
            }
        }
    },


    dispatch: function(eventName, elt)
    {
         var ev = elt.ownerDocument.createEvent("Events");
         ev.initEvent(eventName, true, false);
         elt.dispatchEvent(ev);
    },

    integrateOrion: function(win)
    {
        this.currentEclipse = win;
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne.integrateOrion "+this.currentEclipse);
        var topContainer = win.dijit.byId('topContainer');
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne.integrateOrion topContainer"+topContainer);
        var editor = topContainer._editorContainer._editor;
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne.integrateOrion editor "+editor, editor);
        this.currentEditor = editor;

        this.attachUpdater();
    },

    attachUpdater: function()
    {
        var model = this.getModel();
        if (this.selection instanceof Firebug.EditLink)
        {
            if (this.isLocalURI(this.location)){
                this.editLocalFile();
            }
            var fromPanel = this.selection.originPanel;
            if (fromPanel.name === "stylesheet")
            {
                var updater = new Firebug.Dyne.CSSStylesheetUpdater(model, fromPanel);
                model.addListener(updater);
                return;
            }
              // TODO a different listener for each kind of file
        }
        FBTrace.sysout("Dyne onEditorReady ERROR no match "+this.selection, this.selection);
    },

    getModel: function()
    {
        return this.currentEditor.getModel();
    },

    reLocalURI: /^chrome:|^file:|^resource:/,
    isLocalURI: function(location)
    {
        return this.reLocalURI.test(location);
    },
    //**************************************************************************************
    onOrionError: function(event)
    {
        var exc = Firebug.Dyne.orion.error;
        Firebug.Console.logFormatted(["Orion exception "+exc, exc]);
        Firebug.chrome.selectPanel('console');
    },

    setSaveAvailable: function(isAvailable)
    {
        $('fbToggleDyneSaveClear').disabled = !isAvailable;
    },

    saveEditing: function()
    {
        FBTrace.sysout("saveEditing "+this.location);
        var saver = new Firebug.Dyne.Saver();
        var src = this.getModel().getText();
        saver.save(this.location, src);
    },

    getLocationList: function()
    {
        return [this.location];
    },

    getObjectDescription: function(url)
    {
        return FBL.splitURLBase(url);
    },

    //*******************************************************************************************************
    show: function(state)
    {
        if (this.useOrionToolbar)
        {
            // Use orion toolbox for now
            var toolbar = Firebug.chrome.$('fbToolbar');
            if (toolbar)
                FBL.collapse(toolbar, true);
        }
        else
        {
            this.showToolbarButtons("fbOrionButtons", true);
            this.showToolbarButtons("fbLocationSeparator", true);
            this.showToolbarButtons("fbLocationButtons", true);
        }

        Firebug.Dyne.saveEditing = bind(this.saveEditing, this);
        // restore state
    },

    hide: function()
    {
        if (this.useOrionToolbar)
        {
            var toolbar = Firebug.chrome.$('fbToolbar');
            if (toolbar)
                FBL.collapse(toolbar, false);
        }
        else
        {
            this.showToolbarButtons("fbOrionButtons", false);
            this.showToolbarButtons("fbLocationSeparator", false);
            this.showToolbarButtons("fbLocationButtons", false);
        }
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

Firebug.Dyne.CSSStylesheetUpdater = function(model, cssPanel)
{
    this.model = model;
    this.cssPanel = cssPanel;
    this.stylesheet = cssPanel.location;
}
var rePriority = /(.*?)\s*(!important)?$/;


Firebug.Dyne.CSSStylesheetUpdater.prototype =
{
    reNameValue: /\s*([^:]*)\s*:\s*(.*?)\s*(!important)?\s*;/,
    // eclipse.TextModel listener
    onChanged: function(start, removedCharCount, addedCharCount, removedLineCount, addedLineCount)
    {
        var changedLineIndex = this.model.getLineAtOffset(start);
        var lineText = this.model.getLine(changedLineIndex);
        if (FBTrace.DBG_DYNE)
        {
            FBTrace.sysout("Firebug.Dyne.CSSStylesheetUpdater onchanged "+changedLineIndex+" "+lineText);
            FBTrace.sysout("Firebug.Dyne.CSSStylesheetUpdater onchanged removed: "+removedCharCount+" added: "+addedCharCount);
        }

        var changedLineNumber = changedLineIndex + 1; // zero based orion to one based Firebug
        var rule = this.cssPanel.getRuleByLine(this.stylesheet, changedLineNumber);

        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("Firebug.Dyne.CSSStylesheetUpdater getRuleByLine("+this.stylesheet+", "+changedLineNumber+"=>"+rule, rule);

        var m = this.reNameValue.exec(lineText);
        if (m)
        {
            var propName = m[1];
            var propValue = m[2];
            var priority = m[3] ? "important" : "";
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("Firebug.Dyne.CSSStylesheetUpdater parsed: "+propName+" :"+propValue+(priority? " !"+priority : "") );
            Firebug.CSSModule.setProperty(rule, propName, propValue, priority);
        }
        else
        {
            FBTrace.sysout("Firebug.Dyne.CSSStylesheetUpdater ERROR no match on "+lineText);
        }

    },

},

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

Firebug.registerStylesheet("chrome://dyne/skin/dyne.css");

Firebug.registerModule(Firebug.Dyne);
Firebug.registerPanel(Firebug.Dyne.OrionPanel);


// ************************************************************************************************
}});
