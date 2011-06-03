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
        Firebug.NetMonitor.NetRequestTable.addListener(Firebug.Dyne.NetRequestTableListener);
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
                    FBTrace.sysout("editor.startEditing ERROR "+exc, {exc: exc, name: Firebug.ScriptPanel.getCurrentEditorName(), currentEditor: this.currentJSEditor, location: panel.location});
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
    },

    onGetTestList: function(testLists)
    {
        testLists.push({
            extension: "Dyne",
            testListURL: "chrome://dyne/content/tests/testList.html"
        });
    },

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
            this.addEditURL(editLink);
            if (editLink.editURL)
                this.openInWindow(editLink);
            else
                Firebug.Console.logFormatted(["No editing url for "+editLink.originURL, editLink]);
        }
        else
        {
            this.addEditURL(editLink);

            FBTrace.sysout("dyne.updateSelection editURL "+editLink.editURL+((this.location === editLink.editURL)?"===":"!==")+this.location, editLink);
            if (this.location !== editLink.editURL)
                this.navigate(editLink.editURL);
            else
                this.attachUpdater();
        }
    },

    openInWindow: function(editLink)
    {
        var editURL = editLink.editURL;
        var orionWindow = this.orionWindow;
        if(!orionWindow || orionWindow.closed)
        {
            orionWindow = this.orionWindow = FBL.openWindow("Orion", "chrome://browser/content/browser.xul");
            function openEditURL()
            {
                FBTrace.sysout("openEditURL "+editURL, editLink);
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

        if (editURL !== this.location)
            FBTrace.sysout("dyne.updateLocation inconsistent "+editURL+" !== "+this.location);

        this.selectOrionBox(this.location);
    },

    editLocalFile: function(fileURL)
    {
        this.setSaveAvailable(false);

        var source = FBL.getResource(fileURL);
        FBTrace.sysout("editLocalFile "+fileURL+" source.length "+source.length);
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

        var iframe = this.insertOrionScripts(this.selectedOrionBox, location);

        // the element is available synchronously, but orion still needs to load
        var panel = this;
        iframe.contentWindow.addEventListener("load", function orionFrameLoad()
        {
            iframe.contentWindow.removeEventListener('load', orionFrameLoad, true);
            collapse(panel.loadingBox, true);
            FBTrace.sysout("dyne.createOrionBox orion frame load "+iframe.contentWindow.location+" Firebug.jsDebuggerOn "+Firebug.jsDebuggerOn);
            panel.integrateOrion(iframe.contentWindow);
        }, true);

        FBTrace.sysout("dyne.createOrionBox load listener added "+location+" Firebug.jsDebuggerOn "+Firebug.jsDebuggerOn);
    },

    getOrionEditorURL: function(url, ourEditor)
    {
        var hash = url.indexOf('#');
        var frontHalf = url.substr(0, hash);
        var segments = frontHalf.split('/');
        //                 http:          /                   /   localhost:8080
        var newFrontHalf = segments[0] + '/' + segments[1] + '/' +segments[2] + '/';

        var backHalf = url.substr(hash);
        return newFrontHalf + ourEditor + backHalf;
    },

    insertOrionScripts: function(parentElement, url)
    {
        var ourEditor = "examples/embeddededitor.html";

        var editorURL = this.getOrionEditorURL(url, ourEditor);

        FBTrace.sysout("insertOrionScripts remap "+url+" to "+editorURL);

        var width = parentElement.clientWidth + 1;
        var height = parentElement.clientHeight + 1;
        parentElement.innerHTML = "<iframe src='"+editorURL+"' style='border:none;' width='"+width+"' height='"+height+"' scrolling='no' seamless></iframe>";

        var iframes = parentElement.getElementsByTagName('iframe');
        if (iframes.length === 1)
            return iframes[0];

        FBTrace.sysout("dyne insertOrionScripts ERROR "+iframes.length+" frames!");
    },

    addScriptFromFile: function(win, id, fileURL) {
        if (Components)
            var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                 .createInstance(Components.interfaces.nsIXMLHttpRequest);
        else
            var req = new XMLHTTPRequest();

        req.open('GET', fileURL, false);
        req.send(null);
        FBTrace.sysout("addScriptFromFile "+fileURL+" to "+id+" in "+win.document.location, req);
        if (req.status === 0)
            var element = FBL.addScript(win.document, id, req.responseText);
        else
            FBTrace.sysout("ERROR failed to read "+fileURL );
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
                doc.documentElement.appendChild(child);
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
        try
        {
            this.currentEclipse = win;

            var baseURL = "chrome://dyne/content/";
            this.addScriptFromFile(win, "_firebugPostObject", baseURL+"postObject.js");

            this.addScriptFromFile(win.parent, "_firebugPostObject", baseURL+"postObject.js");

            this.orionConnection = win.parent.addObjectConnection(win, win.parent, function fnOfObject(obj)
            {
                FBTrace.sysout(" We be cooking with gas!", obj);
            });

            this.orionConnection.registerService("IEditor", null, null);  // TODO

            this.addScriptFromFile(win, "_firebugOrionEditorAdapater", baseURL+"orionEditorAdapter.js");

            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("dyne.integrateOrion "+this.currentEclipse.location, this.currentEclipse);
            var editorContainer = win.dijit.byId('editorContainer');
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("dyne.integrateOrion editorContainer: "+editorContainer, editorContainer);
            var editorContainer = win.orion.embeddedEditor.editorContainer;

            var editor = editorContainer.getEditorWidget();
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("dyne.integrateOrion editor "+editor, editor);
            this.currentEditor = editor;

            this.attachUpdater();
        }
        catch(exc)
        {
            FBTrace.sysout("dyne.integrateOrion ERROR: "+exc, exc);
            return;
            this.panelNode.removeChild(this.selectedOrionBox);
            delete this.location;
            delete this.selectedOrionBox;
        }
    },

    attachUpdater: function()
    {
        var model = this.getModel();
        if (this.selection instanceof Firebug.EditLink)
        {
            if (this.isLocalURI(this.selection.fileURL))
            {
                FBTrace.sysout("attachUpdater "+this.selection.fileURL, this.selection);
                this.editLocalFile(this.selection.fileURL);
            }
            var fromPanel = this.selection.originPanel;
            if (fromPanel.name === "stylesheet")
            {
                var updater = new Firebug.Dyne.CSSStylesheetUpdater(model, fromPanel);
                model.addListener(updater);
                return;
            }
            else if (fromPanel.name === "script")
            {
                var updater = new Firebug.Dyne.CompilationUnitUpdater(model, this, this.selection);
                model.addListener(updater);
                return;
            }
              // TODO a different listener for each kind of file
        }
        FBTrace.sysout("Dyne attachUpdater ERROR no match "+this.selection, this.selection);
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
        $('fbOrionSaveButton').disabled = !isAvailable;
    },

    saveEditing: function()
    {
        FBTrace.sysout("saveEditing "+this.location, this.selection);
        var src = this.getModel().getText();
        if (this.selection.fileURL)
        {
            var saver = new Firebug.Dyne.LocalSaver();
            if (saver.save(this.selection.fileURL, src))
                this.setSaveAvailable(false);
        }
        else
        {
            var saver = new Firebug.Dyne.Saver();
            saver.save(this.location, src);
        }
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

        collapse(this.loadingBox, true);

        delete this.infoTipURL;  // clear the state that is tracking the infotip so it is reset after next show()
        this.panelNode.ownerDocument.removeEventListener("keypress", this.onKeyPress, true);
    },


    //*******************************************************************************************************

    addEditURL: function(editLink)
    {
        if (editLink.originURL.substr(0,4) === "http")
            return this.addEditURLForWebURL(editLink);
        else
            return this.addEditURLNotHTTP(editLink);
    },


    addEditURLNotHTTP: function(editLink)
    {
        var url = editLink.originURL;
        if (url.substr(0,5) === "file:")
        {
            editLink.fileURL = url;
        }
        else
        {
            var uri = FBL.getLocalSystemURI(url);
            var editURL = null;
            if (uri)
                editURL = uri.spec;
            FBTrace.sysout("getLocalSystemURI("+url+")="+(editURL?editURL:"ERROR "), uri);
            editLink.fileURL = editURL;  // better be a file url now
        }


        return this.addEditURLByFileURL(editLink);
    },


    addEditURLByFileURL: function(editLink)
    {
        editLink.editURL = "http://localhost:8080/coding.html";
        return;
        var url = editLink.originURL;
        var unslash = url.split('/');
        while(unslash.length)
        {
            if (unslash.shift() === "fbug")
            {
                editURL += unslash.join('/');
                break;
            }
        }
        FBTrace.sysout("getEditURLByFileURL("+url+")="+editURL);
        return editURL;
    },

    openInPanel: function(panel, editURL)
    {
        var editorPanel = panel.context.getPanel("orion");
        editorPanel.navigate(editURL);

    },

    /*
     * @param url starts with 'http'
     */
    addEditURLForWebURL: function(editLink)
    {
        var files = this.context.netProgress.files;
        for (var i = 0; i < files.length; i++)
        {
            var href = files[i].href;
            href = href.split('?')[0]; // discard query
            href = href.split('#')[0]; // discard fragment

            if (href === editLink.originURL)
                return editLink.editURL = this.getEditURLbyNetFile(files[i]);
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

Firebug.Dyne.CompilationUnitUpdater = function(model, panel, editLink)
{
    this.model = model;
    this.orionPanel = panel;
    this.editLink = editLink;
}

Firebug.Dyne.CompilationUnitUpdater.prototype =
{
    onChanged: function(start, removedCharCount, addedCharCount, removedLineCount, addedLineCount)
    {
        var changedLineIndex = this.model.getLineAtOffset(start);
        var lineText = this.model.getLine(changedLineIndex);
        var changedLineNumber = changedLineIndex + 1; // zero based orion to one based Firebug

        if (FBTrace.DBG_DYNE)
        {
            FBTrace.sysout("Firebug.Dyne.CompilationUnitUpdater onchanged "+changedLineNumber+" "+lineText);
            FBTrace.sysout("Firebug.Dyne.CompilationUnitUpdater onchanged removed: "+removedCharCount+" added: "+addedCharCount);
        }

        this.orionPanel.setSaveAvailable(true);
    },

},


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
    },
}

Firebug.Dyne.LocalSaver = function()
{
}

Firebug.Dyne.LocalSaver.prototype =
{
    save: function(url, src)
    {
        var localFileURI = FBL.makeURI(url);
        if (localFileURI instanceof Ci.nsILocalFile)
        {
            this.writeTextToFile(localFileURI, src);
            return true;
        }
        else
        {
            FBTrace.sysout("Dyne.LocalSaver ERROR not a local file URI "+url, localFileURI);
            return false;
        }
    },

    writeTextToFile: function(file, string)
    {
        try
        {
            // Initialize output stream.
            var outputStream = Cc["@mozilla.org/network/file-output-stream;1"]
                .createInstance(Ci.nsIFileOutputStream);
            outputStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate

            // Store text
            outputStream.write(string, string.length);
            outputStream.close();

            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("Dyne.Saver.writeTextToFile to " + file.path, string);
            return file.path;
        }
        catch (err)
        {
            if (FBTrace.DBG_ERRORS || FBTrace.DBG_DYNE)
                FBTrace.sysout("Dyne.Saver.writeTextToFile; EXCEPTION for "+file.path+": "+err, {exception: err, string: string});
        }
    },
}


// ************************************************************************************************

Firebug.Dyne.MetaOrionPanel = function metaOrionPanel() {};
Firebug.Dyne.MetaOrionPanel.prototype = extend(Firebug.DOMPanel.prototype,
{
    name: "metaorion",
    title: "MetaOrion",
    searchable: false, // TODO
    breakable: false,
    enableA11y: false, // TODO
    order: 70,


    show: function(state)
    {
        if (this.setMetaOrionEditorObject(this.context))
        {
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("dyne.show metaOrion: ", this.metaOrion);

        }
        else
        {
            this.activeWarningTag = Firebug.Dyne.WarningRep.showNotOrion(this.panelNode);
            return;
        }

    },

    setMetaOrionEditorObject: function(context)
    {
        if (context.window.wrappedJSObject.dijit)
        {
            this.metaOrion = {};
            var win = context.window.wrappedJSObject;
            this.metaOrion.topContainer_Widget = win.dijit.byId('topContainer');
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("dyne.setMetaOrionEditorObject topContainer: "+this.metaOrion.topContainer, this.metaOrion.topContainer);
            if (this.metaOrion.topContainer_Widget)
                this.metaOrion.editorContainer = this.metaOrion.topContainer_Widget._editorContainer;
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("dyne.setMetaOrionEditorObject editor "+this.metaOrion.editor, this.metaOrion.editor);
            if (this.metaOrion.editor)
                return this.metaOrion.editor;
        }
        return false;
    },

    getDefaultSelection: function()
    {
        return this.metaOrion;
    },

    hide: function(state)
    {

        if (this.activeWarningTag)
        {
            clearNode(this.panelNode);
            delete this.activeWarningTag;
        }
    },
});

Firebug.Dyne.WarningRep = domplate(Firebug.Rep,
{
    tag:
        DIV({"class": "disabledPanelBox"},
            H1({"class": "disabledPanelHead"},
                SPAN("$pageTitle")
            ),
            P({"class": "disabledPanelDescription", style: "margin-top: 15px;"},
                SPAN("$suggestion")
            )
        ),

    showNotOrion: function(parentNode)
    {
        var args = {
            pageTitle: $STR("dyne.warning.not_Orion"),
            suggestion: "<a>Orion</a>, developing for the web, in the web."
        }

        var box = this.tag.replace(args, parentNode, this);
        var description = box.querySelector(".disabledPanelDescription");
        FirebugReps.Description.render(args.suggestion, description,
            bind(this.openOrionSite, this));

        return box;
     },

     openOrionSite: function()
     {
         Firebug.currentContext.window.location = "http://wiki.eclipse.org/Orion";
     },

});

Firebug.Dyne.NetRequestTableListener = {
    onCreateRequestEntry: function(netRequestTable, row){
        FBTrace.sysout("Firebug.Dyne.NetRequestTableListener ", row);
        if (row.repObject.responseStatus === 404) // then the file was not found
        {
            var headers = row.repObject.responseHeaders;
            for(var i = 0; i < headers.length; i++)
            {
                if (headers[i].name === "X-Edit-Server")
                {
                    var debugCol = row.getElementsByClassName('netDebugCol')[0];
                    debugCol.innerHTML = "<span class='orion404' onclick='Firebug.Dyne.NetRequestTableListener.addNewFile(event)'>add</span>";
                    return;
                }
            }
        }
    },

    addNewFile: function(event)
    {
        var button = event.target;
        var row = FBL.getAncestorByClass(button, 'netRow');
        var netFile = row.repObject;
        var url = getEditURLbyNetFile(netFile);
        window.alert("Need to create "+url);
    }
}

Firebug.Dyne.reloadDyne = function(win)
{
    var srcURL = "chrome://dyne/content/dyne.js";
    var element = Firebug.Dyne.OrionPanel.prototype.insertScriptTag(win.document, "reloadDyne", srcURL);
    FBTrace.sysout("Firebug.Dyne.reloadDyne "+element, element);
}
// ************************************************************************************************
// Registration

Firebug.registerStylesheet("chrome://dyne/skin/dyne.css");

Firebug.registerModule(Firebug.Dyne);
Firebug.registerPanel(Firebug.Dyne.OrionPanel);
Firebug.registerPanel(Firebug.Dyne.MetaOrionPanel);


// ************************************************************************************************
}});
