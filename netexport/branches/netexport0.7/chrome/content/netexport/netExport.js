/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

const extensionManager = CCSV("@mozilla.org/extensions/manager;1", "nsIExtensionManager");

var prefDomain = "extensions.firebug.netexport";

// ************************************************************************************************
// Module implementation

/**
 * This module implements an Export feature that allows to save all Net panel
 * data into a file using HTTP Archive format.
 * http://groups.google.com/group/firebug-working-group/web/http-tracing---export-format
 */
Firebug.NetExport = extend(Firebug.Module,
{
    initialize: function(owner)
    {
        Firebug.Module.initialize.apply(this, arguments);

        if (Firebug.TraceModule)
            Firebug.TraceModule.addListener(this.TraceListener);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        if (Firebug.TraceModule)
            Firebug.TraceModule.removeListener(this.TraceListener);
    },

    internationalizeUI: function(doc)
    {
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.internationalizeUI");

        var elements = ["netExport", "netExportCompress", "netExportAuto",
            "netExportOptions", "netExportLogDir", "netExportHelp",
            "netExportAbout", "netExportShowPreview", "netRunPageSuite",
            "netExportSaveAs"];

        for (var i=0; i<elements.length; i++)
        {
            var element = $(elements[i], doc);
            FBL.internationalize(element, "label");
            FBL.internationalize(element, "tooltiptext");
            FBL.internationalize(element, "buttontooltiptext");
        }
    },

    initContext: function(context)
    {
        context.netExport = {};
    },

    updateSendTo: function()
    {
        // If a server is specified in the preferences, show a new menu item
        // that allows to send HAR beacon to the server and localize it.
        var serverURL = Firebug.getPref(prefDomain, "beaconServerURL");
        var menuItem = $("netExportSendTo");
        var menuSeparator = $("netExportSendToSeparator");

        if (serverURL)
        {
            menuItem.removeAttribute("collapsed");
            menuSeparator.removeAttribute("collapsed");
        }
        else
        {
            menuItem.setAttribute("collapsed");
            menuSeparator.setAttribute("collapsed");
        }

        // Update label & tooltip so it displayes the URL.
        menuItem.setAttribute("label", $STR("netexport.menu.label.Send To") + " " + serverURL);
        menuItem.setAttribute("tooltiptext", $STR("netexport.menu.tooltip.Send To") +
            " " + serverURL);
    },

    // Handle Export toolbar button.
    exportData: function(context)
    {
        this.Exporter.exportData(context);
    },

    // Handle Import toolbar button.
    importData: function(context)
    {
        alert("TBD");
    },

    onMenuShowing: function(popup)
    {
        this.updateSendTo();
        return true;
    },

    sendTo: function(context)
    {
        var serverURL = Firebug.getPref(prefDomain, "beaconServerURL");
        if (!serverURL)
            return;

        try
        {
            var jsonString = this.Exporter.buildData(context);
            if (!jsonString)
                return;

            var pageURL = encodeURIComponent(context.getName());
            serverURL += "?url=" + pageURL;

            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.sendTo; " + serverURL);

            var request = CCIN("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");
            request.open("POST", serverURL, true);
            request.setRequestHeader("Content-Type", "x-application/har+json");
            request.setRequestHeader("Content-Length", jsonString.length);
            request.onerror = function onError(event)
            {
                if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                    FBTrace.sysout("netexport.sendTo; ERROR " + event.target.status, e);

                alert("Error: " + event.target.status);
            };
            request.onload = function onLoad(event)
            {
                var index = serverURL.indexOf("beacon/har");
                if (index < 0)
                {
                    if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                        FBTrace.sysout("netexport.sendTo; ERROR wrong Beacon server: " + serverURL);
                    return;
                }

                var showSlowURL = serverURL.substr(0, index);
                var lastChar = showSlowURL.charAt(showSlowURL.length - 1);
                if (lastChar != "/")
                    showSlowURL += "/";

                // Compute URL of the details page.
                showSlowURL += "details/?url=" + pageURL;

                if (FBTrace.DBG_NETEXPORT)
                    FBTrace.sysout("netexport.sendTo; HAR Beacon sent, open Beacon server: " + showSlowURL);

                gBrowser.selectedTab = gBrowser.addTab(showSlowURL);
            };
            request.send(jsonString);
        }
        catch (e)
        {
            if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                FBTrace.sysout("netexport.sendTo; EXCEPTION", e);
        }
    },

    // Options
    onToggleOption: function(event, menuitem)
    {
        FirebugChrome.onToggleOption(menuitem);

        // Don't bubble up so, the main command (executed when the menu-button
        // itself is pressed) is not fired.
        cancelEvent(event);
    },

    onOptionsShowing: function(popup)
    {
        for (var child = popup.firstChild; child; child = child.nextSibling)
        {
            if (child.localName == "menuitem")
            {
                var option = child.getAttribute("option");
                if (option)
                {
                    var checked = Firebug.getPref(Firebug.prefDomain, option);
                    child.setAttribute("checked", checked);
                }
            }
        }

        return true;
    },

    // Auto export
    toggleAutoExport: function(context)
    {
        if (this.Automation.isActive())
            this.Automation.deactivate();
        else
            this.Automation.activate();
    },

    onHelp: function(event)
    {
        // xxxHonza: use Firebug wiki as soon as there is a page for NetExport.
        openNewTab("http://www.softwareishard.com/blog/netexport/");
        cancelEvent(event);
    },

    onAbout: function(event, context)
    {
        var parent = context.chrome.window;
        parent.openDialog("chrome://mozapps/content/extensions/about.xul", "",
            "chrome,centerscreen,modal", "urn:mozilla:item:netexport@getfirebug.com",
            extensionManager.datasource);

        cancelEvent(event);
    },

    onRunPageSuite: function(event, context)
    {
        var PageLoader = Firebug.NetExport.PageLoader;

        // Load default suite of pages to be loaded and run.
        var pageSuite = PageLoader.loadSuite();
        PageLoader.runSuite(pageSuite);

        cancelEvent(event);
    }
});

// ************************************************************************************************

Firebug.NetExport.TraceListener =
{
    onLoadConsole: function(win, rootNode)
    {
        var doc = rootNode.ownerDocument;
        var styleSheet = createStyleSheet(doc, 
            "chrome://netexport/skin/netExport.css");
        styleSheet.setAttribute("id", "netExportLogs");
        addStyleSheet(doc, styleSheet);
    },

    onDump: function(message)
    {
        var index = message.text.indexOf("netexport.");
        if (index == 0)
            message.type = "DBG_NETEXPORT";
    }
};

// ************************************************************************************************
// Shared functions for NetExport extension.

Firebug.NetExport.safeGetWindowLocation = function(win)
{
    try
    {
        if (!win)
            return null;

        if (win.closed)
            return null;

        if ("location" in win)
        {
            if (typeof(win.location) == 'object' && "toString" in win.location)
                return win.location;
            else if (typeof (win.location) == 'string' )
                return win.location;
        }
    }
    catch(exc)
    {
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.getWindowLocation; EXCEPTION window:", win);
    }

    return null;
}

// ************************************************************************************************
// Registration

Firebug.registerStringBundle("chrome://netexport/locale/netExport.properties");
Firebug.registerModule(Firebug.NetExport);

// ************************************************************************************************
}});
