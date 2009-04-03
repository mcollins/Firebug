const Cc = Components.classes;
const Ci = Components.interfaces;

var FBTrace = Cc["@joehewitt.com/firebug-trace-service;1"].getService(Ci.nsISupports)
    .wrappedJSObject.getTracer("extensions.firebug");

// ************************************************************************************************
// Implementation

var JSONViewer =
{
    initialize: function()
    {
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.json.initialize " + location.href);

        this.toggles = {};

        var viewer = document.getElementById("viewer");
        viewer.addEventListener("load", function(event) {
            JSONViewer.onTestFrameLoaded(event);
        }, true);
        viewer.setAttribute("src", "chrome://netexport/content/netExportViewer.html");
    },

    onTestFrameLoaded: function(event)
    {
        var viewer = document.getElementById("viewer");
        var contentNode = viewer.contentDocument.getElementById("content");

        var browser = getBrowser();
        var jsonString = getURLParameter("json");
        browser.Firebug.NetMonitorSerializer.refreshJSONViewer(contentNode, jsonString,
            this.toggles, location.href);
    }
}

function getBrowser()
{
    return window.QueryInterface(Ci.nsIInterfaceRequestor)
       .getInterface(Ci.nsIWebNavigation)
       .QueryInterface(Ci.nsIDocShellTreeItem)
       .rootTreeItem
       .QueryInterface(Ci.nsIInterfaceRequestor)
       .getInterface(Ci.nsIDOMWindow); 
}

function getURLParameter(name)
{
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.href);
    return (results == null) ? "" : results[1];
}

// Register handlers to maintain extension life cycle.
window.addEventListener("load", function(event) {
    JSONViewer.initialize(event);
}, false);
