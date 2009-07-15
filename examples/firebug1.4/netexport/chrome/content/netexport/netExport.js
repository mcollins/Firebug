/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

const dirService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
const appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);

// ************************************************************************************************
// Module implementation

/**
 * This module implements an Export feature that allows to save all Net panel
 * data into a file using HTTP Archive format.
 * http://groups.google.com/group/firebug-working-group/web/http-tracing---export-format
 */
Firebug.NetMonitorSerializer = extend(Firebug.Module,
{
    initialize: function(owner)
    {
        Firebug.Module.initialize.apply(this, arguments);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);
    },

    // Handle Export toolbar button.
    exportData: function(context)
    {
        if (!context)
            return;

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Exporting data for: " + context.getName());

        var panel = context.getPanel("net");

        // Build entries.
        var numberOfRequests = 0;
        panel.enumerateRequests(function(file) {
            numberOfRequests++;
        })

        if (numberOfRequests > 0)
        {
            // Get target file for exported data. Bail out, if the user presses cancel.
            var file = this.getTargetFile();
            if (!file)
                return;
        }

        // Build JSON result string. If the panel is empty a dialog with warning message
        // automatically appears.
        var jsonString = this.buildData(context);
        if (!jsonString)
            return;

        if (!this.saveToFile(file, jsonString))
            return;

        var viewerURL = Firebug.getPref(Firebug.prefDomain, "netExport.viewerURL");
        if (viewerURL)
            this.ViewerOpener.openViewer(viewerURL, jsonString);
    },

    // Handle Import toolbat button.
    importData: function(context)
    {
        alert("TBD");
    },

    // Open File Save As dialog and let the user to pick proper file location.
    getTargetFile: function()
    {
        var nsIFilePicker = Ci.nsIFilePicker;
        var fp = Cc["@mozilla.org/filepicker;1"].getService(nsIFilePicker);
        fp.init(window, null, nsIFilePicker.modeSave);
        fp.appendFilter("HTTP Archive Files","*.har; *.json");
        fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);
        fp.filterIndex = 1;
        fp.defaultString = "netData.har";

        var rv = fp.show();
        if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace)
            return fp.file;

        return null;
    },

    // Build JSON string from the Net panel data.
    buildData: function(context)
    {
        var jsonString = "";

        try
        {
            // Export all data into a JSON string.
            var builder = new JSONBuilder();
            var jsonData = builder.build(context);
            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.buildData; entries: " + jsonData.log.entries.length,
                    jsonData);

            if (!jsonData.log.entries.length)
            {
                alert($STR("Nothing to export"));
                return null;
            }

            jsonString = JSON.stringify(jsonData, null, '  ');
        }
        catch (err)
        {
            if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                FBTrace.sysout("netexport.exportData EXCEPTION", err);
        }

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.data", jsonData);

        return jsonString;
    },

    // Save JSON string into a file.
    saveToFile: function(file, jsonString)
    {
        try
        {
            var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
                .createInstance(Ci.nsIFileOutputStream);
            foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate

            var data = jsonString;//convertToUnicode(jsonString);
            foStream.write(data, data.length);
            foStream.close();

            return true;
        }
        catch (err)
        {
            alert(err.toString());
        }

        return false;
    }
});

// ************************************************************************************************
// Export Net panel data as JSON.

function JSONBuilder()
{
}

