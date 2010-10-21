/* See license.txt for terms of usage */

var apiutils = require("api-utils");
var FBTrace = require("firebug-trace").FBTrace;
var Listener = require("firebug-listener").Listener;
var FBL = require("firebug-lib").FBL;

// ************************************************************************************************
// The panel object.

/**
 * @panel Base class for all panels. Every derived panel must define a constructor and
 * register with <code>Firebug.registerPanel</code> method. An instance of the panel
 * object is created by the framework for each browser tab where Firebug is activated.
 */
var Panel = exports.Panel = FBL.extend(new Listener(),
/** @lends Firebug.Panel */
{
    searchable: false,    // supports search
    editable: true,       // clicking on contents in the panel will invoke the inline editor, eg the CSS Style panel or HTML panel.
    breakable: false,     // if true, supports break-on-next (the pause button functionality)
    order: 2147483647,    // relative position of the panel (or a side panel)
    statusSeparator: "<", // the character used to separate items on the panel status (aka breadcrumbs) in the tool bar, eg ">"  in the DOM panel
    enableA11y: false,    // true if the panel wants to participate in A11y accessibility support.
    deriveA11yFrom: null, // Name of the panel that uses the same a11y logic.

    initialize: function(context, doc)
    {
        if (!context.browser)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("attempt to create panel with dud context!");
            return false;
        }

        this.context = context;
        this.document = doc;

        this.panelNode = doc.createElement("div");
        this.panelNode.ownerPanel = this;

        setClass(this.panelNode, "panelNode panelNode-"+this.name+" contextUID="+context.uid);

        // Load persistent content if any.
        var persistedState = Firebug.getPanelState(this);
        if (persistedState)
        {
            this.persistContent = persistedState.persistContent;
            if (this.persistContent && persistedState.panelNode)
                this.loadPersistedContent(persistedState);
        }

        doc.body.appendChild(this.panelNode);

        // Update panel's tab in case the break-on-next (BON) is active.
        var shouldBreak = this.shouldBreakOnNext();
        Firebug.Breakpoint.updatePanelTab(this, shouldBreak);

        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("firebug.initialize panelNode for "+this.name+"\n");

        this.initializeNode(this.panelNode);
    },

    destroy: function(state) // Panel may store info on state
    {
        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("firebug.destroy panelNode for "+this.name+"\n");

        if (this.panelNode)
        {
            if (this.persistContent)
                this.savePersistedContent(state);
            else
                delete state.persistContent;

            delete this.panelNode.ownerPanel;
        }

        this.destroyNode();

        clearDomplate(this.panelNode);
    },

    savePersistedContent: function(state)
    {
        state.panelNode = this.panelNode;
        state.persistContent = this.persistContent;
    },

    loadPersistedContent: function(persistedState)
    {
        // move the nodes from the persistedState to the panel
        while (persistedState.panelNode.firstChild)
            this.panelNode.appendChild(persistedState.panelNode.firstChild);

        scrollToBottom(this.panelNode);
    },

    // called when a panel in one XUL window is about to appear in another one.
    detach: function(oldChrome, newChrome)
    {
    },

    reattach: function(doc)  // this is how a panel in one window reappears in another window; lazy called
    {
        this.document = doc;

        if (this.panelNode)
        {
            this.panelNode = doc.adoptNode(this.panelNode, true);
            this.panelNode.ownerPanel = this;
            doc.body.appendChild(this.panelNode);
        }
    },

    // Called at the end of module.initialize; addEventListener-s here
    initializeNode: function(panelNode)
    {
        dispatch(this.fbListeners, "onInitializeNode", [this]);
    },

    // removeEventListener-s here.
    destroyNode: function()
    {
        dispatch(this.fbListeners, "onDestroyNode", [this]);
    },

    show: function(state)  // persistedPanelState plus non-persisted hide() values
    {
    },

    hide: function(state)  // store info on state for next show.
    {
    },

    watchWindow: function(win)
    {
    },

    unwatchWindow: function(win)
    {
    },

    updateOption: function(name, value)
    {
    },

    /*
     * Called after chrome.applyTextSize
     * @param zoom: ratio of current size to normal size, eg 1.5
     */
    onTextSizeChange: function(zoom)
    {

    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    /**
     * Toolbar helpers
     */
    showToolbarButtons: function(buttonsId, show)
    {
        try
        {
            var buttons = Firebug.chrome.$(buttonsId);
            collapse(buttons, !show);
        }
        catch (exc)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("firebug.Panel showToolbarButtons FAILS "+exc, exc);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    /**
     * Returns a number indicating the view's ability to inspect the object.
     *
     * Zero means not supported, and higher numbers indicate specificity.
     */
    supportsObject: function(object, type)
    {
        return 0;
    },

    hasObject: function(object)  // beyond type testing, is this object selectable?
    {
        return false;
    },

    navigate: function(object)
    {
        if (FBTrace.DBG_PANELS)
            FBTrace.sysout("navigate "+this.name+" to "+object+" when this.location="+this.location+"\n");
        if (!object)
            object = this.getDefaultLocation();
        if (!object)
            object = null;  // not undefined.

        if ( !this.location || (object != this.location) )  // if this.location undefined, may set to null
        {
            if (FBTrace.DBG_PANELS)
                FBTrace.sysout("navigate "+this.name+" to location "+object+"\n");

            this.location = object;
            this.updateLocation(object);

            dispatch(Firebug.uiListeners, "onPanelNavigate", [object, this]);
        }
    },

    /*
     * The location object has been changed, the panel should update it view
     * @param object a location, must be one of getLocationList() returns
     *  if  getDefaultLocation() can return null, then updateLocation must handle it here.
     */
    updateLocation: function(object)
    {
    },

    select: function(object, forceUpdate)
    {
        if (!object)
            object = this.getDefaultSelection();

        if(FBTrace.DBG_PANELS)
            FBTrace.sysout("firebug.select "+this.name+" forceUpdate: "+forceUpdate+" "+object+((object==this.selection)?"==":"!=")+this.selection);

        if (forceUpdate || object != this.selection)
        {
            this.selection = object;
            this.updateSelection(object);

            dispatch(Firebug.uiListeners, "onObjectSelected", [object, this]);
        }
    },

    /*
     * Firebug wants to show an object to the user and this panel has the best supportsObject() result for the object.
     * If the panel displays a container for objects of this type, it should set this.selectedObject = object
     */
    updateSelection: function(object)
    {
    },

    /*
     * Redisplay the panel based on the current location and selection
     */
    refresh: function()
    {
        if (this.location)
            this.updateLocation(this.location);
        else if (this.selection)
            this.updateSelection(this.selection);
    },

    markChange: function(skipSelf)
    {
        if (this.dependents)
        {
            if (skipSelf)
            {
                for (var i = 0; i < this.dependents.length; ++i)
                {
                    var panelName = this.dependents[i];
                    if (panelName != this.name)
                        this.context.invalidatePanels(panelName);
                }
            }
            else
                this.context.invalidatePanels.apply(this.context, this.dependents);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    startInspecting: function()
    {
    },

    stopInspecting: function(object, cancelled)
    {
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    search: function(text, reverse)
    {
    },

    /**
     * Retrieves the search options that this modules supports.
     * This is used by the search UI to present the proper options.
     */
    getSearchOptionsMenuItems: function()
    {
        return [
            Firebug.Search.searchOptionMenu("search.Case Sensitive", "searchCaseSensitive")
        ];
    },

    /**
     * Navigates to the next document whose match parameter returns true.
     */
    navigateToNextDocument: function(match, reverse)
    {
        // This is an approximation of the UI that is displayed by the location
        // selector. This should be close enough, although it may be better
        // to simply generate the sorted list within the module, rather than
        // sorting within the UI.
        var self = this;
        function compare(a, b) {
            var locA = self.getObjectDescription(a);
            var locB = self.getObjectDescription(b);
            if(locA.path > locB.path)
                return 1;
            if(locA.path < locB.path)
                return -1;
            if(locA.name > locB.name)
                return 1;
            if(locA.name < locB.name)
                return -1;
            return 0;
        }
        var allLocs = this.getLocationList().sort(compare);
        for (var curPos = 0; curPos < allLocs.length && allLocs[curPos] != this.location; curPos++);

        function transformIndex(index) {
            if (reverse) {
                // For the reverse case we need to implement wrap around.
                var intermediate = curPos - index - 1;
                return (intermediate < 0 ? allLocs.length : 0) + intermediate;
            } else {
                return (curPos + index + 1) % allLocs.length;
            }
        };

        for (var next = 0; next < allLocs.length - 1; next++)
        {
            var object = allLocs[transformIndex(next)];

            if (match(object))
            {
                this.navigate(object);
                return object;
            }
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    // Called when "Options" clicked. Return array of
    // {label: 'name', nol10n: true,  type: "checkbox", checked: <value>, command:function to set <value>}
    getOptionsMenuItems: function()
    {
        return null;
    },

    /*
     * Called by chrome.onContextMenu to build the context menu when this panel has focus.
     * See also FirebugRep for a similar function also called by onContextMenu
     * Extensions may monkey patch and chain off this call
     * @param object: the 'realObject', a model value, eg a DOM property
     * @param target: the HTML element clicked on.
     * @return an array of menu items.
     */
    getContextMenuItems: function(object, target)
    {
        return [];
    },

    getBreakOnMenuItems: function()
    {
        return [];
    },

    getEditor: function(target, value)
    {
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    getDefaultSelection: function()
    {
        return null;
    },

    browseObject: function(object)
    {
    },

    getPopupObject: function(target)
    {
        return Firebug.getRepObject(target);
    },

    getTooltipObject: function(target)
    {
        return Firebug.getRepObject(target);
    },

    showInfoTip: function(infoTip, x, y)
    {

    },

    getObjectPath: function(object)
    {
        return null;
    },

    // An array of objects that can be passed to getObjectLocation.
    // The list of things a panel can show, eg sourceFiles.
    // Only shown if panel.location defined and supportsObject true
    getLocationList: function()
    {
        return null;
    },

    getDefaultLocation: function()
    {
        return null;
    },

    getObjectLocation: function(object)
    {
        return "";
    },

    // Text for the location list menu eg script panel source file list
    // return.path: group/category label, return.name: item label
    getObjectDescription: function(object)
    {
        var url = this.getObjectLocation(object);
        return FBL.splitURLBase(url);
    },

    /*
     *  UI signal that a tab needs attention, eg Script panel is currently stopped on a breakpoint
     *  @param: show boolean, true turns on.
     */
    highlight: function(show)
    {
        var tab = this.getTab();
        if (!tab)
            return;

        if (show)
            tab.setAttribute("highlight", "true");
        else
            tab.removeAttribute("highlight");
    },

    getTab: function()
    {
        var chrome = Firebug.chrome;

        var tab = chrome.$("fbPanelBar2").getTab(this.name);
        if (!tab)
            tab = chrome.$("fbPanelBar1").getTab(this.name);
        return tab;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Support for Break On Next

    /**
     * Called by the framework when the user clicks on the Break On Next button.
     * @param {Boolean} armed Set to true if the Break On Next feature is
     * to be armed for action and set to false if the Break On Next should be disarmed.
     * If 'armed' is true, then the next call to shouldBreakOnNext should be |true|.
     */
    breakOnNext: function(armed)
    {
    },

    /**
     * Called when a panel is selected/displayed. The method should return true
     * if the Break On Next feature is currently armed for this panel.
     */
    shouldBreakOnNext: function()
    {
        return false;
    },

    /**
     * Returns labels for Break On Next tooltip (one for enabled and one for disabled state).
     * @param {Boolean} enabled Set to true if the Break On Next feature is
     * currently activated for this panel.
     */
    getBreakOnNextTooltip: function(enabled)
    {
        return null;
    },
});
