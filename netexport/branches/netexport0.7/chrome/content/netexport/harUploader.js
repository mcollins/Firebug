/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

const prompts = CCSV("@mozilla.org/embedcomp/prompt-service;1", "nsIPromptService");

const prefDomain = "extensions.firebug.netexport";
var sendToConfirmation = "sendToConfirmation";

// ************************************************************************************************

var uploaders = [];

Firebug.NetExport.HARUploader =
{
    upload: function(context)
    {
        var serverURL = Firebug.getPref(prefDomain, "beaconServerURL");
        if (!serverURL)
            return;

        if (Firebug.getPref(prefDomain, sendToConfirmation))
        {
            var uri = makeURI(serverURL);
            var msg = $STR("netexport.sendTo.confirm.msg");
            msg = msg.replace(/%S/g, uri.host);

            var check = {value: false};
            if (!prompts.confirmCheck(context.chrome.window, "NetExport", msg,
                $STR("netexport.sendTo.confirm.checkMsg"), check))
                return;

            // Update sendToConfirmation confirmation option according to the value
            // of the dialog's "do not show again" checkbox.
            Firebug.setPref(prefDomain, sendToConfirmation, !check.value)
        }

        try
        {
            var jsonString = Firebug.NetExport.Exporter.buildData(context);
            if (!jsonString)
                return;

            var pageURL = encodeURIComponent(context.getName());
            serverURL += "?url=" + pageURL;

            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.upload; " + serverURL);

            var uploader = new Uploader(serverURL, pageURL);
            uploader.start(jsonString);
            uploaders.push(uploader);
        }
        catch (e)
        {
            if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                FBTrace.sysout("netexport.upload; EXCEPTION", e);
        }
    }
}

// ************************************************************************************************

function Uploader(serverURL, pageURL)
{
    this.serverURL = serverURL;
    this.pageURL = pageURL;
    this.request = null;
    this.progress = null;
}

Uploader.prototype =
{
    start: function(jsonString)
    {
        this.request = CCIN("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");
        this.request.upload.onprogress = bind(this.onUploadProgress, this);

        this.request.open("POST", this.serverURL, true);
        this.request.setRequestHeader("Content-Type", "x-application/har+json");
        this.request.setRequestHeader("Content-Length", jsonString.length);

        this.request.onerror = bind(this.onError, this);
        this.request.onload = bind(this.onFinished, this);

        this.progress = this.createProgresMeter();

        this.request.send(jsonString);
    },

    createProgresMeter: function()
    {
        var progress = $("netExportUploadProgressTempl");
        progress = progress.cloneNode(true);
        progress.removeAttribute("id");

        //var menuAbort = progress.getElementsByClassName("netExportUploadAbort")[0];
        //menuAbort.addEventListener("command", bind(this.abort, this), false);
        //menuAbort.setAttribute("label", $STR("netexport.menu.label.Abort Upload"));

        progress.setAttribute("tooltiptext", $STR("netexport.tooltip.Uploading_HAR_to") +
            " " + decodeURIComponent(this.serverURL));

        // Append into the toolbar.
        var netExportBtn = $("netExport");
        insertAfter(progress, netExportBtn);

        return progress;
    },

    abort: function()
    {
        if (!this.request)
            return;

        const NS_BINDING_ABORTED = 0x804b0002;
        this.request.cancel(NS_BINDING_ABORTED);

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.uploader; Aborted " + serverURL);
    },

    onUploadProgress: function(event)
    {
        if (event.lengthComputable)
        {
            this.progress.removeAttribute("collapsed");
            var completed = (event.loaded / event.total) * 100;
            this.progress.setAttribute("value", Math.round(completed));
        }
    },

    onFinished: function(event)
    {
        remove(uploaders, this);

        // Remove progress bar from the UI.
        this.progress.parentNode.removeChild(this.progress);

        if (!Firebug.getPref(prefDomain, "showPreview"))
            return;

        var index = this.serverURL.indexOf("beacon/har");
        if (index < 0)
        {
            if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                FBTrace.sysout("netexport.uploader; ERROR wrong Beacon server: " + this.serverURL);
            return;
        }

        var showSlowURL = this.serverURL.substr(0, index);
        var lastChar = showSlowURL.charAt(showSlowURL.length - 1);
        if (lastChar != "/")
            showSlowURL += "/";

        // Compute URL of the details page (use URL of the exported page).
        showSlowURL += "details/?url=" + this.pageURL;

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.uploader; HAR Beacon sent, open Beacon server: " + showSlowURL);

        gBrowser.selectedTab = gBrowser.addTab(showSlowURL);
    },

    onError: function(event)
    {
        remove(uploaders, this);

        // Remove progress bar from the UI.
        this.progress.parentNode.removeChild(this.progress);

        if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
            FBTrace.sysout("netexport.uploader; ERROR " + this.serverURL + " " +
                event.target.status);

        alert("Error: " + event.target.status);
    }
};

// ************************************************************************************************

function insertAfter(newElement, targetElement)
{
    var parent = targetElement.parentNode;

    if (parent.lastChild == targetElement)
        parent.appendChild(newElement);
    else
        parent.insertBefore(newElement, targetElement.nextSibling);
}

// ************************************************************************************************
}});
