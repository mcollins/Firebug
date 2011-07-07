/* See license.txt for terms of usage */
FBL.ns(function() { with (FBL) {


if (Firebug.ToolsInterface) // 1.8
    var CompilationUnit = Firebug.ToolsInterface.CompilationUnit;


// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
//Dom should be module
var Dom = {};
Dom.domUtils = Cc["@mozilla.org/inspector/dom-utils;1"].getService(Ci.inIDOMUtils);
Components.utils.import("resource://dyne/globalWindowExchange.jsm");
// ************************************************************************************************

// Register string bundle of this extension so, $STR method (implemented by Firebug)
// can be used. Also, perform the registration here so, localized strings used
// in template definitions can be resolved.
Firebug.registerStringBundle("chrome://dyne/locale/dyne.properties");

// ************************************************************************************************
/*
var config = Firebug.getModuleLoaderConfig();
config.paths.parser = "dyne_rjs/parser";
require(config,['parser/uglifyFirebug'], function(Parser)
{
    FBTrace.sysout("parser loaded");
});
*/

// Deals with global UI sync
Firebug.Dyne = extend(Firebug.Module,
{
    dispatchName: "dyne",
    orions: [],

    initialize: function()
    {
        Firebug.CSSModule.registerEditor("Orion", this);
        Firebug.ScriptPanel.registerEditor("Source", Firebug.Dyne.JSTextAreaEditor);
        Firebug.ScriptPanel.registerEditor("Orion", this);
        Firebug.NetMonitor.NetRequestTable.addListener(Firebug.Dyne.NetRequestTableListener);
    },

    destroy: function()
    {
        Firebug.CSSModule.unregisterEditor("Orion", this);
        Firebug.ScriptPanel.unregisterEditor("Source", Firebug.Dyne.JSTextAreaEditor);
        Firebug.ScriptPanel.unregisterEditor("Orion", this);
        Firebug.NetMonitor.NetRequestTable.removeListener(Firebug.Dyne.NetRequestTableListener);
        var left = globalWindowExchange.removeListener(this);
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne destroy globalWindowExchange listeners "+left);
    },

    showPanel: function(browser, panel)
    {
        if (!panel)
            return;

        // Modify the panels dynamically
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
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne.startEditing Firebug.jsDebuggerOn:"+Firebug.jsDebuggerOn)
        var url = Firebug.chrome.getSelectedPanelURL();
        var editLink = new Firebug.EditLink(panel.context, url, panel);
        // for embedded
        // Firebug.chrome.select(link);
        var editorURL = editLink.getEditURL();
        var connectionContainer = this.orions[editorURL];
        if (connectionContainer)  // we opened orion
        {
            var orionWin = connectionContainer.focusOrion();  // but it failed
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("dyne.startEditing focusOrion: "+(orionWin && orionWin.location) );
            if (!orionWin || orionWin.location.toString() !== editorURL)
            {
                delete this.orions[editorURL];
                connectionContainer = null;
            }
            // else we have orion window connection
        }
        if (!connectionContainer)
        {
            connectionContainer = new Firebug.Dyne.OrionConnectionContainer(editLink);
            this.orions[editorURL] = connectionContainer;
            var win = connectionContainer.openOrion(editorURL);
            FBTrace.sysout("dyne startEditing connectionContainer win: "+win, win);
        }

        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("Edit requested "+url);
        return true;
    },

    stopEditing: function()
    {
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne.stopEditing");
    },

    onGetTestList: function(testLists)
    {
        testLists.push({
            extension: "Dyne",
            testListURL: "chrome://dyne/content/tests/testList.html"
        });
    },
    // *******************************************************************************
    reFirebugPlugin: /firebugConnection\.html$/,
    watchWindow: function(context, win)
    {
        var loc = win.location.toString();
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne watchWindow "+loc+" in "+window.top.location);

        if ( loc.indexOf("firebugConnection.html") !== -1) // then we are in an orion window
        {
            if (Firebug.isInBrowser()) // don't show Firebug in the Orion editor window
                Firebug.minimizeBar();
            var left = globalWindowExchange.removeListener(this);  // don't listen to the global events in this XUL window
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout('dyne found firebugConnection in '+win.location+" removed self, left "+left, win);
            globalWindowExchange.onWindowAdded(win);
        }
    },

    onWindowAdded: function(win)
    {
        var connectionContainer = Firebug.Dyne.orions[win.top.location.toString()];
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne onWindowAdded "+win.location+" win.top "+win.top.location+" finds "+connectionContainer, Firebug.Dyne.orions);
        if (connectionContainer)
            connectionContainer.attachOrion(win);
    },

    unwatchWindow: function(context, win)
    {
        var loc = win.location.toString();
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne unwatchWindow "+loc+" in "+window.top.location);

        if ( loc.indexOf("firebugConnection.html") !== -1)
        {
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout('dyne.unwatchWindow found firebugConnection in '+win.location, win);
            globalWindowExchange.onWindowRemoved(win, window.top);
        }
    },

    onWindowRemoved: function(win, outerXULWindow)
    {
        var connection = this.orions[win.top.location];
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("onWindowRemoved "+win.location+" outerXULWindow "+outerXULWindow.location+ " has "+connection);
        if (connection)
        {
            connection.disconnectOnUnload(outerXULWindow);
            delete this.orions[win.top.location];
        }
    },

    getTabAttribute: function(editorURL)
    {
        var connection = this.orions[editorURL];
        if (connection)
            return "firebug-orion-tab_"+connection.getUID();
        else
            throw new Error("dyne.getTabAttribute no connection for editorURL "+editorURL);
    },

    getScreenDescription: function(win)
    {
        var screen =
        {
            screenX: win.screenX,
            screenY: win.screenY,
            innerWidth: win.innerWidth,
            innerHeight: win.innerHeight,
        };
        return JSON.stringify(screen);
    },

    storeScreenInfo: function(outerXULWindow)
    {
        Firebug.Options.set("orion.editWindowPosition", this.getScreenDescription(outerXULWindow));
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne set screen info from "+outerXULWindow.location+" "+this.getScreenDescription(outerXULWindow));
    },

    getScreenInfo: function()
    {
        var str = Firebug.Options.get("orion.editWindowPosition");
        try
        {
            if (str)
                return JSON.parse(str);
        }
        catch(exc)
        {
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("dyne.getScreenInfo ERROR "+esc, exc);
        }

    },

});


Firebug.EditLink = function EditLink(context, location, panel)
{
    this.context = context;
    this.originURL = location;
    this.originPanel = panel; // may be null
}

Firebug.EditLink.uid = 0;
Firebug.EditLink.linkByURL = {};

Firebug.EditLink.prototype =
{
    getUID: function()
    {
        if (this.uid)
            return this.uid;

        return this.uid = ++Firebug.EditLink.uid;
    },

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
            if (FBTrace.DBG_DYNE)
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
        if (FBTrace.DBG_DYNE)
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



// Once we narrow down to a orionbox <-> location, then we have
// loaded Orion, so location here is just the editable file
Firebug.Dyne.OrionConnectionContainer = function(location)
{
    // this object is created before orion is loaded and attached to the orionbox
    this.location = location; // the orionbox location
    this.uid = ++Firebug.Dyne.orionConnections;
};

Firebug.Dyne.orionConnections = 0;


Firebug.Dyne.OrionConnectionContainer.prototype =
{
    getUID: function()
    {
        return this.uid;
    },

    openOrion: function(editorURL)
    {
        var attr = Firebug.Dyne.getTabAttribute(editorURL);
        var screen = Firebug.Dyne.getScreenInfo();
        var win = Firebug.Dyne.Util.openOrReuseByAttribute(attr, editorURL, screen);

        // The globalWindowExchange will call attachOrion when the window opens
        var left = globalWindowExchange.addListener(Firebug.Dyne);
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne openOrion globalWindowExchange.addListener, now "+left);
        return win;
    },

    /*
     * Find orion for this.location, focus it, and return browser.contentWindow
     * return false for no find orion at this.location
     */
    focusOrion: function()
    {
        return Firebug.Dyne.Util.findAndFocusByAttribute(Firebug.Dyne.getTabAttribute(this.location.getEditURL()));
    },

    attachOrion: function(win)
    {
        try
        {
            this.orionWindow = win;
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("attachOrion win.document ", win.document);
            this.connectionFunction = this.connectOnLoad.bind(this, win);
            win.addEventListener('load', this.connectionFunction, false);
        }
        catch(exc)
        {
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("dyne.attachOrion ERROR: "+exc, exc);
        }
    },

    connectOnLoad: function(win, event)
    {
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("connectOnLoad connection to "+win.document.location);
        this.eventHandler = FBL.bind(this.orionEventHandler, this);
        this.orionConnection = jsonConnection.add(win.document.documentElement, this.eventHandler);
        this.orionConnection.postObject({connection: "dyne is ready"});
        win.removeEventListener('load', this.connectionFunction, false);

        var left = globalWindowExchange.removeListener(Firebug.Dyne);
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne connectOnLoad globalWindowExchange.removeListener, left "+left);

        delete this.connectionFunction;
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("connectOnLoad connection posted ready");
    },

    disconnectOnUnload: function(win, event)
    {
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("disconnectOnUnload  "+win.document.location);
        Firebug.Dyne.storeScreenInfo(win);
        this.orionConnection.disconnect();
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("disconnectOnUnload done");
    },

    orionEventHandler: function(obj)
    {
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout(" We be cooking with gas!", obj);
        if (obj.disconnect)
        {
            this.detachUpdater();
            this.orionConnection.unregisterService("IConsole", null, this.logger);
        }
        else if (obj.connection)
        {
            this.orionConnection.registerService("IConsole", null, this.logger);
            this.attachUpdater();
        }
        else
        {
            FBTrace.sysout("Unexpected message from Orion ", obj);
        }
    },

    logger:
    {
        log:function()
        {
            FBTrace.sysout("OrionConnection: "+arguments[0], arguments);
        }
    },

    orionEdit: function()
    {
        var bufferURL = this.location.getBufferURL();
        this.location.requestEditBuffer(FBL.bind(this.loadFile, this), function errorMessage()
        {
            FBTrace.sysout("ERROR: edit request fails for "+bufferURL, event);
        });
    },

    loadFile: function(text)
    {
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("loadFile "+this.location.getEditURL()+" -> "+text.length);
        var contentName = this.location.getEditURL();
        this.orionConnection.callService("IEditor", "onInputChange", [contentName, null, text]);
      //  this.orionConnection.callService("ISyntaxHighlighter", "onInputChange", [this.location.getEditURL(),null, text]);
    },

    /*
     * Connect to handle events from Orion to Firebug
     */
    attachUpdater: function()
    {
        if (this.updater)
            this.detachUpdater();

        if (this.isLocalURI(this.location))
        {
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("attachUpdater "+this.location, this.selection);
            this.editLocalFile(this.location);
        }
        var fromPanel = this.location.getOriginPanelName();
        if (fromPanel === "stylesheet")
        {
            this.updater = new Firebug.Dyne.CSSStylesheetUpdater(this.location, this.orionConnection);
            this.orionConnection.registerService(this.updater.API, null, this.updater);
            Firebug.CSSModule.addListener(this.updater);
            FBTrace.sysout("Firebug.CSSModule.addListener ", this.updater);
            return;
        }
        else if (fromPanel === "script")
        {
            this.updater = new Firebug.Dyne.CompilationUnitUpdater(this.location);
            this.orionConnection.registerService("IJavaScript", null, this.updater);
            return;
        }
        // TODO a different listener for each kind of file
        FBTrace.sysout("Dyne attachUpdater ERROR no match "+this.location.getEditURL(), this.location);
    },

    detachUpdater: function()
    {
        this.orionConnection.unregisterService(this.updater.API, null, this.updater);
        Firebug.CSSModule.removeListener(this.updater);
    },

    reLocalURI: /^chrome:|^file:|^resource:/,
    isLocalURI: function(location)
    {
        return this.reLocalURI.test(location);
    },

};

Firebug.Dyne.CompilationUnitUpdater = function(editLink)
{
    this.scriptPanel = editLink.getOriginPanel();
    this.compilationUnit = this.scriptPanel.location;
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

Firebug.Dyne.CSSStylesheetUpdater = function(editLink, orionConnection)
{
    this.cssPanel = editLink.getOriginPanel();
    this.stylesheet = this.cssPanel.location;
    this.orionConnection = orionConnection;
}

var rePriority = /(.*?)\s*(!important)?$/;

Firebug.Dyne.CSSStylesheetUpdater.prototype =
{
    // **********************************************************
    // For edit events starting in Orion and updating in Firebug
    API: "IStylesheet",

    reNameValue: /\s*([^:]*)\s*:\s*(.*?)\s*(!important)?\s*;/,
    onRuleLineChanged: function(changedLineNumber, lineText)
    {
         if (FBTrace.DBG_DYNE)
                FBTrace.sysout("Firebug.Dyne.CSSStylesheetUpdater onRuleLineChanged "+changedLineNumber+" "+lineText);

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
                FBTrace.sysout(FBL.getWindowId(window)+" Firebug.Dyne.CSSStylesheetUpdater parsed: "+propName+" :"+propValue+(priority? " !"+priority : "") );
            try
            {
                this.suppressSelf = true;
                Firebug.CSSModule.setProperty(rule, propName, propValue, priority);
            }
            finally
            {
                this.suppressSelf = false;
            }

        }
        else
        {
            FBTrace.sysout("Firebug.Dyne.CSSStylesheetUpdater ERROR no match on "+lineText);
        }

    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // For edit events starting in Firebug and updating Orion
    // CSSModule Change Listener

    onCSSInsertRule: function(styleSheet, cssText, ruleIndex)
    {
        if (this.suppressSelf)
            return;

        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne onCSSInsertRule", arguments);
        var rule = styleSheet.cssRules[ruleIndex];
        var selectorLine = Dom.domUtils.getRuleLine(rule);
        var event = {
                selectorLine: selectorLine,  // insert before this current selectorLine
                cssText: cssText,
                };
        this.orionConnection.postObject({onCSSDeleteRule: event});
    },

    onCSSDeleteRule: function(styleSheet, ruleIndex)
    {
        if (this.suppressSelf)
            return;

        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne onCSSDeleteRule", arguments);
        var rule = styleSheet.cssRules[ruleIndex];
        var selectorLine = Dom.domUtils.getRuleLine(rule);
        var event = {
                selectorLine: selectorLine,
                };
        this.orionConnection.postObject({onCSSDeleteRule: event});
    },

    onCSSSetProperty: function(style, propName, propValue, propPriority, prevValue,
        prevPriority, rule, baseText)
    {
        if (this.suppressSelf)
            return;

        if (FBTrace.DBG_DYNE)
            FBTrace.sysout(FBL.getWindowId(window)+" dyne onCSSSetProperty ", {args: arguments, updater: this});
        var selectorLine = Dom.domUtils.getRuleLine(rule);
        var event = {
                selectorLine: selectorLine,
                propName: propName,
                propValue: propValue,
                propPriority: propPriority,
                prevValue: prevValue,
                prevPriority: prevPriority
                };
        this.orionConnection.postObject({onCSSSetProperty: event});
    },

    onCSSRemoveProperty: function(style, propName, prevValue, prevPriority, rule, baseText)
    {
        if (this.suppressSelf)
            return;

        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("dyne onCSSRemoveProperty", arguments);
        var selectorLine = Dom.domUtils.getRuleLine(rule);
        var event = {
                selectorLine: selectorLine,
                propName: propName,
                prevValue: prevValue,
                prevPriority: prevPriority
                };
        this.orionConnection.postObject({onCSSRemoveProperty: event});
    }
},


Firebug.Dyne.Saver = function dyneSaver(onSaveSuccess)
{
    var request = new XMLHttpRequest();
    request.onreadystatechange = function(event)
    {
        if (FBTrace.DBG_DYNE)
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
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("Save progress "+percentComplete, event);
        }

    }, false);

    request.addEventListener("load", function transferComplete(event)
    {
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("Save load", event);
    }, false);

    request.addEventListener("error", function transferFailed(event)
    {
        if (FBTrace.DBG_DYNE)
            FBTrace.sysout("Save error", event);
    }, false);

    request.addEventListener("abort", function transferCanceled(event)
    {
        if (FBTrace.DBG_DYNE)
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
            if (FBTrace.DBG_DYNE)
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

Firebug.Dyne.NetRequestTableListener =
{
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
    if (FBTrace.DBG_DYNE)
        FBTrace.sysout("Firebug.Dyne.reloadDyne "+element, element);
}

Components.utils.import("resource://gre/modules/Services.jsm");

Firebug.Dyne.Util =
{
        addScriptFromFile: function(win, id, fileURL) {
            return FBL.addScript(win.document, id, xhrIO.readSynchronously(fileURL));
        },

        getWindowManager: function()
        {
            return this.wm || (this.wm = Cc["@mozilla.org/appshell/window-mediator;1"]
                .getService(Ci.nsIWindowMediator));
        },

        findAndFocusByAttribute: function(attrName)
        {
            return this.findByAttribute(attrName, function selectTab(navigator, currentTab)
            {
                var tabbrowser = navigator.gBrowser;
                // Yes--select and focus it.
                tabbrowser.selectedTab = currentTab;

                // Focus *this* browser window in case another one is currently focused
                tabbrowser.ownerDocument.defaultView.focus();
                return tabbrowser.currentBrowser.contentWindow;
            });
        },

        findByAttribute: function(attrName, fnOfWindowAndTab)
        {
            var navigators = this.getWindowManager().getEnumerator('navigator:browser');

            while(navigators.hasMoreElements())
            {
                var navigator = navigators.getNext();
                var tabbrowser = navigator.gBrowser;
                var nBrowsers = tabbrowser.tabContainer.childNodes.length;
                for (var index = 0; index < nBrowsers; index++)
                {
                    // Get the next tab
                    var currentTab = tabbrowser.tabContainer.childNodes[index];

                    // Does this tab contain our custom attribute?
                    if (currentTab.hasAttribute(attrName))
                        return fnOfWindowAndTab(navigator, currentTab);
                }
            }
            FBTrace.sysout("dyne no findByAttribute "+attrName);
            return false;
        },

        openAndMarkTab: function(attrName, url, screen)
        {
            // Our tab isn't open. Open it now.
            if (screen)
            {
                var features = "";
                if (screen.screenX)
                    features += "left="+screen.screenX+",";
                if (screen.screenY)
                    features += "top="+screen.screenY+",";
                if (screen.innerWidth)
                    features += "width="+screen.innerWidth+",";
                if (screen.innerHeight)
                    features += "width="+screen.innerHeight+",";
                if (features)
                    features += "resizable=yes,scrollbars=yes,location=yes,toolbar=yes,menubar=yes";
            }
            var win = Services.ww.openWindow(window, url, null, (features || null), null);
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("openAndMarkTab "+url+" window ", win);
            var outerXULWindow = this.getWindowManager().getMostRecentWindow("navigator:browser");

            var tabbrowser = outerXULWindow.getBrowser();
            var tab = tabbrowser.selectedTab;
            tab.setAttribute(attrName, attrName);

            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("openOrReuse("+attrName+", "+url+") outerXULWindow "+outerXULWindow.location, outerXULWindow);

            return tab.contentWindow;
        },

        //https://developer.mozilla.org/en/Code_snippets/Tabbed_browser#Reusing_tabs
        openOrReuseByAttribute: function(attrName, url, screen)
        {
            var browserContentWindow = this.findAndFocusByAttribute(attrName);
            if (FBTrace.DBG_DYNE)
                FBTrace.sysout("openOrReuse("+attrName+", "+url+") found "+browserContentWindow, browserContentWindow);
            if (!browserContentWindow)
                browserContentWindow = this.openAndMarkTab(attrName, url, screen);

            return browserContentWindow;
        },
}
// ************************************************************************************************
// Registration

Firebug.registerStylesheet("chrome://dyne/skin/dyne.css");

Firebug.registerModule(Firebug.Dyne);


// ************************************************************************************************
}});