JSONBuilder.prototype =
{
    build: function(context)
    {
        var panel = context.getPanel("net");

        // Build basic structure for data.
        var log = this.buildLog(context);

        // Build entries.
        var self = this;
        panel.enumerateRequests(function(file) {
            log.entries.push(self.buildEntry(log.pages[0], file));
        })

        return {log:log};
    },

    buildLog: function(context)
    {
        var log = {};
        log.version = "1.0";
        log.creator = {name: "Firebug", version: Firebug.version};
        log.browser = {name: appInfo.name, version: appInfo.version};
        log.pages = [this.buildPage(context)];
        log.entries = [];
        return log;
    },

    buildPage: function(context)
    {
        var page = {};
        page.startedDateTime = dateToJSON(new Date());
        page.id = "page_0";
        page.title = context.getTitle();
        return page;
    },

    buildEntry: function(page, file)
    {
        var entry = {};
        entry.pageref = page.id;
        entry.startedDateTime = dateToJSON(new Date(file.startTime));
        entry.time = file.endTime - file.startTime;
        entry.overview = this.buildOverview(file);
        entry.request = this.buildRequest(file);
        entry.response = this.buildResponse(file);
        entry.cache = this.buildCache(file);
        entry.timings = this.buildTimings(file);

        // Put page timings into the page object now when we have the first entry.
        if (!page.pageTimings)
            page.pageTimings = this.buildPageTimings(file);

        return entry;
    },

    buildOverview: function(file)
    {
        var overview = [];
        return overview;
    },

    buildRequest: function(file)
    {
        var request = {};

        request.method = file.method;
        request.path = file.request.URI.path;
        request.prePath = file.request.URI.prePath;
        request.port = file.request.URI.port;
        request.httpVersion = this.getHttpVersion(file.request, true);

        request.cookies = this.buildRequestCookies(file);
        request.headers = this.buildHeaders(file.requestHeaders);

        request.queryString = file.urlParams;
        request.postData = this.buildPostData(file);

        request.headersSize = 0; //xxxHonza: waiting for the activityObserver.
        request.bodySize = 0; //xxxHonza: fix when activity observer is in place.

        return request;
    },

    buildPostData: function(file)
    {
        var postData = {mimeType: "", text: "", params: {}};
        if (!file.postText)
            return postData;

        var text = file.postText;
        if (isURLEncodedFile(file, text))
        {
            var lines = text.split("\n");
            postData.mimeType = "application/x-www-form-urlencoded";
            postData.params = parseURLEncodedText(lines[lines.length-1]);
        }
        else
        {
            postData.text = text;
        }
        
        return postData;
    },

    buildRequestCookies: function(file)
    {
        var header = findHeader(file.requestHeaders, "cookie");

        var result = [];
        var cookies = header ? header.split("; ") : [];
        for (var i=0; i<cookies.length; i++)
        {
            var option = cookies[i].split("=");
            var cookie = {};
            cookie.name = option[0];
            cookie.value = option[1];
            result.push(cookie);
        }

        return result;
    },

    buildResponseCookies: function(file)
    {
        var header = findHeader(file.responseHeaders, "set-cookie");

        var result = [];
        var cookies = header ? header.split("\n") : [];
        for (var i=0; i<cookies.length; i++)
        {
            var cookie = this.parseCookieFromResponse(cookies[i]);
            result.push(cookie);
        }

        return result;
    },

    parseCookieFromResponse: function(string)
    {
        var cookie = new Object();
        var pairs = string.split("; ");
        
        for (var i=0; i<pairs.length; i++)
        {
            var option = pairs[i].split("=");
            if (i == 0)
            {
                cookie.name = option[0];
                cookie.value = option[1];
            } 
            else
            {
                var name = option[0].toLowerCase();
                name = (name == "domain") ? "host" : name;
                if (name == "httponly")
                {
                    cookie.httpOnly = true;
                }
                else if (name == "expires")
                {
                    var value = option[1];
                    value = value.replace(/-/g, " ");
                    cookie[name] = Date.parse(value) / 1000;
                }
                else
                {
                    cookie[name] = option[1];
                }
            }
        }
        
        return cookie;
    },

    buildHeaders: function(headers)
    {
        var result = [];
        for (var i=0; headers && i<headers.length; i++)
            result.push({name: headers[i].name, value: headers[i].value});
        return result;
    },

    buildResponse: function(file)
    {
        var response = {};

        response.status = file.responseStatus;
        response.statusText = file.responseStatusText;
        response.httpVersion = this.getHttpVersion(file.request, false);

        response.cookies = this.buildResponseCookies(file);
        response.headers = this.buildHeaders(file.responseHeaders);
        response.content = this.buildContent(file);

        response.redirectURL = findHeader(file.responseHeaders, "Location");

        response.headersSize = 0; //xxxHonza: waiting for the activityObserver.
        response.bodySize = file.size;

        return response;
    },

    buildContent: function(file)
    {
        var content = {};
        content.contentLength = file.responseText ? file.responseText.length : file.size;
        content.compression = ""; //xxxHonza: does activity-observer provide compression info?

        try
        {
            content.mimeType = file.request.contentType;
        }
        catch (e)
        {
            if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                FBTrace.sysout("netexport.buildContent EXCEPTION", e);
        }

        content.encodingScheme = ""; //xxxHonza
        content.text = file.responseText ? file.responseText : "";
        return content;
    },

    buildCache: function(file)
    {
        var cache = {};

        //cache.afterRequest = {}; //xxxHonza: There is no such info yet in the Net panel.

        if (file.fromCache)
        {
            cache.beforeRequest = {};
            cache.beforeRequest = this.buildCacheEntry(file.cacheEntry);
        }

        return cache;
    },

    buildCacheEntry: function(cacheEntry)
    {
        var cache = {};
        cache.expires = findHeader(cacheEntry, "Expires");
        cache.lastModification = findHeader(cacheEntry, "Last Modified");
        cache.lastCacheUpdate = ""; //xxxHonza
        cache.lastAccess = findHeader(cacheEntry, "Last Fetched");
        cache.eTag = ""; //xxxHonza
        cache.hitCount = findHeader(cacheEntry, "Fetch Count");
        return cache;
    },

    buildPageTimings: function(file)
    {
        var timings = {};
        timings.onContentLoad = file.phase.contentLoadTime - file.startTime;
        timings.onLoad = file.phase.windowLoadTime - file.startTime;
        return timings;
    },

    buildTimings: function(file)
    {
        var timings = {};
        timings.dns = file.resolvingTime - file.startTime;
        timings.connect = file.connectingTime - file.startTime;
        timings.blocked = file.waitingForTime - file.connectingTime;
        timings.send = -1; //xxxHonza;
        timings.wait = file.respondedTime - file.waitingForTime;
        timings.receive = file.endTime - file.respondedTime;

        // xxxHonza: REMOVE, it's now in the page.pageTimings object.
        timings.DOMContentLoad = file.phase.contentLoadTime - file.startTime;
        timings.load = file.phase.windowLoadTime - file.startTime;

        return timings;
    },

    getHttpVersion: function(request, forRequest)
    {
        if (request instanceof Ci.nsIHttpChannelInternal)
        {
            try
            {
                var major = {}, minor = {};

                if (forRequest)
                    request.getRequestVersion(major, minor);
                else
                    request.getResponseVersion(major, minor);

                return "HTTP/" + major.value + "." + minor.value;
            }
            catch(err)
            {
                if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                    FBTrace.sysout("netexport.getHttpVersion EXCEPTION", err);
            }
        }

        return "";
    },
}

