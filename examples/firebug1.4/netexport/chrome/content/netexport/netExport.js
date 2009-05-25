/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

const dirService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);

// ************************************************************************************************
// Module implementation

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

    exportData: function(context)
    {
        if (!context)
            return;

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Exporting data for: " + context.getName());

        try
        {
            // Export all data into a JSON string.
            var builder = new JSONBuilder();
            var jsonData = builder.build(context);
            if (!jsonData.log.entries.length)
            {
                alert("There is nothing to export.");
                return;
            }
            var jsonString = JSON.stringify(jsonData, null, '  ');
            jsonString = "(" + jsonString + ")";
        }
        catch (err)
        {
            if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                FBTrace.sysout("netexport.exportData EXCEPTION", err);
        }

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.data", jsonData);

        if (this.onSaveToFile(jsonString))
        {
            this.openViewer(Firebug.getPref(Firebug.prefDomain, 
                "netExport.viewerURL"), jsonString);
        }
    },

    onSaveToFile: function(jsonString)
    {
        try 
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
            {
                var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
                    .createInstance(Ci.nsIFileOutputStream);
                foStream.init(fp.file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate

                var data = jsonString;//convertToUnicode(jsonString);
                foStream.write(data, data.length);
                foStream.close();

                return true;
            }
        }
        catch (err)
        {
            alert(err.toString());
        }

        return false;
    },

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
                    win.SourceView.onAppendPreview();

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

            var tabBrowser = gBrowser.getBrowserForTab(gBrowser.selectedTab);
            tabBrowser.addProgressListener(new TabProgressListener(jsonString),
                Ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
        }
    },

    importData: function(context)
    {
        alert("TBD");
    },
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
        log.pages = [this.buildPage(context)];
        log.entries = [];
        log.version = "1.0";
        log.creator =  {name: "", version: ""};
        log.browser =  {name: "", version: ""};
        return log;
    },

    buildPage: function(context)
    {
        var page = {};
        //?page.started = {};
        page.startedDateTime = (new Date()).toUTCString();
        page.id = "page_0";
        page.title = context.getTitle();
        return page;
    },

    buildEntry: function(page, file)
    {
        var entry = {};
        entry.pageref = page.id;
        entry.startedDateTime = file.startTime;
        entry.time = file.endTime - file.startTime;
        entry.sent = 0;
        entry.received = file.size;
        entry.overview = this.buildOverview(file);
        entry.request = this.buildRequest(file);
        entry.response = this.buildResponse(file);
        entry.cache = this.buildCache(file);
        entry.timings = this.buildTimings(file);
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

        return response;
    },

    buildContent: function(file)
    {
        var content = {};
        content.contentLength = file.responseText ? file.responseText.length : 0;
        content.compression = ""; //xxxHonza

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

        if (!file.fromCache)
            return cache;

        cache.beforeRequest = {};
        cache.beforeRequest.cacheEntry = this.buildCacheEntry(file.cacheEntry);

        //xxxHonza: There is no such info yet in the Net panel.
        //cache.afterRequest = {};
        //cache.afterRequest.cacheEntry = {};

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

    buildTimings: function(file)
    {
        var timings = {};
        timings.dns = file.resolvingTime - file.startTime;
        timings.connect = file.connectingTime - file.startTime;
        timings.blocked = file.waitingForTime - file.connectingTime;
        timings.send = -1; //xxxHonza;
        timings.wait = file.respondedTime - file.waitingForTime;
        timings.receive = file.endTime - file.respondedTime;

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

// ************************************************************************************************

function TabProgressListener(jsonData)
{
    this.jsonData = jsonData;
    this.initialized = false;
}

TabProgressListener.prototype = extend(BaseProgressListener,
{
    onStateChange: function(progress, request, flag, status)
    {
        var win = progress.DOMWindow;
        if (!win || !win.document)
            return;

        var name = safeGetName(request);
        var sourceEditor = win.document.getElementById("sourceEditor");
        if (!this.initialized && (name.indexOf("/har/viewer") > 0) && sourceEditor)
        {
            this.initialized = true;

            var browser = TabWatcher.getBrowserByWindow(win);
            browser.removeProgressListener(this);

            var self = this;
            win.addEventListener("load", function(event) {
                win.document.getElementById("sourceEditor").value = self.jsonData;
                win.wrappedJSObject.SourceView.onAppendPreview();
            }, true);
        }
    }
});

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.NetMonitorSerializer);

// ************************************************************************************************
}});
