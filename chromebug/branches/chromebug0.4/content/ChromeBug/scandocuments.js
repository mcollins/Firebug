/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

Firebug.Chromebug.DocumentScanner = extend(Firebug.Module,
{
    scanningDocuments: false,

    initialize: function()
    {
        this.onScanningDocumentsMouseOver = bind(this.onScanningDocumentsMouseOver, this);
        this.onScanningDocumentsMouseDown = bind(this.onScanningDocumentsMouseDown, this);
        this.onScanningDocumentsClick = bind(this.onScanningDocumentsClick, this);
    },

   // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    onScanningDocumentsMouseOver: function(event)
    {
        if (FBTrace.DBG_INSPECT)
           FBTrace.dumpEvent("onScanningDocuments", event);
        this.scanDocuments(event.target);
        // Let it go to inspect cancelEvent(event);
    },

    onScanningDocumentsMouseDown: function(event)
    {
        if (FBTrace.DBG_INSPECT)
           FBTrace.dumpEvent("onScanningDocuments", event);
        this.stopScanningDocuments(false, true);
        cancelEvent(event);  // inspector sees nothing or mousedown and stopInspecting but not inspecting
        Firebug.Inspector.stopInspecting(false, false);  // not canceled and don't wait, I'll wait for you.
    },

    onScanningDocumentsClick: function(event)
    {
        if (FBTrace.DBG_INSPECT)
           FBTrace.dumpEvent("onScanningDocuments", event);
        var win = event.currentTarget.defaultView;
        if (win)
        {
            win = getRootWindow(win);
            this.detachClickInspectListeners(win);
        }
        else
            FBTrace.dumpProperties("onScanningDocuments no defaultView", event.currentTarget);
        cancelEvent(event);  // inspector sees nothing or if on same target, 'click' and redundant detach occurs
    },

    hasContentDocument: ["tabbrowser", "browser", "iframe"],

    scanDocuments: function(node)
    {
        if (node && node.nodeType != 1)
            node = node.parentNode;

        if (node && node.firebugIgnore)
            return;

        if (!node)
            return;

        var tagName = node.tagName;
        FBTrace.sysout("scanDocuments tag:"+tagName, "scanning "+(this.scanningDOMWindow?this.scanningDOMWindow.location:"none"));
        if (this.hasContentDocument.indexOf(tagName) != -1)
        {
            var doc = node.contentDocument;
            node = doc.documentElement;
        }

        var domWindow = node.ownerDocument.defaultView;
        if (domWindow == this.scanningDOMWindow)
            return;

        var context = Firebug.Chromebug.xulWindowInfo.getContextByDOMWindow(domWindow);
        if (!context)
        {
             if (FBTrace.DBG_INSPECT)
                FBTrace.sysout("No chrome context for "+domWindow.location+"\n");
            return;
        }
        this.scanningContext = context;

        if (FBTrace.DBG_INSPECT)
            FBTrace.sysout("scanDocuments has new domWindow for ", node.tagName + " in "+domWindow.location);

        if (this.scanningTimeout)  // then don't bother we are changing again
        {
            context.clearTimeout(this.scanningTimeout);
            delete this.scanningTimeout;
        }

        Firebug.Inspector.stopInspecting(false, false);  // on old window

        this.scanningDOMWindow = domWindow;
        context.hoverNode = node;  // tell inspect where to start

        Firebug.Inspector.startInspecting(context);  // on new window

        if (FBTrace.DBG_INSPECT)
                FBTrace.sysout("ScanDocuments ", "startInspecting new context "+context.window.location);

        this.scanningTimeout = context.setTimeout
        (
            function()
            {
                 FBTrace.sysout("scanningTimeout context.window:", context.window.location);
                if (context)
                    Firebug.Chromebug.syncToolBarToContext(context);
            },
            100
        );
    },

    //*****************************************************************************
    toggleScanningDocuments: function(context)
    {
        if (this.scanningDocuments)
            this.stopScanningDocuments();
        else
            this.startScanningDocuments(context);
    },

    startScanningDocuments: function(context)
    {
        this.scanningDocuments = true;
        this.scanningContext = context;

        if (FBTrace.DBG_INSPECT)
            FBTrace.sysout("ChromeBug startScanning\n");
        context.chrome.setGlobalAttribute("cmd_toggleScanningDocuments", "checked", "true");

        this.attachScanListeners();

        // Remember the previous panel and bar state so we can revert if the user cancels
        this.previousContext = context;
        this.previousPanelName = context.panelName;
        this.previousSidePanelName = context.sidePanelName;
        this.previouslyCollapsed = $("fbContentBox").collapsed;
        this.previouslyFocused = context.detached && context.chrome.isFocused();

        var htmlPanel = context.chrome.selectPanel("html");
        this.previousObject = htmlPanel.selection;

        htmlPanel.panelNode.focus();
        htmlPanel.startInspecting();

        if (context.hoverNode)
            this.scanDocuments(context.hoverNode);
    },

    stopScanningDocuments: function(cancelled, waitForClick)
    {
        if (FBTrace.DBG_INSPECT)
            FBTrace.sysout("ChromeBug stopScanning  scanning:"+this.scanningDocuments+"\n");
        if (!this.scanningDocuments)
            return;

        var context = this.scanningContext;

        if (this.scanningTimeout)
        {
            context.clearTimeout(this.scanningTimeout);
            delete this.scanningTimeout;
        }

        this.detachInspectListeners();
        if (!waitForClick)
            this.detachClickInspectListeners();

        context.chrome.setGlobalAttribute("cmd_toggleScanningDocuments", "checked", "false");

        var htmlPanel = context.getPanel("html");

        if (this.previouslyFocused)
            context.chrome.focus();

        if (cancelled)
        {
            if (this.previouslyCollapsed)
                Firebug.showBar(false);

            if (this.previousPanelName == "html")
                context.chrome.select(this.previousObject);
            else
                context.chrome.selectPanel(this.previousPanelName, this.previousSidePanelName);
        }
        else
        {
            if (FBTrace.DBG_INSPECT)
                FBTrace.sysout("stopScanningDocuments selection:", htmlPanel.selection.tagName);
            context.chrome.select(htmlPanel.selection, "html", "dom");
            context.chrome.getSelectedPanel().panelNode.focus();
        }

        //htmlPanel.stopInspecting(htmlPanel.selection, cancelled);

        delete this.previousObject;
        delete this.previousPanelName;
        delete this.previousSidePanelName;
        delete this.scanningContext;
        this.scanningDocuments = false;
        delete this.scanningDOMWindow;
        delete context.hoverNode;

    },

    attachScanListeners: function()
    {
        this.keyListeners =
        [
            FirebugChrome.keyCodeListen("RETURN", null, bindFixed(this.stopScanningDocuments, this)),
            FirebugChrome.keyCodeListen("ESCAPE", null, bindFixed(this.stopScanningDocuments, this, true)),
            FirebugChrome.keyCodeListen("UP", isControl, bindFixed(this.inspectNodeBy, this, "up"), true),
            FirebugChrome.keyCodeListen("DOWN", isControl, bindFixed(this.inspectNodeBy, this, "down"), true),
        ];

        Firebug.Chromebug.xulWindowInfo.iterateXULWindows( bind(function(subWin)
        {
            // If you change the bubbling/capture option on these, do so on the removeEventListener as well.
            subWin.document.addEventListener("mouseover", this.onScanningDocumentsMouseOver, true); // trigger on capture
            subWin.document.addEventListener("mousedown", this.onScanningDocumentsMouseDown, true);
            subWin.document.addEventListener("click", this.onScanningDocumentsClick, true);
            if (FBTrace.DBG_INSPECT)
                FBTrace.sysout("scanDocuments attachListeners to "+subWin.location+"\n");
        }, this));
    },

    detachInspectListeners: function()
    {
        if (this.keyListeners)  // XXXjjb for some reason this is null some times...
        {
            for (var i = 0; i < this.keyListeners.length; ++i)
                FirebugChrome.keyIgnore(this.keyListeners[i]);
            delete this.keyListeners;
        }

        Firebug.Chromebug.xulWindowInfo.iterateXULWindows( bind(function(subWin)
        {
            subWin.document.removeEventListener("mouseover", this.onScanningDocumentsMouseOver, true);
            subWin.document.removeEventListener("mousedown", this.onScanningDocumentsMouseDown, true);
        }, this));
    },

    detachClickInspectListeners: function()
    {
        // We have to remove the click listener in a second phase because if we remove it
        // after the mousedown, we won't be able to cancel clicked links
        Firebug.Chromebug.xulWindowInfo.iterateXULWindows( bind(function(subWin)
        {
            subWin.document.removeEventListener("click", this.onScanningDocumentsClick, true);
        }, this));
    },
});

Firebug.registerModule(Firebug.Chromebug.DocumentScanner);

// ************************************************************************************************

}});