// ************************************************************************************************
// Viewer Opener

Firebug.NetMonitorSerializer.ViewerOpener =
{
    // Open online viewer for immediate preview.
    openViewer: function(url, jsonString)
    {
        var result = iterateBrowserWindows("navigator:browser", function(browserWin)
        {
            return iterateBrowserTabs(browserWin, function(tab, currBrowser)
            {
                var currentUrl = currBrowser.currentURI.spec;
                if (currentUrl.indexOf("/har/viewer") >= 0)
                {
                    var tabBrowser = browserWin.getBrowser();
                    tabBrowser.selectedTab = tab;
                    browserWin.focus();

                    var win = tabBrowser.contentWindow.wrappedJSObject;
                    var sourceEditor = win.document.getElementById("sourceEditor");
                    sourceEditor.value = jsonString;
                    win.HAR.Viewer.onAppendPreview();

                    if (FBTrace.DBG_NETEXPORT)
                        FBTrace.sysout("netExport.openViewer; Select an existing tab", tabBrowser);
                    return true;
                }
            })
        });

        // The viewer is not opened yet so, open a new tab.
        if (!result)
        {
            gBrowser.selectedTab = gBrowser.addTab(url);

            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netExport.openViewer; Open HAR Viewer tab",
                    gBrowser.selectedTab.linkedBrowser);

            var self = this;
            var browser = gBrowser.selectedTab.linkedBrowser;
            function onContentLoad(event) {
                browser.removeEventListener("DOMContentLoaded", onContentLoad, true);
                self.onContentLoad(event, jsonString);
            }
            browser.addEventListener("DOMContentLoaded", onContentLoad, true);
        }
    },

    onContentLoad: function(event, jsonString)
    {
        var win = event.currentTarget;
        var content = win.contentDocument.getElementById("content");
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.DOMContentLoaded;", content);

        var self = this;
        function onViewerInit(event)
        {
            content.removeEventListener("onViewerInit", onViewerInit, true);

            var doc = content.ownerDocument;
            var win = doc.defaultView.wrappedJSObject;
            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.onViewerInit; HAR Viewer initialized", win);

            // Initialize input JSON box.
            doc.getElementById("sourceEditor").value = jsonString;

            // Switch to the Preview tab by clicking on the preview button.
            self.click(doc.getElementById("appendPreview"));
        }

        content.addEventListener("onViewerInit", onViewerInit, true);
    },

    click: function(button)
    {
        var doc = button.ownerDocument;
        var event = doc.createEvent("MouseEvents");
        event.initMouseEvent("click", true, true, doc.defaultView, 0, 0, 0, 0, 0,
            false, false, false, false, 0, null);
        button.dispatchEvent(event);
    }
}

// ************************************************************************************************
// Helpers

// xxxHonza: duplicated in net.js
function isURLEncodedFile(file, text)
{
    if (text && text.indexOf("Content-Type: application/x-www-form-urlencoded") != -1)
        return true;

    // The header value doesn't have to be alway exactly "application/x-www-form-urlencoded",
    // there can be even charset specified. So, use indexOf rather than just "==".
    var headerValue = findHeader(file.requestHeaders, "Content-Type");
    if (headerValue && headerValue.indexOf("application/x-www-form-urlencoded") == 0)
        return true;

    return false;
}

function findHeader(headers, name)
{
    name = name.toLowerCase();
    for (var i = 0; headers && i < headers.length; ++i)
    {
        if (headers[i].name.toLowerCase() == name)
            return headers[i].value;
    }

    return "";
}

function safeGetName(request)
{
    try
    {
        return request.name;
    }
    catch (exc) { }

    return null;
}

function dateToJSON(date)
{
    function f(n, c) {
        if (!c) c = 2;
        var s = new String(n);
        while (s.length < c) s = "0" + s;
        return s;
    }

    return date.getUTCFullYear()   + '-' +
         f(date.getUTCMonth() + 1) + '-' +
         f(date.getUTCDate())      + 'T' +
         f(date.getUTCHours())     + ':' +
         f(date.getUTCMinutes())   + ':' +
         f(date.getUTCSeconds())   + '.' +
         f(date.getUTCMilliseconds(), 3) + 'Z';
}

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.NetMonitorSerializer);

// ************************************************************************************************
}});
