/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

var autoExportButton = $("netExportAuto");

// ************************************************************************************************
// Controller for automatic export.

Firebug.NetExport.Automation = extend(Firebug.Module,
{
    active: false,
    pageObservers: {},

    initialize: function(owner)
    {
        
    },

    shutdown: function()
    {
        
    },

    watchWindow: function(context, win)
    {
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Automation; watchWindow");
    },

    unwatchWindow: function(context, win)
    {
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Automation; unwatchWindow");

        //this.removePageObserver(win);
    },

    // Make sure the Auto Export button is properly updated withing the Net panel.
    showPanel: function(browser, panel)
    {
        if (panel.name == "net")
            this.updateUI();
    },

    // Activation
    isActive: function()
    {
        return this.active;
    },

    activate: function()
    {
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Automation: Auto export activated.");

        this.active = true;
        this.updateUI();

        HttpObserver.register();
    },

    deactivate: function()
    {
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Automation: Auto export deactivated.");

        this.active = false;
        this.updateUI();

        HttpObserver.unregisgter();
    },

    updateUI: function()
    {
        autoExportButton.setAttribute("state", this.active ? "active" : "inactive");
        autoExportButton.setAttribute("tooltiptext", this.active ?
            $STR("netexport.menu.tooltip.Deactivate Auto Export") :
            $STR("netexport.menu.tooltip.Activate Auto Export"));
    },

    // Callback, the page has been loaded.
    onPageLoaded: function(win)
    {
        this.removePageObserver(win);

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Automation; onPageLoaded, EXPORT");
    },

    // Page load observers
    addPageObserver: function(win)
    {
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Automation; Page load observer created for: " +
                safeGetWindowLocation(win));

        this.pageObservers[win] = new PageLoadObserver(win);
    },

    removePageObserver: function(win)
    {
        var pageObserver = this.pageObservers[win];
        if (!pageObserver)
        {
            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.Automation; ERROR Can't remove page observer for: " +
                    safeGetWindowLocation(win));
            return;
        }

        pageObserver.destroy();
        delete this.pageObservers[win];
    },

    onRequestBegin: function(request, win)
    {
        var pageObserver = this.pageObservers[win];
        if (!pageObserver)
        {
            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.Automation.onRequestBegin; ERROR No page-observer for " +
                    safeGetRequestName(request), this.pageObservers);
            return;
        }

        pageObserver.addRequest(request);
    },

    onRequestEnd: function(request, win)
    {
        var pageObserver = this.pageObservers[win];
        if (!pageObserver)
        {
            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.Automation.onRequestEnd; ERROR No page-observer for " +
                    safeGetRequestName(request), this.pageObservers);
            return;
        }

        pageObserver.removeRequest(request);
    }
});

// ************************************************************************************************

Firebug.NetExport.PageLoadObserver = function(win)
{
    this.window = win;
    this.requests = [];
}

Firebug.NetExport.PageLoadObserver.prototype =
{
    addRequest: function(request)
    {
        this.requests.push(request);

        clearTimeout(this.timeout);
        delete this.timeout;
    },

    removeRequest: function(request)
    {
        remove(this.requests, request);
        if (this.requests.length > 0)
            return;

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.PageObserver; Looks like all requests are finished" +
                safeGetRequestName(request));

        // Wait yet a little bit to catch even delayed XHR.
        this.timeout = setTimeout(bindFixed(this.onPageLoaded, this), 1500);
    },

    onPageLoaded: function()
    {
        // If no reqeusts appeared, the page is loaded.
        if (this.requests.length == 0)
            Automation.onPageLoaded(this.window);
    },

    destroy: function()
    {
        clearTimeout(this.timeout);
        delete this.timeout;
    }
};

// ************************************************************************************************
// HTTP Observer

Firebug.NetExport.HttpObserver = 
{
    registered: false,

    register: function()
    {
        if (this.registered)
        {
            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.HttpObserver; HTTP observer already registered!");
            return;
        }

        httpObserver.addObserver(this, "firebug-http-event", false);
        this.registered = true;
    },

    unregister: function()
    {
        if (!this.registered)
        {
            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.HttpObserver; HTTP observer already unregistered!");
            return;
        }

        httpObserver.removeObserver(this, "firebug-http-event");
        this.registered = false;
    },

    /* nsIObserve */
    observe: function(subject, topic, data)
    {
        try
        {
            if (!(subject instanceof Ci.nsIHttpChannel))
                return;

            // xxxHonza: this is duplication, fix me.
            var win = getWindowForRequest(subject);
            if (!win)
                return;

            var tabId = win ? Firebug.getTabIdForWindow(win) : null;
            if (!tabId)
                return;

            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.observe " + topic.toUpperCase() +
                    ", " + safeGetRequestName(subject));

            if (topic == "http-on-modify-request")
                this.onModifyRequest(subject, win);
            else if (topic == "http-on-examine-response" )
                this.onExamineResponse(subject, win);
            else if (topic == "http-on-examine-cached-response")
                this.onExamineResponse(subject, win);
        }
        catch (err)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("net.observe EXCEPTION", err);
        }
    },

    onModifyRequest: function(request, win)
    {
        var name = request.URI.asciiSpec;
        var origName = request.originalURI.asciiSpec;
        var isRedirect = (name != origName);

        // We need to catch new document load.
        if ((request.loadFlags & Ci.nsIChannel.LOAD_DOCUMENT_URI) &&
            request.loadGroup && request.loadGroup.groupObserver &&
            win == win.parent && !isRedirect)
        {
            Automation.addPageObserver(win);
        }

        Automation.onRequestBegin(request, win);
    },

    onExamineResponse: function(request, win)
    {
        Automation.onRequestEnd(request, win);
    },

    /* nsISupports */
    QueryInterface: function(iid)
    {
        if (iid.equals(Ci.nsISupports) ||
            iid.equals(Ci.nsIObserver)) {
             return this;
         }

        throw Cr.NS_ERROR_NO_INTERFACE;
    }
}

// ************************************************************************************************
// Shortcuts for this namespace

var Automation = Firebug.NetExport.Automation;
var HttpObserver = Firebug.NetExport.HttpObserver;
var PageLoadObserver = Firebug.NetExport.PageLoadObserver;

// ************************************************************************************************

Firebug.registerModule(Firebug.NetExport.Automation);

// ************************************************************************************************
}});
