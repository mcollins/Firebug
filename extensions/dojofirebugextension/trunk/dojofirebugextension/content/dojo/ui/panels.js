/* Released under BSD license (see license.txt) */
/*
 * Copyright IBM Corporation 2010, 2010. All Rights Reserved. 
 * U.S. Government Users Restricted Rights -  Use, duplication or disclosure restricted by GSA ADP 
 * Schedule Contract with IBM Corp. 
 */


/**
 * The panels main file (UI) of this extension
 * @author preyna@ar.ibm.com
 * @author fergom@ar.ibm.com
 */
define([
        "firebug/firebug",
        "firebug/firefox/firefox",
        "firebug/firefox/window",
        "firebug/firefox/xpcom",
        "firebug/lib/css",
        "firebug/lib/dom",
        "firebug/lib/json",
        "firebug/lib/locale",
        "firebug/lib/object",
        "firebug/lib/search",
        "firebug/lib/string",
        "firebug/lib/trace",
        "dojo/core/dojofirebugextension",
        "dojo/core/dojomodel",
        "dojo/core/prefs",
        "dojo/lib/collections",
        "dojo/ui/dojoreps",      
        "dojo/ui/uihelpers"
       ], function dojoPanelsFactory(Firebug, Firefox, Win, Xpcom, Css, Dom, Json, Locale, Obj, Search, Str, FBTrace, DojoExtension, DojoModel, DojoPrefs, Collections, DojoReps, UI)
{

    var DOJO_BUNDLE = UI.DOJO_BUNDLE;    

    var DojoPanels = {};

    var _addStyleSheet = function(doc) {
        UI.addStyleSheet(doc);
    };        

    var getDojoAccessor = function(context) {
        return DojoExtension.getDojoAccessor(context);
    };

    var getDojoDebugger = function(context) {
        return DojoExtension.getDojoDebugger(context);
    };
    
    /*context*/var _safeGetContext = function(panel) {
        return DojoExtension.safeGetContext(panel);
    };

    
    /**
     * Configuration for panel rendering.
     */
    var PanelRenderConfig = function(/*boolean*/ refreshMainPanel, /*PanelView*/mainPanelView,
                                     /*boolean*/ highlight, /*boolean*/ scroll,
                                     /*boolean*/ refreshSidePanel, /*String*/sidePanelView){
        this.refreshMainPanel = refreshMainPanel;
        this.mainPanelView = mainPanelView;
        this.highlight = highlight;
        this.scroll = scroll;
        this.refreshSidePanel = refreshSidePanel;
        this.sidePanelView = sidePanelView;
        
        /**
         * Verify if the parameter view is the selected one.
         */
        this.isViewSelected = function(view){
            return (this.mainPanelView == view);
        };
    };
    PanelRenderConfig.VIEW_WIDGETS = "view_widgets";
    PanelRenderConfig.VIEW_CONNECTIONS = "view_connections";
    PanelRenderConfig.VIEW_SUBSCRIPTIONS = "view_subscriptions";
    
    
    

// ****************************************************************
// MAIN PANEL
// ****************************************************************
var CONNECTIONS_BP_OPTION = "connections_bp_option";
var SUBSCRIPTIONS_BP_OPTION = "subscriptions_bp_option";
var DOCUMENTATION_OPTION = "documentation_option";
var WIDGET_OPTION = "widget_option";

var DojoPanelMixin =  {
            
    /**
     * @override
     */    
    getContextMenuItems: function(realObject, target) {
        var items = [];
    
        // Check if the selected object is a connection
        var conn = this._getReferencedObjectFromNodeWithType(target, "dojo-connection");
        if (conn){
            items = this._getConnectionContextMenuItems(conn);
        }
        
        // Check if the selected object is a subscription
        var sub = this._getReferencedObjectFromNodeWithType(target, "dojo-subscription");
        if (sub){
            items = this._getSubscriptionContextMenuItems(sub);
        }
        
        if (realObject) {
            var docItems = this.getDocumentationContextMenuItems(realObject, target);
            if(docItems) {
                items = items.concat(docItems);
            }
        }

        // Check if the selected object is a widget
        var widget = this._getReferencedObjectFromNodeWithType(target, "dojo-widget");
        if (widget){
            items = items.concat(this._getWidgetContextMenuItems(widget));
        } 

        // Check if the selected object at least has connections and/or subscriptions
        var trackedObj = this._getReferencedObjectFromNodeWithType(target, "dojo-tracked-obj");
        if(trackedObj) {
            var hasConns = this._hasConnections(trackedObj); 
            var hasSubs = this._hasSubscriptions(trackedObj); 
            if(hasConns || hasSubs) {
                items.push("-"); //separator
            }
            if(hasConns) {
                items = items.concat(this._getMenuItemsForObjectWithConnections(trackedObj));
            }
            if(hasSubs) {
                items = items.concat(this._getMenuItemsForObjectWithSubscriptions(trackedObj));
            }
        }

        // Check if the selected object is a connection event
        var /*IncomingConnectionsDescriptor*/ incDesc = this._getReferencedObjectFromNodeWithType(target, "dojo-eventFunction");
        if (incDesc){
            items = items.concat(this._getFunctionContextMenuItems(incDesc.getEventFunction(), 'menuitem.breakon.event', incDesc.event));
        }
        
        // Check if the selected object is a connection target
        var /*OutgoingConnectionsDescriptor*/ outDesc = this._getReferencedObjectFromNodeWithType(target, "dojo-targetFunction");
        if (outDesc){
            var fnListenerLabel = (typeof(outDesc.method) == "string") ? outDesc.method : null;
            items = items.concat(this._getFunctionContextMenuItems(outDesc.getListenerFunction(), 'menuitem.breakon.target', fnListenerLabel));
        }
        
        return items;

    },
    
    /**
     * returns the referencedObject associated to an ancestor node with class objectType
     */
    _getReferencedObjectFromNodeWithType: function(target, objectType) {
        var connNode = Dom.getAncestorByClass(target, objectType);
        if(!connNode) {
            return;
        }
        
        return connNode.referencedObject;
    },
    
    /*array*/_getFunctionContextMenuItems: function(func, msgKey, label){
        var context = this.context;
        var dojoDebugger = getDojoDebugger(context);

        //info about the function.
        var listener = dojoDebugger.getDebugInfoAboutFunction(context, func, label);

        return [
            { label: Locale.$STRF(msgKey, [listener.getFnName()], DOJO_BUNDLE), nol10n: true, disabled: !listener.fnExists, type: "checkbox", checked: listener.hasBreakpoint(), command: Obj.bindFixed(dojoDebugger.toggleBreakpointInFunction, dojoDebugger, listener)}
        ];
    },
    
    /*array*/_getWidgetContextMenuItems: function(widget){
        //nothing to do
        return [];
    },
    
    /*array*/_getConnectionContextMenuItems: function(conn) {
        var context = this.context;
        
        var dojoDebugger = getDojoDebugger(context);

        //info about listener fn..
        var fnListener = conn.getListenerFunction();
        var fnListenerLabel = (typeof(conn.method) == "string") ? conn.method : null;
        var listener = dojoDebugger.getDebugInfoAboutFunction(context, fnListener, fnListenerLabel);

        //info about original fn..
        var fnModel = conn.getEventFunction();
        var model = dojoDebugger.getDebugInfoAboutFunction(context, fnModel, conn.event);
        
        //info about place where the connection was made
        var caller = conn.callerInfo;
        
        var connectPlaceCallerFnName;
        if(DojoPrefs._isBreakPointPlaceSupportDisabled()) {            
            connectPlaceCallerFnName = Locale.$STR('menuitem.breakon.disabled', DOJO_BUNDLE);
        } else {
            connectPlaceCallerFnName = (caller) ? caller.getFnName() : null;
        }
        
        return [
            { label: Locale.$STRF('menuitem.breakon.target', [listener.getFnName()], DOJO_BUNDLE), nol10n: true, disabled: !listener.fnExists, type: "checkbox", checked: listener.hasBreakpoint(), command: Obj.bindFixed(dojoDebugger.toggleBreakpointInFunction, dojoDebugger, listener), optionType: CONNECTIONS_BP_OPTION },
            { label: Locale.$STRF('menuitem.breakon.event', [model.getFnName()], DOJO_BUNDLE), nol10n: true, disabled: !model.fnExists, type: "checkbox", checked: model.hasBreakpoint(), command: Obj.bindFixed(dojoDebugger.toggleBreakpointInFunction, dojoDebugger, model), optionType: CONNECTIONS_BP_OPTION },
            { label: Locale.$STRF('menuitem.breakon.connect', [connectPlaceCallerFnName], DOJO_BUNDLE), nol10n: true, disabled: (!caller || !caller.fnExists), type: "checkbox", checked: (caller && caller.hasBreakpoint()), command: Obj.bindFixed(dojoDebugger.toggleBreakpointInFunction, dojoDebugger, caller), optionType: CONNECTIONS_BP_OPTION }
        ];

    },
    
    /*array*/_getMenuItemsForObjectWithConnections: function(/*Object*/obj) {
        if (!obj) {
            return [];
        }
        
        return [
            {label: Locale.$STR('menuitem.Show Connections', DOJO_BUNDLE), nol10n: true, command: Obj.bindFixed(this._showConnections, this, obj), disabled: !this._hasConnections(obj), optionType: WIDGET_OPTION}
        ];        
    },

    /*array*/_getMenuItemsForObjectWithSubscriptions: function(/*Object*/obj) {
        if (!obj) {
            return [];
        }
        
        return [
                {label: Locale.$STR('menuitem.Show Subscriptions', DOJO_BUNDLE), nol10n: true, command: Obj.bindFixed(this._showSubscriptions, this, obj), disabled: !this._hasSubscriptions(obj), optionType: WIDGET_OPTION }
        ];        
    },

    /*array*/_getSubscriptionContextMenuItems: function(sub) {
        var context = this.context;
        
        var dojoDebugger = getDojoDebugger(context);

        //info about listener fn..
        var fnListener = sub.getListenerFunction();
        var fnListenerLabel = (typeof(sub.method) == "string") ? sub.method : null;
        var listener = dojoDebugger.getDebugInfoAboutFunction(context, fnListener, fnListenerLabel);

        //info about place where the subscription was made
        var caller = sub.callerInfo;
        
        var subscribePlaceCallerFnName;
        if(DojoPrefs._isBreakPointPlaceSupportDisabled()) {
            subscribePlaceCallerFnName = Locale.$STR('menuitem.breakon.disabled', DOJO_BUNDLE);
        } else {
            subscribePlaceCallerFnName = (caller) ? caller.getFnName() : null;
        }

        return [
            { label: Locale.$STRF('menuitem.breakon.target', [listener.getFnName()], DOJO_BUNDLE), nol10n: true, disabled: !listener.fnExists, type: "checkbox", checked: listener.hasBreakpoint(), command: Obj.bindFixed(dojoDebugger.toggleBreakpointInFunction, dojoDebugger, listener), optionType: SUBSCRIPTIONS_BP_OPTION },
            { label: Locale.$STRF('menuitem.breakon.subscribe', [subscribePlaceCallerFnName], DOJO_BUNDLE), nol10n: true, disabled: (!caller || !caller.fnExists), type: "checkbox", checked: (caller && caller.hasBreakpoint()), command: Obj.bindFixed(dojoDebugger.toggleBreakpointInFunction, dojoDebugger, caller), optionType: SUBSCRIPTIONS_BP_OPTION }
        ];

    },
    
    /*boolean*/_hasConnections: function(widget) {
        var api = _safeGetContext(this).connectionsAPI;
        return (!api) ? false : api.areThereAnyConnectionsFor(widget);
    },
    
    /*boolean*/_hasSubscriptions: function(widget) {
        var api = _safeGetContext(this).connectionsAPI;
        return (!api) ? false : api.areThereAnySubscriptionFor(widget);
    },
    
    _showConnections: function(widget, context) {
        DojoPanels.dojofirebugextensionPanel.prototype.showObjectInConnectionSidePanel(widget);
    },
    
    _showSubscriptions: function(widget, context) {
        DojoPanels.dojofirebugextensionPanel.prototype.showObjectInSubscriptionSidePanel(widget);
    },
    
    /*array*/getDocumentationContextMenuItems: function(realObject, target) {
        //'this' is a panel instance
        var context = this.context;
        var dojoAccessor = getDojoAccessor(context);
        var docUrl = dojoAccessor.getDojoApiDocURL(realObject, context);
        
        var refDocUrl = dojoAccessor.getReferenceGuideDocUrl(realObject, context);
        
        if(!docUrl && !refDocUrl) {
            return;
        }
        
        return [
                "-",
                { label: Locale.$STR('menuitem.Open_Doc_In_New_Tab', DOJO_BUNDLE), nol10n: true, disabled: !docUrl, command: Obj.bindFixed(this.openBrowserTabWithURL, this, docUrl, context), optionType: DOCUMENTATION_OPTION },
                "-",
                { label: Locale.$STR('menuitem.Open_Doc_From_RefGuide_In_New_Tab', DOJO_BUNDLE), nol10n: true, disabled: !refDocUrl, command: Obj.bindFixed(this.openBrowserTabWithURL, this, refDocUrl, context), optionType: DOCUMENTATION_OPTION }
            ];
    },
    
    openBrowserTabWithURL: function(url, context) {
        Win.openNewTab(url);
    },
    
    openBrowserWindowWithURL: function(url, context) {
        //FIXME make this work!
        var h = context.window.height;
        var w = context.window.width;
        var args = {
                browser: context.browser
        };
        Firefox.openWindow("DojoDoc", url, "width="+w+",height="+h, args);
    }
    
}; // end DojoPanelMixin


var SHOW_WIDGETS = 10;
var SHOW_CONNECTIONS = 20;
var SHOW_CONNECTIONS_TABLE = 30;
var SHOW_SUBSCRIPTIONS = 40;

var ActivablePanelPlusMixin = Obj.extend(Firebug.ActivablePanel, DojoPanelMixin);

/**
 * @panel Main dojo extension panel
 */
DojoPanels.dojofirebugextensionPanel = function() {};
DojoPanels.dojofirebugextensionPanel.prototype = Obj.extend(ActivablePanelPlusMixin,
{    
    name: "dojofirebugextension",

    title: Locale.$STR('panel.dojofirebugextensionPanel.title', DOJO_BUNDLE),
    
    searchable: true,
    inspectable: true,
    inspectHighlightColor: "green",
    editable: false,

    /**
     * @override
     */
    initialize: function(context, doc) {
        Firebug.ActivablePanel.initialize.apply(this, arguments);
        
        if(context.dojo && !context.dojo.mainMenuSelectedOption) { 
            context.dojo.mainMenuSelectedOption = SHOW_WIDGETS;            
        }
        
        this._initHighlighter(context);
                
        this._initMessageBoxes(context);
        
        _addStyleSheet(this.document);
    },
    
    _initMessageBoxes: function(ctx) {
        // Message boxes
        var self = this;
       
        /* Message box for connections */
        var conMsgBox = this.connectionsMessageBox = new UI.ActionMessageBox("connectionsMsgBox", this.panelNode, 
                                                            Locale.$STR('warning.newConnectionsMade', DOJO_BUNDLE),
                                                            Locale.$STR('warning.newConnectionsMade.button.update', DOJO_BUNDLE),
                                                            function(actionMessageBox) {
                                                                actionMessageBox.hideMessageBox();
                                                                self.showConnectionsInTable(ctx);
                                                            });
        
        var showConnectionsMessageBox = function() { conMsgBox.showMessageBox(); };
        ctx.connectionsAPI.addListener(DojoModel.ConnectionsAPI.ON_CONNECTION_ADDED, showConnectionsMessageBox);
        ctx.connectionsAPI.addListener(DojoModel.ConnectionsAPI.ON_CONNECTION_REMOVED, showConnectionsMessageBox);
        
        /* Message box for subscriptions */
        var subMsgBox = this.subscriptionsMessageBox = new UI.ActionMessageBox("subscriptionsMsgBox", this.panelNode, 
                Locale.$STR('warning.newSubscriptionsMade', DOJO_BUNDLE),
                Locale.$STR('warning.newSubscriptionsMade.button.update', DOJO_BUNDLE),
                function(subscriptionMsgBox){
                    subscriptionMsgBox.hideMessageBox();
                    self.showSubscriptions(ctx);
                });
        var showSubscriptionsMessageBox = function() { subMsgBox.showMessageBox(); };
        ctx.connectionsAPI.addListener(DojoModel.ConnectionsAPI.ON_SUBSCRIPTION_ADDED, showSubscriptionsMessageBox);
        ctx.connectionsAPI.addListener(DojoModel.ConnectionsAPI.ON_SUBSCRIPTION_REMOVED, showSubscriptionsMessageBox);
        
    },
    
    _initHighlighter: function(context) {
  
        this._domHighlightSelector = new UI.DomHighlightSelector();
        
        this._domHighlightSelector.addSelector("dojo-connection", function(selection, connection) {
            var usingHashcodes = DojoPrefs._isHashCodeBasedDictionaryImplementationEnabled();
            return connection && ((Collections.areEqual(connection['obj'], selection, usingHashcodes)) || (Collections.areEqual(connection['context'], selection, usingHashcodes)));
        });
        
        this._domHighlightSelector.addSelector("dojo-subscription", function(selection, subscription) {
            var usingHashcodes = DojoPrefs._isHashCodeBasedDictionaryImplementationEnabled();
            return subscription && (Collections.areEqual(subscription['context'], selection, usingHashcodes));
        });
        
        this._domHighlightSelector.addSelector("dojo-widget", function(selection, widget) {
            var usingHashcodes = DojoPrefs._isHashCodeBasedDictionaryImplementationEnabled();
            return Collections.areEqual(widget, selection, usingHashcodes);
        });        
    },
    
    // **********  Inspector related methods ************************
    
    _configureInspectorSupport: function(/*bool*/on) {
        
        this.inspectable = on;        
    },
    
    /**
     * Highlight a node using the frame highlighter.
     * Overridden here to avoid changing dojo extension panel contents all the time.  
     * @param {Element} node The element to inspect
     */
    inspectNode: function(node) {
        return false;
    },
    
    stopInspecting: function(node, canceled) {
        if (canceled) {
            return;
        }

        this.select(node);        
    },
    
    // **********  end of Inspector related methods ************************
    
    /**
     * @state: persistedPanelState plus non-persisted hide() values 
     * @override
     */
    show: function(state) {
        this.showToolbarButtons("fbStatusButtons", true);
        
        // Sync the selected toolbar button with the selected view.
        var ctx = _safeGetContext(this);
        this._setOption(ctx.dojo.mainMenuSelectedOption, ctx);
    },
    
    /**
     * This method shows the first view for a loaded page.
     */
    showInitialView: function(context) {
        var hasWidgets = this.hasWidgets(context);
        var connsAPI = context.connectionsAPI;
        
        if (hasWidgets) {
            this.showWidgets(context);            
        } else if (connsAPI && connsAPI.getConnections().length > 0) {
            this.showConnectionsInTable(context);
        } else if (connsAPI && connsAPI.getSubscriptions().getKeys().length > 0) {
            this.showSubscriptions(context);
        } else { //Default
            this.showWidgets(context);
        }
    },

    /**
     * Refresh the panel.
     * @override
     */
     refresh: function() {
         var context = _safeGetContext(this);
                  
         // Select the current main view.
         if(this._isOptionSelected(SHOW_WIDGETS, context)) {
             this.showWidgets(context);
         } else if(this._isOptionSelected(SHOW_CONNECTIONS_TABLE, context)) {
             this.showConnectionsInTable(context);
         } else if(this._isOptionSelected(SHOW_SUBSCRIPTIONS, context)) {
             this.showSubscriptions(context);
        }
     },
    
    /**
     * Returns a number indicating the view's ability to inspect the object.
     * Zero means not supported, and higher numbers indicate specificity.
     * @override
     */
    supportsObject: function(object, type) {
        var context = _safeGetContext(this);
        var support = this.supportsActualObject(context, object, type);
        
        if(support == 0) {
            support = this.doesNodeBelongToWidget(context, object, type);
        }

        return support;
    },
    
    
    /**
     * Support verification for actual object
     */
    supportsActualObject: function(context, object, type) {
        var dojoAccessor = getDojoAccessor(context);
        if (dojoAccessor.isWidgetObject(object)){
            return 1;
        }
        
        //delegate to side panels...
        return ((this._isConnection(object, type) || this._isSubscription(object, type))) ? 1 : 0;
    },

    /**
     * Support verification for a potential widget that contains the node.
     */
    /*int: 0|1*/doesNodeBelongToWidget: function(context, object, type) {
        var dojoAccessor = getDojoAccessor(context);
        var widget = dojoAccessor.getEnclosingWidget(context, object);
        return widget ? 1 : 0;
    },
    
    /**
     * returns whether the given object is a connection.
     * @param obj the obj to check
     * @param type optional
     */
    _isConnection: function(obj, type) {
        if(!obj) {
            return false;
        }
        return DojoPanels.ConnectionsSidePanel.prototype.supportsObject(obj, type) > 0;
    },

    /**
     * returns whether the given object is a connection.
     * @param obj the obj to check
     * @param type optional
     */
    _isSubscription: function(obj, type) {
        if(!obj) {
            return false;
        }
        return DojoPanels.SubscriptionsSidePanel.prototype.supportsObject(obj, type) > 0;
    },


    /**
     * Return the path of selections shown in the extension toolbar.
     * @override
     */
    getObjectPath: function(object) {
         return [object];
    },
    
    /**
     * Highlight the found row.
     */
    highlightRow: function(row) {
        if (this.highlightedRow) {
            Css.cancelClassTimed(this.highlightedRow, "jumpHighlight", this.context);
        }

        this.highlightedRow = row;

        if (row){
            Css.setClassTimed(row, "jumpHighlight", this.context);
        }
    },
    
    /**
     * Panel search.
     * @override
     */
    search: function(text, reverse) {
        if (!text) {
            delete this.currentSearch;
            this.highlightRow(null);
            this.document.defaultView.getSelection().removeAllRanges();
            return false;
        }

        var row;
        if (this.currentSearch && text == this.currentSearch.text) {
            row = this.currentSearch.findNext(true, false, reverse, Firebug.Search.isCaseSensitive(text));
        } else {
            this.currentSearch = new Search.TextSearch(this.panelNode);
            row = this.currentSearch.find(text, reverse, Firebug.Search.isCaseSensitive(text));
        }

        if (row) {
            var sel = this.document.defaultView.getSelection();
            sel.removeAllRanges();
            sel.addRange(this.currentSearch.range);

            UI.scrollSelectionIntoView(this);
            this.highlightRow(row);

            return true;
        } else {
            this.document.defaultView.getSelection().removeAllRanges();
            return false;
        }
        
    },
    
    _showReloadBoxIfNeeded: function(context) { 
        // Verify if the context is consistent.
        if (DojoExtension.needsReload(context)) {
            /* Message box for Reload page */
            var conMsgBox = new UI.ActionMessageBox("MsgBox", this.panelNode, 
                                                            Locale.$STR('warning.pageNeedToBeReload', DOJO_BUNDLE),
                                                            Locale.$STR('warning.pageNeedToBeReload.button', DOJO_BUNDLE),
                                                            function(actionMessageBox){
                                                                Firebug.currentContext.window.location.reload();
                                                            });
            conMsgBox.loadMessageBox(true);
        }
    },
    
    _showEnableRequiredPanels: function(context) { 
        if (context.dojoPanelReqsNotMet) {
            var console = Firebug.getPanelTitle(Firebug.getPanelType("console"));
            var script = Firebug.getPanelTitle(Firebug.getPanelType("script"));
            var enablePanelsMsgBox = new UI.ActionMessageBox("EnablePanelsMsgBox", this.panelNode, 
                                                            Locale.$STRF('warning.panelsNeedToBeEnabled', [console, script], DOJO_BUNDLE),
                                                            Locale.$STR('warning.panelsNeedToBeEnabled.button', DOJO_BUNDLE),
                                                            function(actionMessageBox){
                                                                //nothing to do
                                                            });
            enablePanelsMsgBox.loadMessageBox(true);
        }
    },
    
    /**
     * Update panel view. Main "render" panel method
     * @param panelConfig the configuration
     * @param context the FB context
     */
    updatePanelView: function(/*PanelRenderConfig*/panelConfig, context){
        var selection = context.dojoExtensionSelection;
        var dojoAccessor = getDojoAccessor(context);
        
        //enable inspector based on widget existence
        this._configureInspectorSupport(this.hasWidgets(context));        

        
        //1st step: draw Main panel view.
        if (panelConfig.refreshMainPanel){
            // Clear the main panel
            this.panelNode.innerHTML = "";
             
            // Verify if the context is consistent.
            this._showReloadBoxIfNeeded(context);
            this._showEnableRequiredPanels(context);
            
            // Select the most suitable main panel to show the info about the selection
            
            if (panelConfig.isViewSelected(PanelRenderConfig.VIEW_WIDGETS) || 
                (!panelConfig.mainPanelView && dojoAccessor.isWidgetObject(selection))) {
                this._renderWidgets(context);
                
            } else if (panelConfig.isViewSelected(PanelRenderConfig.VIEW_CONNECTIONS) ||
                (!panelConfig.mainPanelView && this._isConnection(selection))) {
                this._renderConnectionsInTable(context);
            
            } else if (panelConfig.isViewSelected(PanelRenderConfig.VIEW_SUBSCRIPTIONS) || 
                (!panelConfig.mainPanelView && this._isSubscription(selection))) {
                this._renderSubscriptions(context);
            } else {
                //if no other option...
                this._renderWidgets(context);
            }
        }
        
        // 2nd step: Highlight and Scroll the selection in the current view.
        //FIXME why are we passing in 3 args if the target function receives only 2?
        this.highlightSelection(selection, panelConfig.highlight, panelConfig.scroll);
        
        // 3rd step: draw Side panel view
        if (panelConfig.refreshSidePanel) {
            var sidePanel = null;
            if (panelConfig.sidePanelView) {
                Firebug.chrome.selectSidePanel(panelConfig.sidePanelView);
            } else {
                // Select the most suitable side panel to show the info about the selection.
                if (this._isConnection(selection)) {
                    Firebug.chrome.selectSidePanel(DojoPanels.ConnectionsSidePanel.prototype.name);
                } else if(this._isSubscription(selection)){
                    Firebug.chrome.selectSidePanel(DojoPanels.SubscriptionsSidePanel.prototype.name);
                }
            }
        }
    },
    
    /**
     * Firebug wants to show an object to the user and this panel has the best supportsObject() result for the object.
     * Should we also focus now a side panel?
     * @override
     */
    updateSelection: function(object) {
        var ctx = _safeGetContext(this);
        if (this.supportsActualObject(ctx, object) == 0) {
            var dojoAccessor = getDojoAccessor(ctx);
            var widget = dojoAccessor.getEnclosingWidget(ctx, object);
            if(!widget) {
                return;
            }
            this.select(widget);

        } else {
        
            Firebug.ActivablePanel.updateSelection.call(this, object);
            
            if (!ctx.sidePanelSelectionConfig) {
                this.updatePanelView(new PanelRenderConfig(/*refreshMainPanel*/true, /*mainPanelView*/null, /*highlight*/true, /*scroll*/true,
                                                           /*refreshSidePanel*/true, /*sidePanelView*/null), ctx);
            } else {
                this.updatePanelView(ctx.sidePanelSelectionConfig, ctx);
            }        

        }
    },
    
    /**
     * This method highlight the selection in the main panel.
     * @param selection the selection.
     * @param focus boolean to decide if the object should be focus
     */
    highlightSelection : function(selection, /*boolean*/focus) {
        this._domHighlightSelector.highlightSelection(this.panelNode, selection, focus);
    },
    
    /**
     * This method show the object in the Connection sidePanel.
     * @param object the object to show
     */
    showObjectInConnectionSidePanel : function(object){
        this.updateSelectionAndSelectSidePanel(object, DojoPanels.ConnectionsSidePanel.prototype.name);
    },
    
    /**
     * This method show the object in the Subscription sidePanel.
     * @param object the object to show
     */
    showObjectInSubscriptionSidePanel : function(object){
        this.updateSelectionAndSelectSidePanel(object, DojoPanels.SubscriptionsSidePanel.prototype.name);
    },
    
    /**
     * This method show the object in the sidePanelName without changing the dojo main panel
     * @param object the object to show
     * @param sidePanelName the side panel where the object should be shown
     */
    updateSelectionAndSelectSidePanel : function(object, sidePanelName){
        var ctx = _safeGetContext(this);
        
        // Set in the context the render configurations.
        ctx.sidePanelSelectionConfig = new PanelRenderConfig(/*refreshMainPanel*/false, /*mainPanelView*/null, /*highlight*/false, /*scroll*/false,
                                                             /*refreshSidePanel*/true, /*sidePanelView*/sidePanelName);
        Firebug.chrome.select(object, this.name, sidePanelName, true);
        // Clean from the context the render configurations.
        ctx.sidePanelSelectionConfig = null;
    },
    
    /**
     * The select method is extended to force the panel update always.
     * @override 
     */
    select: function(object, forceUpdate) {
        _safeGetContext(this).dojoExtensionSelection = object;
        ActivablePanelPlusMixin.select.call(this, object, true);
    },    
    
    /**
     *  returns true is the given option is selected on this context
     */
    /*boolean*/_isOptionSelected: function(option, ctx) {
        if(!ctx.dojo) {
            return false;
        }
        return (ctx.dojo.mainMenuSelectedOption) && (ctx.dojo.mainMenuSelectedOption == option); 
    },
    
    _setOption: function(option, ctx) {
        ctx.dojo.mainMenuSelectedOption = option;
        
        var doc = this.panelNode.document;
        Firebug.chrome.$("widgetsButton", doc).checked = (option == SHOW_WIDGETS);
        Firebug.chrome.$("connectionsInTableButton", doc).checked = (option == SHOW_CONNECTIONS_TABLE);
        Firebug.chrome.$("dojoFilter-boxes", doc).style.display = UI.getVisibilityValue(option == SHOW_CONNECTIONS_TABLE);
        Firebug.chrome.$("subscriptionsButton", doc).checked = (option == SHOW_SUBSCRIPTIONS);
    },
        
    /**
     * returns panel's main menu items
     * @override
     */
    getOptionsMenuItems: function() {
        // {label: 'name', nol10n: true,  type: "checkbox", checked: <value>, command:function to set <value>}
        
        var context = _safeGetContext(this);
        return [
                { label: Locale.$STR('label.Widgets', DOJO_BUNDLE), nol10n: true, type: 'checkbox', checked: this._isOptionSelected(SHOW_WIDGETS, context), command: Obj.bindFixed(this.showWidgets, this, context)  },
                { label: Locale.$STR('label.Connections', DOJO_BUNDLE), nol10n: true, type: 'checkbox', checked: this._isOptionSelected(SHOW_CONNECTIONS_TABLE, context), command: Obj.bindFixed(this.showConnectionsInTable, this, context)  },
                { label: Locale.$STR('label.Subscriptions', DOJO_BUNDLE), nol10n: true, type: 'checkbox', checked: this._isOptionSelected(SHOW_SUBSCRIPTIONS, context), command: Obj.bindFixed(this.showSubscriptions, this, context)  },
                "-",
                { label: Locale.$STR('label.BreakPointPlaceEnable', DOJO_BUNDLE), nol10n: true, type: 'checkbox', disabled: DojoPrefs._isUseEventBasedProxyEnabled(), checked: !DojoPrefs._isBreakPointPlaceSupportDisabled(), command: Obj.bindFixed(this._switchConfigurationSetting, this, DojoPrefs._switchBreakPointPlaceEnabled, context) },
                "-",
                { label: Locale.$STR('label.WidgetsTreeEnabled', DOJO_BUNDLE), nol10n: true, type: 'checkbox', disabled: false, checked: DojoPrefs._isWidgetsTreeEnabled(), command: Obj.bindFixed(this._switchWidgetsTreeMode, this, context) },                
                "-",
                { label: Locale.$STR('label.About', DOJO_BUNDLE), nol10n: true, command: Obj.bindFixed(this.showAbout, this) },
                "-",
                { label: Locale.$STR('label.Refresh', DOJO_BUNDLE), nol10n: true, command: Obj.bindFixed(this.refresh, this) }
        ];
    },

    _switchConfigurationSetting: function(switchSettingFn, context) {
        switchSettingFn.apply(this);
        DojoExtension.setNeedsReload(context, true);
        this.refresh();
    },
    
    showAbout: function() {
        this.openAboutDialog();
    },

    openAboutDialog: function() {
        if (FBTrace.DBG_WINDOWS) {
            FBTrace.sysout("dojofirebugextension.openAboutDialog");
        }

        try
        {
            // Firefox 4.0 implements new AddonManager. In case of Firefox 3.6 the module
            // is not avaialble and there is an exception.
            Components.utils.import("resource://gre/modules/AddonManager.jsm");
        }
        catch (err)
        {
        }

        if (typeof(AddonManager) != "undefined")
        {
            AddonManager.getAddonByID("dojo@silvergate.ar.ibm.com", function(addon) {
                openDialog("chrome://mozapps/content/extensions/about.xul", "",
                "chrome,centerscreen,modal", addon);
            });
        }
        else
        {
            var extensionManager = Xpcom.CCSV("@mozilla.org/extensions/manager;1",
                "nsIExtensionManager");

            openDialog("chrome://mozapps/content/extensions/about.xul", "",
                "chrome,centerscreen,modal", "urn:mozilla:item:dojo@silvergate.ar.ibm.com",
                extensionManager.datasource);
        }
    },
    
    /**
     * returns current page's widgets
     */
    /*array*/getWidgets: function(context) {
        var accessor = getDojoAccessor(context);
        if(!accessor) {
            return [];
        }
        return accessor.getWidgets(context);
    },

    /*boolean*/hasWidgets: function(context) {
        var accessor = getDojoAccessor(context);
        if(!accessor) {
            return false;
        }
        return accessor.hasWidgets(context);        
    }, 
    
    /**
     * returns current page's widgets
     */
    /*array*/getWidgetsRoots: function(context) {
        var accessor = getDojoAccessor(context);
        if(!accessor) {
            return [];
        }
        return accessor.getWidgetsRoots(context);
    },

    _switchWidgetsTreeMode: function(context) {
        DojoPrefs._switchWidgetsTreeEnabled();
         if(this._isOptionSelected(SHOW_WIDGETS, context)) {
             this.refresh();
         }
        
    },
    
    /**
     * Show the widget list.
     */
    showWidgets: function(context) {
        this.updatePanelView(
                new PanelRenderConfig(/*refreshMainPanel*/true, /*mainPanelView*/PanelRenderConfig.VIEW_WIDGETS, /*highlight*/true, /*scroll*/true,
                                      /*refreshSidePanel*/false, /*sidePanelView*/null), context);
    },
        
    /**
     * Render the Widget list view
     * !Do not invoke this method directly. It must be just invoked from the updatePanelView method.
     */
    _renderWidgets: function(context) {
        this._setOption(SHOW_WIDGETS, context);
        
        var useWidgetTree = DojoPrefs._isWidgetsTreeEnabled();
        
        var widgets = (useWidgetTree) ? this.getWidgetsRoots(context) : this.getWidgets(context);
        var areThereAnyWidgets = widgets.length > 0; 
        if(!areThereAnyWidgets) {
            DojoReps.Messages.infoTag.append({object: Locale.$STR('warning.nowidgets.msg1', DOJO_BUNDLE)}, this.panelNode);
            DojoReps.Messages.simpleTag.append({object: Locale.$STR("warning.nowidgets.msg2", DOJO_BUNDLE)}, this.panelNode);
            return areThereAnyWidgets;
        }
        
        var dojoAccessor = getDojoAccessor(context);
        var fnGetHighLevelProps = dojoAccessor.getSpecificWidgetProperties;        
        var funcWidgetProperties = Obj.bind(fnGetHighLevelProps, dojoAccessor, context);

        if(!useWidgetTree) {
            //plain list
           
            DojoReps.WidgetListRep.tag.append({object: widgets, propertiesToShow: funcWidgetProperties}, this.panelNode);
            
        } else {
            //tree
            var useFakeRootForDetached = false;

            var detachedWidgets = dojoAccessor.getDetachedWidgets(context);
            
            var detachedWidgetsFakeRoot = DojoReps.WidgetsTreeRep.createFakeTreeNode(detachedWidgets);            
            if(detachedWidgets && detachedWidgets.length > 0) {
                if(useFakeRootForDetached) {
                    //add the fake tree root to our widgets roots
                    widgets.push(detachedWidgetsFakeRoot);                                    
                } else {
                    widgets = widgets.concat(detachedWidgets);
                }
            }
            
            //get current selection
            var selectionPath = [];
            var mainSelection = _safeGetContext(this).dojoExtensionSelection;
            var isWidget = mainSelection && dojoAccessor.isWidgetObject(mainSelection); 
            if(isWidget) {
                selectionPath = dojoAccessor.getWidgetsExpandedPathToPageRoot(mainSelection, context);    

                //is also a detached widget?
                if(useFakeRootForDetached && dojoAccessor.isDetachedWidget(mainSelection)) {
                    //add fake widget as root of selectionPath
                    selectionPath = [detachedWidgetsFakeRoot].concat(selectionPath);
                }
            }
            
            //create treeNodes for the root widgets            
            var treeRoots = DojoReps.WidgetsTreeRep.createWrappersForWidgets(widgets, selectionPath);            
            DojoReps.WidgetsTreeRep.tag.append({object: treeRoots, propertiesToShow: funcWidgetProperties, expandPath: selectionPath}, this.panelNode);
        }

        return areThereAnyWidgets;
    },

    /**
     * Show the connections
     */
    showConnectionsInTable: function(context) {
        this.updatePanelView(
                new PanelRenderConfig(/*refreshMainPanel*/true, /*mainPanelView*/PanelRenderConfig.VIEW_CONNECTIONS, /*highlight*/true, /*scroll*/true,
                                      /*refreshSidePanel*/false, /*sidePanelView*/null), context);
    },
    
    
    /**
     * creates the filtering criteria to ask for connections to the model.
     * The criteria is built from user entered values in UI
     */
    /*obj|undefined if not valid*/_createConnectionsFilter: function(context) {
        
        //FIXME add somekind of validation
        var count = parseInt(Firebug.chrome.$("dojoConnCountBox").value, 10);
        var fromIndex = parseInt(Firebug.chrome.$("dojoConnFromIndexBox").value, 10);
        var query = Firebug.chrome.$("dojoConnFilterBox").value;
        
        if(!count || isNaN(count)) {
            count = undefined;
        }
        if(!fromIndex || isNaN(fromIndex)) {
            fromIndex = undefined;
        } 
        if(!query || query.trim().length == 0) {
            query = undefined;
        }

        
        var filteringCriteria = {};
        filteringCriteria['from'] = fromIndex;
        filteringCriteria['count'] = count;
               
        if(query) {
            var isJson = Str.trimLeft(query).indexOf("{") == 0;
            var actualQuery;
            if(isJson) {
                var originUrl = context.window.location.href;
                var queryObj = Json.parseJSONString(query, originUrl);
                if(!queryObj) {
                    //parsing ended in error . Notify user and exit...                    
                    return;
                }

                //create "our" query . Valid keys: object, event, context and method.        
                actualQuery = {};
                if(queryObj.object) { actualQuery.obj = queryObj.object; }
                if(queryObj.event) { actualQuery.event = queryObj.event; }
                if(queryObj.context) { actualQuery.context = queryObj.context; }
                if(queryObj.method) { actualQuery.method = queryObj.method; }
                
                if(queryObj.ignoreCase != undefined) { 
                    filteringCriteria.queryOptions = {};
                    filteringCriteria.queryOptions.ignoreCase = queryObj.ignoreCase; 
                }

            } else {
                actualQuery = query;
                //plainQueryOverFields note: 'method' must be the last, as it is expensive to format it.
                filteringCriteria.plainQueryOverFields = [ 'event' /*, 'obj', 'context'*/, 'method' ];
                //xxxPERFORMANCE
            }        
            filteringCriteria['query'] = actualQuery;
        }

        return filteringCriteria;
    },
    
    /*object*/_initFormatters: function() {
        //Formatters that know how to "stringify" an object
        if(this.formatters) {
            //already init...exit
            return this.formatters;
        }
        
        var formatters = this.formatters = {};
        formatters['obj'] = formatters['context'] = { format: function(object) 
                { 
                    var rep = Firebug.getRep(object);
                    if(rep && rep.getTitle) {
                        return rep.getTitle(object);
                    } else {
                        return object.toString();
                    }
                } 
        };
        formatters['method'] = { format: function(method) 
                {
                    return DojoReps.getMethodLabel(method);
                }
        };        
        
        return this.formatters;
    },
    
    /**
     * Render the Connections view
     * !Do not invoke this method directly. it must be just invoked from the updatePanelView method.
     */
    _renderConnectionsInTable: function(context) {
        this._setOption(SHOW_CONNECTIONS_TABLE, context);

        if(!context.connectionsAPI) {
            return;
        }
        
        var filteringCriteria = this._createConnectionsFilter(context);
        if(!filteringCriteria) {
            //parsing ended in error . Notify user and exit...
            Css.setClass(Firebug.chrome.$("dojoConnFilterBox"), "dojoConnFilterBox-attention");
            return;
        }

        Css.removeClass(Firebug.chrome.$("dojoConnFilterBox"), "dojoConnFilterBox-attention");
        
        var formatters = this._initFormatters();
        
        // TODO: Add comments (priorityCriteriaArray)
        var criterias = [DojoModel.ConnectionArraySorter.OBJ,
                          DojoModel.ConnectionArraySorter.EVENT,
                           DojoModel.ConnectionArraySorter.CONTEXT,
                           DojoModel.ConnectionArraySorter.METHOD];
        
        // Sort the connection array.
        var priorityCriteriaArray = context.priorityCriteriaArray || criterias; 

        //TODO preyna sorted table: enable again!
//        var cons = context.connectionsAPI.getConnections(priorityCriteriaArray);
        var cons = context.connectionsAPI.getConnections(filteringCriteria, formatters);
        
        var document = this.document;
        
        // Show the visual content.
        this.connectionsMessageBox.loadMessageBox(false);
        
        // There are connections registered
        if (cons.length > 0) {
            var self = this;
            
            var maxSuggestedConns = DojoPrefs.getMaxSuggestedConnections(); 
            if(!context.dojo.showConnectionsAnyway && (cons.length > maxSuggestedConns)) {
                /* Warning message box *many* connections in page */
                var manyConMsgBox = new UI.ActionMessageBox("ManyConnsMsgBox", this.panelNode, 
                                                                Locale.$STRF('warning.manyConnections', [ maxSuggestedConns ], DOJO_BUNDLE),
                                                                Locale.$STR('warning.manyConnections.button', DOJO_BUNDLE),
                                                                function(actionMessageBox){
                                                                    context.dojo.showConnectionsAnyway = true;
                                                                    self.showConnectionsInTable(context);
                                                                });
                manyConMsgBox.loadMessageBox(true);
                return;
            }
            
            context.dojo.showConnectionsAnyway = undefined;
            var sorterFunctionGenerator = function(criteriaPriorityArray){
                return function(){
                    context.priorityCriteriaArray = criteriaPriorityArray;
                    self.showConnectionsInTable.call(self, context);
                };
            };
            
            DojoReps.ConnectionsTableRep.tag.append({connections: cons,
                                                     priorityCriteriaArray: priorityCriteriaArray,
                                                     sorterObject: sorterFunctionGenerator([DojoModel.ConnectionArraySorter.OBJ,
                                                                                            DojoModel.ConnectionArraySorter.EVENT,
                                                                                              DojoModel.ConnectionArraySorter.CONTEXT,
                                                                                              DojoModel.ConnectionArraySorter.METHOD]),
                                                                                              
                                                     sorterEvent: sorterFunctionGenerator([DojoModel.ConnectionArraySorter.EVENT,
                                                                                            DojoModel.ConnectionArraySorter.OBJ,
                                                                                              DojoModel.ConnectionArraySorter.CONTEXT,
                                                                                              DojoModel.ConnectionArraySorter.METHOD]),
                                                                                              
                                                     sorterContext: sorterFunctionGenerator([DojoModel.ConnectionArraySorter.CONTEXT,
                                                                                              DojoModel.ConnectionArraySorter.METHOD,
                                                                                              DojoModel.ConnectionArraySorter.OBJ,
                                                                                              DojoModel.ConnectionArraySorter.EVENT]),
                                                                                              
                                                     sorterMethod: sorterFunctionGenerator([DojoModel.ConnectionArraySorter.METHOD,
                                                                                            DojoModel.ConnectionArraySorter.CONTEXT,
                                                                                              DojoModel.ConnectionArraySorter.OBJ,
                                                                                              DojoModel.ConnectionArraySorter.EVENT])}, this.panelNode);
            
        } else {
            DojoReps.Messages.infoTag.append({object: Locale.$STR('warning.noConnectionsRegistered', DOJO_BUNDLE)}, this.panelNode);
        }
        
    },
    
    /**
     * Show the Subscriptions
     */
    showSubscriptions: function(context) {
        this.updatePanelView(
                new PanelRenderConfig(/*refreshMainPanel*/true, /*mainPanelView*/PanelRenderConfig.VIEW_SUBSCRIPTIONS, /*highlight*/true, /*scroll*/true,
                                      /*refreshSidePanel*/false, /*sidePanelView*/null), context);
    },
        
    /**
     * Render the Subscriptions view
     * !Do not invoke this method directly. it must be just invoked from the updatePanelView method.
     */
    _renderSubscriptions: function(context) {
        this._setOption(SHOW_SUBSCRIPTIONS, context);
        
        if(!context.connectionsAPI) {
            return;
        }

        var document = this.document;
        
        // Show the visual content.
        this.subscriptionsMessageBox.loadMessageBox(false);
        
        // There are connections registered
        var subs = context.connectionsAPI.getSubscriptions();
        var len = subs.getValues().length; 
        if (len > 0) {
            
            var maxSuggestedSubs = DojoPrefs.getMaxSuggestedSubscriptions(); 
            if(!context.dojo.showSubscriptionsAnyway && (len > maxSuggestedSubs)) {
                var self = this;
                /* Warning message box *many* subscriptions in page */
                var manySubsMsgBox = new UI.ActionMessageBox("ManySubsMsgBox", this.panelNode, 
                                                                Locale.$STRF('warning.manySubscriptions', [ maxSuggestedSubs ], DOJO_BUNDLE),
                                                                Locale.$STR('warning.manySubscriptions.button', DOJO_BUNDLE),
                                                                function(actionMessageBox){
                                                                    context.dojo.showSubscriptionsAnyway = true;
                                                                    self.showSubscriptions(context);
                                                                });
                manySubsMsgBox.loadMessageBox(true);
            
            } else {
                context.dojo.showSubscriptionsAnyway = undefined;
                DojoReps.SubscriptionsRep.tag.append({object: subs}, this.panelNode);
            }

        } else {
            DojoReps.Messages.infoTag.append({object: Locale.$STR('warning.noSubscriptionsRegistered', DOJO_BUNDLE)}, this.panelNode);
        }
    },
    
    /**
     * Support for panel activation.
     */
    onActivationChanged: function(enable)
    {
        if (enable) {
            DojoExtension.dojofirebugextensionModel.addObserver(this);
        } else {
            DojoExtension.dojofirebugextensionModel.removeObserver(this);
        }
    }

}); //end dojofirebugextensionPanel

// ****************************************************************
// SIDE PANELS
// ****************************************************************
/**
 * @panel Info Side Panel.
 * This side panel shows general information about the dojo version and configuration use in the page. 
 */
DojoPanels.DojoInfoSidePanel = function() {};
DojoPanels.DojoInfoSidePanel.prototype = Obj.extend(Firebug.Panel,
{
    name: "dojoInformationSidePanel",
    title: Locale.$STR('panel.dojoInformationSidePanel.title', DOJO_BUNDLE),
    parentPanel: DojoPanels.dojofirebugextensionPanel.prototype.name,
    order: 1,
    enableA11y: true,
    deriveA11yFrom: "console",
    editable: false,
    
    _COUTER_UPDATE_DELAY : 100,
    
    _connectionCounterId: "connectionCounterId",
    _subscriptionCounterId: "subscriptionCounterId",
    _widgetsCounterId: "widgetsCounterId",

    _getDojoInfo: function(context) {        
        var accessor = getDojoAccessor(context);
        if(!accessor) {
            return;
        }
                
        return accessor.getDojoInfo(context);
    },

    initialize: function() {
        Firebug.Panel.initialize.apply(this, arguments);
        
        // Listeners registration for automatic connections and subscriptions counter.
        var ctx = _safeGetContext(this);
        var self = this;
        var eventsRegistrator = new DojoModel.EventsRegistrator(ctx.connectionsAPI);
        var connectionsCounterGetter = function() {
            if(!ctx.connectionsAPI) { return; } 
            self._updateCounter(this.connectionCounterNode, ctx.connectionsAPI.getConnections().length);
        };
        var subscriptionsCounterGetter = function() {
            if(!ctx.connectionsAPI) { return; }
            self._updateCounter(this.subscriptionCounterNode, ctx.connectionsAPI.getSubscriptionsList().length); 
        };
        var widgetsCounterGetter = function() {
            if(!ctx.dojo.dojoAccessor) { return; }
            self._updateCounter(this.widgetsCounterNode, ctx.dojo.dojoAccessor.getDijitRegistrySize(ctx)); 
        };

        //registers the listeners into model...
        eventsRegistrator.registerListenerForEvent(
                [DojoModel.ConnectionsAPI.ON_CONNECTION_ADDED, DojoModel.ConnectionsAPI.ON_CONNECTION_REMOVED], connectionsCounterGetter);
        eventsRegistrator.registerListenerForEvent(
                [DojoModel.ConnectionsAPI.ON_SUBSCRIPTION_ADDED, DojoModel.ConnectionsAPI.ON_SUBSCRIPTION_REMOVED], subscriptionsCounterGetter);
        eventsRegistrator.registerListenerForEvent(
                [DojoModel.ConnectionsAPI.ON_CONNECTION_ADDED, DojoModel.ConnectionsAPI.ON_CONNECTION_REMOVED], widgetsCounterGetter);

        ctx.infoPanelCoutersRefreshEventsReg = eventsRegistrator;
        
        _addStyleSheet(this.document);
    },

    show: function(state) {
        var ctx = _safeGetContext(this);
        this.showInfo(ctx);
        if (ctx.infoPanelCoutersRefreshEventsReg){
            ctx.infoPanelCoutersRefreshEventsReg.setPropertyToListenersContext(
                    "connectionCounterNode", this._getCounterNode(this._connectionCounterId));
            ctx.infoPanelCoutersRefreshEventsReg.setPropertyToListenersContext(
                    "subscriptionCounterNode", this._getCounterNode(this._subscriptionCounterId));
            ctx.infoPanelCoutersRefreshEventsReg.setPropertyToListenersContext(
                    "widgetsCounterNode", this._getCounterNode(this._widgetsCounterId));
            ctx.infoPanelCoutersRefreshEventsReg.addAllListeners();
        }
    },
    
    hide: function(state) {
        var ctx = _safeGetContext(this);
        if (ctx.infoPanelCoutersRefreshEventsReg){
            ctx.infoPanelCoutersRefreshEventsReg.removeAllListeners();
        }
    },
    
    _getCounterNode: function(counterId){
        // FIXME: Use $() function. Find out why this.panelNode has no getElementById method. 
        var counters = this.panelNode.getElementsByClassName(counterId);
        return (counters.length > 0) ? counters[0] : null;//$('connectionCounterId', this.panelNode);
    },
    
    _updateCounter: function(counterNode, number) {
        if (counterNode) {
            counterNode.innerHTML = number;
        }
    },
    
    /**
     * added custom method (this one) instead of updateSelection to avoid changing the contents of
     * this panel when not needed.
     */
    showInfo: function(context) {
        var dojoInfo = this._getDojoInfo(context);
        
        if(!dojoInfo) {
            Dom.clearNode(this.panelNode);
            return;
        }

        var accessor = getDojoAccessor(context);
        
        //Dojo version
        var versionLabel = Locale.$STR('dojo.version.label', DOJO_BUNDLE);
        var versionObject = {};
        versionObject[versionLabel] = dojoInfo.version;
        Firebug.DOMPanel.DirTable.tag.replace({object: versionObject }, this.panelNode);
        
        //Dojo config
        Firebug.DOMPanel.DirTable.tag.append({object: dojoInfo.djConfig}, this.panelNode);

        //Module prefixes
        var modLabel = Locale.$STR('dojo.modulesPrefixes.label', DOJO_BUNDLE);
        var modPrefixes = {};
        modPrefixes[modLabel] = dojoInfo.modulePrefixes;
        Firebug.DOMPanel.DirTable.tag.append({object: modPrefixes}, this.panelNode);

        //Global connections count
        var globalConnectionsCount = (context.connectionsAPI) ? context.connectionsAPI.getConnections().length : 0;
        DojoReps.CounterLabel.tag.append({label: Locale.$STR('conn.count.title', DOJO_BUNDLE),
                                          object: globalConnectionsCount, 
                                          counterLabelClass:"countOfConnectionLabel",
                                          counterValueId: this._connectionCounterId}, this.panelNode);
        
        //Global subscriptions count
        var globalSubscriptionsCount = (context.connectionsAPI) ? context.connectionsAPI.getSubscriptionsList().length : 0;
        DojoReps.CounterLabel.tag.append({label: Locale.$STR('subs.count.title', DOJO_BUNDLE),
                                          object: globalSubscriptionsCount, 
                                          counterLabelClass:"countOfSubscriptionLabel",
                                          counterValueId: this._subscriptionCounterId}, this.panelNode);

        //Widgets in registry count
        var widgetsCount = accessor ? accessor.getDijitRegistrySize(context) : 0;
        DojoReps.CounterLabel.tag.append({label: Locale.$STR('widgets.count.title', DOJO_BUNDLE),
                                          object: widgetsCount, 
                                          counterLabelClass:"countOfWidgetsLabel",
                                          counterValueId: this._widgetsCounterId}, this.panelNode);

    },
    
    refresh: function() {
        this.showInfo(_safeGetContext(this));
    },

    getOptionsMenuItems: function() {
        return [
            {label: Locale.$STR('label.Refresh', DOJO_BUNDLE), nol10n: true, command: Obj.bind(this.refresh, this) }
        ];
    }
    
});


var SimplePanelPlusMixin = Obj.extend(Firebug.Panel, DojoPanelMixin);
SimplePanelPlusMixin = Obj.extend(SimplePanelPlusMixin, {
    /**
     * The select method is extended to ensure the selected object
     * is the same one at this side panel and in the main panel.
     * @override 
     */
    select: function(object, forceUpdate) {
        var mainSO = _safeGetContext(this).dojoExtensionSelection;
        if (mainSO == object) {
            Firebug.Panel.select.call(this, object, true);
        }
    }
});

/**
 * @panel Connections Side Panel.
 * This side panel shows the connections information for the selected object. 
 */
DojoPanels.ConnectionsSidePanel = function() {};
DojoPanels.ConnectionsSidePanel.prototype = Obj.extend(SimplePanelPlusMixin,
{
    name: "connectionsSidePanel",
    title: Locale.$STR('panel.connections.title', DOJO_BUNDLE),
    parentPanel: DojoPanels.dojofirebugextensionPanel.prototype.name,
    order: 2,
    enableA11y: true,
    deriveA11yFrom: "console",
    //breakable: true,
    editable: false,
    
    initialize: function() {
        Firebug.Panel.initialize.apply(this, arguments);
        _addStyleSheet(this.document);
    },

    /**
     * Returns a number indicating the view's ability to inspect the object.
     * Zero means not supported, and higher numbers indicate specificity.
     */
    supportsObject: function(object, type) {
        var api = _safeGetContext(this).connectionsAPI;
        return (api && api.areThereAnyConnectionsFor(object)) ? 2001 : 0;
    },

    /**
     * triggered when there is a Firebug.chrome.select() that points to the parent panel.
     */
    updateSelection: function(object) {
        var api = _safeGetContext(this).connectionsAPI;
        var objectInfo = (api) ? api.getConnection(object) : null;
        var connectionsTracker  = (objectInfo) ? objectInfo.getConnectionsTracker() : null;
        
        if(connectionsTracker && !connectionsTracker.isEmpty()) {
            DojoReps.ConnectionsInfoRep.tag.replace({ object: connectionsTracker }, this.panelNode);
        } else {
            DojoReps.Messages.infoTag.replace({object: Locale.$STR('warning.noConnectionsInfoForTheObject', DOJO_BUNDLE)}, this.panelNode);
        }
    }
    
});

/**
 * @panel Subscriptions Side Panel.
 * This side panel shows the subscriptions information for the selected object. 
 */
DojoPanels.SubscriptionsSidePanel = function() {};
DojoPanels.SubscriptionsSidePanel.prototype = Obj.extend(SimplePanelPlusMixin,
{
    name: "subscriptionsSidePanel",
    title: Locale.$STR('panel.subscriptions.title', DOJO_BUNDLE),
    parentPanel: DojoPanels.dojofirebugextensionPanel.prototype.name,
    order: 3,
    enableA11y: true,
    deriveA11yFrom: "console",
    //breakable: true,
    editable: false,

    initialize: function() {
        Firebug.Panel.initialize.apply(this, arguments);
        _addStyleSheet(this.document);
    },

    /**
     * Returns a number indicating the view's ability to inspect the object.
     * Zero means not supported, and higher numbers indicate specificity.
     */
    supportsObject: function(object, type) {
        var api = _safeGetContext(this).connectionsAPI;
        return (api && api.areThereAnySubscriptionFor(object)) ? 2000 : 0;
    },
    
    /**
     * triggered when there is a Firebug.chrome.select() that points to the parent panel.
     */
    updateSelection: function(object) {
        var api = _safeGetContext(this).connectionsAPI;
        var objectInfo = (api) ? api.getConnection(object) : null;
        var subscriptionsTracker = (objectInfo) ? objectInfo.getSubscriptionsTracker() : null;
        
        if(subscriptionsTracker && !subscriptionsTracker.isEmpty()) {
            DojoReps.SubscriptionsArrayRep.tag.replace({ object: subscriptionsTracker}, this.panelNode);
        } else {
            DojoReps.Messages.infoTag.replace({object: Locale.$STR('warning.noSubscriptionsInfoForTheObject', DOJO_BUNDLE)}, this.panelNode);
        }
    }

});

//************************************************************************************************

/**
 * @panel Widget Properties Side Panel.
 * This side panel displays the dojo highlevel properties for the selected widget. 
 */
DojoPanels.WidgetPropertiesSidePanel = function(){};
DojoPanels.WidgetPropertiesSidePanel.prototype = Obj.extend(SimplePanelPlusMixin,
{
    name: "widgetPropertiesSidePanel",
    title: Locale.$STR('panel.widgetProperties.title', DOJO_BUNDLE),
    parentPanel: DojoPanels.dojofirebugextensionPanel.prototype.name,
    order: 4,
    editable: false,
    
    initialize: function() {
        Firebug.Panel.initialize.apply(this, arguments);
        _addStyleSheet(this.document);
    },

    /**
     * Returns a number indicating the view's ability to inspect the object.
     * Zero means not supported, and higher numbers indicate specificity.
     */
    supportsObject: function(object, type) {
        var dojoAccessor = getDojoAccessor(_safeGetContext(this));
        return (dojoAccessor && dojoAccessor.isWidgetObject(object)) ? 2000 : 0;
    },

    updateSelection: function(widget) {
        if(this.supportsObject(widget)) {
            var context = _safeGetContext(this);
            var dojoAccessor = getDojoAccessor(context);
            var objectToDisplay = dojoAccessor.getSpecificWidgetProperties(widget, context);
            Firebug.DOMPanel.DirTable.tag.replace( { object: objectToDisplay }, this.panelNode);
        } else {
            DojoReps.Messages.infoTag.replace({object: Locale.$STR('warning.objectIsNotAWidget', DOJO_BUNDLE)}, this.panelNode);
        }
    }

});


//************************************************************************************************

/**
 * @panel DOM Side Panel.
 * This side panel shows the same info the the DOM panel shows for the selected object. 
 */
DojoPanels.DojoDOMSidePanel = function(){};
DojoPanels.DojoDOMSidePanel.prototype = Obj.extend(Firebug.DOMBasePanel.prototype,
{
    name: "dojoDomSidePanel",
    title: "DOM",
    parentPanel: DojoPanels.dojofirebugextensionPanel.prototype.name,
    order: 5,
    enableA11y: true,
    deriveA11yFrom: "console",
    
    updateSelection: function(object) {
       if (_safeGetContext(this).dojoExtensionSelection) {
            return Firebug.DOMBasePanel.prototype.updateSelection.apply(this, arguments);
       }
    }

});

// ************************************************************************************************

/**
 * @panel HTML Side Panel.
 * This side panel shows the same info the the HTML panel shows for the selected object. 
 */
DojoPanels.DojoHTMLPanel = function(){};
DojoPanels.DojoHTMLPanel.prototype = Obj.extend(Firebug.HTMLPanel.prototype,
{
    name: "dojoHtmlSidePanel",
    title: "HTML",
    parentPanel: DojoPanels.dojofirebugextensionPanel.prototype.name,
    order: 6,
    enableA11y: true,
    deriveA11yFrom: "console",

    initialize: function(context, doc) {
        Firebug.HTMLPanel.prototype.initialize.apply(this, arguments);
        _addStyleSheet(this.document);
    },

    show: function(state) {
        Firebug.HTMLPanel.prototype.show.apply(this, arguments);
        this.showToolbarButtons("fbHTMLButtons", false);
    },

    updateSelection: function(object) {
        var dojoPanelSelection = _safeGetContext(this).dojoExtensionSelection;
        // Verify if selected object is the same one that is setted in the dojo panel.
        if (dojoPanelSelection && 
            ((object == dojoPanelSelection) || (dojoPanelSelection['domNode'] == object))) {
            // Verify if the object is a widget in order to show the domNode info.
            var dojoAccessor = getDojoAccessor(_safeGetContext(this));
            if (dojoAccessor.isWidgetObject(object)){
                this.select(object.domNode);
            } else {
                if (!object.nodeType){
                    DojoReps.Messages.infoTag.replace({object: Locale.$STR('warning.noHTMLInfoForTheObject', DOJO_BUNDLE)}, this.panelNode);
                }
                return Firebug.HTMLPanel.prototype.updateSelection.apply(this, arguments);
            }
       }
    }
});

//****************************************************************
//SIDE PANELS (END)
//****************************************************************
    
    
/***********************************************************************************************************************/

    Firebug.registerPanel(DojoPanels.dojofirebugextensionPanel);
    Firebug.registerPanel(DojoPanels.DojoInfoSidePanel);
    Firebug.registerPanel(DojoPanels.ConnectionsSidePanel);
    Firebug.registerPanel(DojoPanels.SubscriptionsSidePanel);
    Firebug.registerPanel(DojoPanels.WidgetPropertiesSidePanel);
    Firebug.registerPanel(DojoPanels.DojoDOMSidePanel);
    Firebug.registerPanel(DojoPanels.DojoHTMLPanel);
    

    // ***************************************************************
    // exported classes
    // ***************************************************************    

    
    return DojoPanels;
});
