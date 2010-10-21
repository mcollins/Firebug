const apiutils = requuire("api-utils");

exports.Panel = apiutils.publicConstructor(Panel);
exports.add = function(panel) { firebugManager.addPanel(panel); };
exports.remove = function(panel) { firebugManager.removePanel(panel); };

// TODO: remove
exports.add = function(a, b) {
    return a+b;
}

// ************************************************************************************************
// The panel object.

function Panel(options)
{
    options = apiutils.validateOptions(options, {
        label: {
            is: ["string"],
            ok: function (v) { v.length > 0 },
            msg: "The panel must have a non-empty label property.",
        },
        initialize: {
            is: ["function"],
        },
        shutdown: {
            is: ["function"],
        },
        content: {
            is: ["null", "undefined", "string"],
        }
    });

    this.toString = function Panel_toString() {
        return '[object Panel "' + options.label + '"]';
    }
}

// ************************************************************************************************
// Firebug Manager

var firebugManager =
{
    panels: [],
    windows: [],

    // Registers the manager to listen for window openings and closings. Note
    // that calling this method can cause onTrack to be called immediately if
    // there are open windows.
    init: function() {
        var windowTracker = new (require("window-utils").WindowTracker)(this);
        require("unload").ensure(windowTracker);
    },

    // Registers a window with the manager. This is a WindowTracker callback.
    onTrack: function firebugManager_onTrack(window) {
        if (this._isFirebugWindow(window)) {
            var win = new FirebugWindow(window);
            win.addItems(this.panels);
            this.windows.push(win);
        }
    },

    // Unregisters a window from the manager.  It's told to undo all 
    // modifications.  This is a WindowTracker callback.  Note that when
    // WindowTracker is unloaded, it calls onUntrack for every currently opened
    // window.  The browserManager therefore doesn't need to specially handle
    // unload itself, since unloading the browserManager means untracking all
    // currently opened windows.
    onUntrack: function firebugManager_onUntrack(window) {
        if (this._isFirebugWindow(window)) {
            for (var i = 0; i < this.windows.length; i++) {
                if (this.windows[i].window == window) {
                    var win = this.windows.splice(i, 1)[0];
                    win.destroy();
                    return;
                }
            }
        }
    },

    // Registers a panel with the manager. It's added to the add-on bar of
    // all currently registered windows, and when new windows are registered it
    // will be added to them, too.
    addPanel: function firebugManager_addPanel(panel) {
        var idx = this.panels.indexOf(panel);
        if (idx > -1)
            throw new Error("The panel " + panel + " has already been added.");
        this.panels.push(panel);
        this.windows.forEach(function(w) {
            w.addPanels([panel]);
        });
    },

    // Unregisters an item from the manager.  It's removed from the addon-bar
    // of all windows that are currently registered.
    removePanel: function browserManager_removePanel(panel) {
        var idx = this.panels.indexOf(panel);
        if (idx == -1) {
            throw new Error("The panel " + panel + " has not been added " +
                "and therefore cannot be removed.");
        }
        this.panels.splice(idx, 1);
        this.windows.forEach(function(w){
            w.removePanels([panel]);
        });
    },

    _isFirebugWindow: function browserManager__isFirebugWindow(win) {
        var winType = win.document.documentElement.getAttribute("windowtype");
        return winType === "navigator:browser";
    }
}

// ************************************************************************************************
// Firebug window

// Keeps track of a single browser window.  Responsible for providing a
// description of the window's current context and determining whether an item
// matches the current context.
//
// This is where the core of how a widget's content is added to a window lives.
//
// TODO: If other apps besides Firefox want to support the add-on bar in
// whatever way is appropriate for them, plugging in a substitute for this class
// should be the way to do it.  Make it easy for them.  See bug 560716.
function FirebugWindow(window)
{
    this.window = window;
    this.doc = window.document;
    this._init();
}

FirebugWindow.prototype = {

    _init: function FW__init() {
        // Array of panels:
        this._items = [];
    },

    // Adds an array of items to the window.
    addPanel: function FW_addPanels(panels) {
        panels.forEach(this._addPanelToWindow, this);
    },

    // Add a widget to this window.
    _addPanelToWindow: function FW__addPanelToWindow(panel) {

        // Add to top-level widget container. Must be done early
        // so that widget content can attach event handlers.
        this.window.FirebugContext.addPanelType(panel.label, panel.label)
        this._items.push(panel);
    },

    // Removes an array of items from the window.
    removePanels: function FW_removePanels(removedPanels) {
        removedPanels.forEach(function(panel) {
            this.window.FirebugContext.removePanelType(panel.label, panel.label)
            this._items.splice(this._items.indexOf(panel), 1);
        }, this);
    },

    // Undoes all modifications to the window. The FirebugWindow
    // should not be used afterward.
    destroy: function FW_destroy() {
        // Remove all items from the panel
        var len = this._items.length;
        for (var i=0; i<len; i++)
            this.removePanels([this._items[0]]);
  }
};

// Init the firebugManager only after setting prototypes and such above, because
// it will cause browserManager.onTrack to be called immediately if there are
// open windows.
firebugManager.init();

