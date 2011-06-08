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

Firebug.EditLink.prototype =
{
    getOriginPanel: function()
    {
        return this.originPanel;
    },

    getOriginPanelName: function()
    {
        return this.originPanel.name;
    },

    getEditURL: function()
    {
        return this.editURL || this.extractEditURL();
    },

    extractEditURL: function()
    {
        if (this.originURL.substr(0,4) === "http")
            return this.editURL = this.getEditURLForWebURL();
        else
            return this.editURL = this.getEditURLNotHTTP();
    },

    getOrionEditorURL: function(ourEditor)
    {
        var url = this.getEditURL();
        var hash = url.indexOf('#');
        var frontHalf = url.substr(0, hash);
        var segments = frontHalf.split('/');
        //                 http:          /                   /   localhost:8080
        var newFrontHalf = segments[0] + '/' + segments[1] + '/' +segments[2] + '/';

        var backHalf = url.substr(hash);
        return newFrontHalf + ourEditor + backHalf;
    },

    getEditURLNotHTTP: function()
    {
        var url = this.originURL;
        if (url.substr(0,5) === "file:")
        {
            this.fileURL = url;
        }
        else
        {
            var uri = FBL.getLocalSystemURI(url);
            var editURL = null;
            if (uri)
                editURL = uri.spec;
            FBTrace.sysout("getLocalSystemURI("+url+")="+(editURL?editURL:"ERROR "), uri);
            this.fileURL = editURL;  // better be a file url now
        }

        return this.getEditURLByFileURL();
    },

    getEditURLByFileURL: function()
    {
        return "http://localhost:8080/coding.html";
    },

    /*
     * @param url starts with 'http'
     */
    getEditURLForWebURL: function()
    {
        var files = this.context.netProgress.files;
        for (var i = 0; i < files.length; i++)
        {
            var href = files[i].href;
            href = href.split('?')[0]; // discard query
            href = href.split('#')[0]; // discard fragment

            if (href === this.originURL)
                return this.editURL = this.getEditURLbyNetFile(files[i]);
        }
        return "error: getEditURLForWebURL found no netfile matching "+this.originURL;
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

    getBufferURL: function()
    {
        // depends on orion version
        //http://localhost:8080/examples/embeddededitor.html#/file/i/extensions/dyne/branches/dyne0.1/doc/dynedoc.css
        var editURL = this.getEditURL();
        var fragments = editURL.split('#');
        var segments = fragments[0].split('/');
        this.bufferURL = segments.slice(0,3).join('/')+fragments[1];
        return this.bufferURL;
    },

    requestEditBuffer: function(then, orElse)
    {
        var bufferURL = this.getBufferURL();
        FBTrace.sysout("dyne.requestEditBuffer "+bufferURL);
        xhrIO.readAsynchronously(bufferURL, then, orElse);
    },
};

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
        context.orionBoxes = {}; // divs with iframes

        /*FBTrace.sysout("initiailzeUI "+Firebug.Dyne.OrionPanel.openInNewWindow)
        if (Firebug.Dyne.OrionPanel.openInNewWindow && !context.orionPanelNode)
            this.openInWindow(context)
            */
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

    openInWindow: function(context)
    {
        if(!context.orionPanelNode)
        {
            var orionShellURL = "chrome://dyne/content/openInWindowShell.html";
            FBTrace.sysout("Dyne.openInWindow "+orionShellURL);
            var tab = FBL.openNewTab(orionShellURL);
            var newTabBrowser = window.gBrowser.getBrowserForTab(tab);
            function createOrionPanelNode()
            {
                context.orionPanelNode = newTabBrowser.contentDocument.body.innerHTML = "<div id='orionPanel'>hello world</div>";
                FBTrace.sysout("dyne.openInNewWindow crated panel node");
                newTabBrowser.removeEventListener("load", createOrionPanelNode, true);
            }
            newTabBrowser.addEventListener("load", createOrionPanelNode, true);
        }
    },

    updateSelection: function(selection)
    {
        if (selection instanceof Firebug.EditLink)
            this.navigate(selection);
    },

    updateLocation: function(editLink)
    {
        if (!editLink)
            return;

        var editURL = editLink.getEditURL();

        FBTrace.sysout("dyne.updateLocation editURL "+editURL, editLink);
        if (!editURL)
            return;

        this.selectOrionBox(this.location);
    },

    editLocalFile: function(fileURL)
    {
        this.setSaveAvailable(false);

        var source = FBL.getResource(fileURL);
        FBTrace.sysout("editLocalFile "+fileURL+" source.length "+source.length);
        this.currentEditor.setText(source);
    },

    selectOrionBox: function(editLink)
    {
        if (this.selectedOrionBox)
            collapse(this.selectedOrionBox, true);

        var editURL = editLink.getEditURL();
        this.selectedOrionBox = this.context.orionBoxes[editURL];

        if (this.selectedOrionBox)
            collapse(this.selectedOrionBox, false);
        else
            this.context.orionBoxes[editURL] = this.createOrionBox(editLink);
    },

    createOrionBox: function(editLink)
    {
        collapse(this.loadingBox, false);  // show the loading message until Orion is loaded

        this.selectedOrionBox = this.document.createElement('div');  // DOM calls always seem easier than domplate...at first.
        this.selectedOrionBox.setAttribute("class", "orionBox");

        var connectionContainer = new Firebug.Dyne.OrionConnectionContainer(editLink);
        this.selectedOrionBox.connectionContainer = connectionContainer;

        this.panelNode.appendChild(this.selectedOrionBox);

        var iframe = this.insertOrionScripts(this.selectedOrionBox, editLink);

        // the element is available synchronously, but orion still needs to load
        var panel = this;

        iframe.contentWindow.addEventListener("load", function orionFrameLoad()
        {
            iframe.contentWindow.removeEventListener('load', orionFrameLoad, true);
            collapse(panel.loadingBox, true);  // pull down the loading message

            FBTrace.sysout("dyne.createOrionBox orion frame load "+iframe.contentWindow.location+" Firebug.jsDebuggerOn "+Firebug.jsDebuggerOn);
            connectionContainer.integrateOrion(iframe.contentWindow);
            connectionContainer.attachOrion(iframe.contentWindow);
            FBTrace.sysout("document after integrate", iframe.contentWindow.document);
        }, true);

        FBTrace.sysout("dyne.createOrionBox load listener added "+editLink.getEditURL()+" Firebug.jsDebuggerOn "+Firebug.jsDebuggerOn);
        return this.selectedOrionBox;
    },

    insertOrionScripts: function(parentElement, editLink)
    {
        var ourEditor = "examples/editor/embeddededitor.html";

        var editorURL = editLink.getOrionEditorURL(ourEditor);

        FBTrace.sysout("insertOrionScripts remap "+editLink.getEditURL()+" to "+editorURL);

        var width = parentElement.clientWidth + 1;
        var height = parentElement.clientHeight + 1;
        parentElement.innerHTML = "<iframe src='"+editorURL+"' style='border:none;' width='"+width+"' height='"+height+"' scrolling='no' seamless></iframe>";

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

    getObjectDescription: function(editLink)
    {
        return FBL.splitURLBase(editLink.getEditURL());
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


// Once we narrow down to a orionbox <-> location, then we have
// loaded Orion, so location here is just the editable file
Firebug.Dyne.OrionConnectionContainer = function(location)
{
    // this object is created before orion is loaded and attached to the orionbox
    this.location = location; // the orionbox location
};

Firebug.Dyne.OrionConnectionContainer.prototype =
{
    integrateOrion: function(win)
    {
        try
        {
            win.wrappedJSObject.FBTrace = FBTrace;

            var baseURL = "chrome://dyne/content/";
            Firebug.Dyne.Util.addScriptFromFile(win, "_firebugPostObject", baseURL+"postObject.js");

            FBTrace.sysout("adding orionEditorAdapter")
            Firebug.Dyne.Util.addScriptFromFile(win, "_firebugOrionEditorAdapater", baseURL+"orionEditorAdapter.js");
        }
        catch(exc)
        {
            FBTrace.sysout("dyne.integrateOrion ERROR: "+exc, exc);
        }
    },

    attachOrion: function(win)
    {
        try
        {
            this.orionWindow = win;

            this.orionConnection = jsonConnection.add(win.document.documentElement, FBL.bind(this.orionEventHandler, this));
        }
        catch(exc)
        {
            FBTrace.sysout("dyne.attachOrion ERROR: "+exc, exc);
        }
    },

    orionEventHandler: function(obj)
    {
        FBTrace.sysout(" We be cooking with gas!", obj);
        this.attachUpdater();
        var bufferURL = this.location.getBufferURL();
        this.location.requestEditBuffer(FBL.bind(this.loadFile, this), function errorMessage()
        {
            FBTrace.sysout("ERROR: edit request fails for "+bufferURL, event);
        });
    },

    loadFile: function(text)
    {
        FBTrace.sysout("loadFile "+this.location.getEditURL()+" -> "+text.length);
        this.orionConnection.callService("IEditor", "onInputChange", [this.location.getEditURL(),null, text]);
      //  this.orionConnection.callService("ISyntaxHighlighter", "onInputChange", [this.location.getEditURL(),null, text]);
    },

    attachUpdater: function()
    {
        if (this.isLocalURI(this.location))
        {
            FBTrace.sysout("attachUpdater "+this.location, this.selection);
            this.editLocalFile(this.location);
        }
        var fromPanel = this.location.getOriginPanelName();
        if (fromPanel === "stylesheet")
        {
            var updater = new Firebug.Dyne.CSSStylesheetUpdater(this.location);
            this.orionConnection.registerService("IEditor", null, updater);
            return;
        }
        else if (fromPanel === "script")
        {
            var updater = new Firebug.Dyne.CompilationUnitUpdater(model, this, this.location);
            this.orionConnection.registerService("IEditor", null, updater);
            return;
        }
        // TODO a different listener for each kind of file
        FBTrace.sysout("Dyne attachUpdater ERROR no match "+this.location.getEditURL(), this.location);
    },

    reLocalURI: /^chrome:|^file:|^resource:/,
    isLocalURI: function(location)
    {
        return this.reLocalURI.test(location);
    },

};

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


Firebug.Dyne.CSSStylesheetUpdater = function(editLink)
{
    this.cssPanel = editLink.getOriginPanel();
    this.stylesheet = this.cssPanel.location;
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


Firebug.Dyne.Util =
{
        addScriptFromFile: function(win, id, fileURL) {
            return FBL.addScript(win.document, id, xhrIO.readSynchronously(fileURL));
        },


}
// ************************************************************************************************
// Registration

Firebug.registerStylesheet("chrome://dyne/skin/dyne.css");

Firebug.registerModule(Firebug.Dyne);
Firebug.registerPanel(Firebug.Dyne.OrionPanel);
//Firebug.registerPanel(Firebug.Dyne.MetaOrionPanel);


// ************************************************************************************************
}});
