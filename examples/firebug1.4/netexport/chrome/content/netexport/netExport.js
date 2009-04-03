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

    // UI Commands
    exportData: function(context)
    {
        if (!context)
            return;

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Exporting data for: " + context.getName());

        // Build JSON structure and serialize it into a file.
        var builder = new JSONBuilder();
        var jsonData = builder.build(context);
        var jsonString = JSON.stringify(jsonData, null, '\t');

        // Get unique file within user profile directory. 
        /*var file = dirService.get("ProfD", Ci.nsIFile);
        file.append("netExport");
        file.append("netData.json");
        file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);

        // Initialize output stream.
        this.outputStream = Cc["@mozilla.org/network/file-output-stream;1"]
            .createInstance(Ci.nsIFileOutputStream);

        // write, create, truncate
        this.outputStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
        this.outputStream.write(jsonString, jsonString.length);
        this.outputStream.close();*/

        openNewTab("chrome://netexport/content/netExportViewer.xul?json=" + 
            encodeURIComponent(jsonString));

        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.Exporting END JSON: " + file.path, jsonData);
    },

    importData: function(context)
    {
        alert("TBD");
    },

    refreshJSONViewer: function(parentNode, jsonString, toggles, originUrl)
    {
        jsonString = decodeURIComponent(jsonString);

        var jsonObject = parseJSONString(jsonString, originUrl);
        if (FBTrace.DBG_NETEXPORT)
            FBTrace.sysout("netexport.json.parseJSONString", jsonObject);

        try
        {
            if (FBTrace.DBG_NETEXPORT)
                FBTrace.sysout("netexport.json.refreshJSONViewer", parentNode);

            var tag = Firebug.DOMPanel.DirTable.tag;
            tag.replace({object: jsonObject, toggles: toggles}, parentNode);
        }
        catch (err)
        {
            if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
                FBTrace.sysout("netexport.json.refreshJSONViewer EXCEPTION", err);
        }
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
        panel.iterateEntries(function(file) {
            log.entries.push(self.buildEntry(log.page, file));
        })

        return log;
    },

    buildLog: function(context)
    {
        var log = {};
        log.page = this.buildPage(context);
        log.entries = [];
        return log;
    },

    buildPage: function(context)
    {
        var page = {};
        //?page.started = {};
        page.startedDateTime = (new Date()).toGMTString();;
        page.id = "page_0";
        page.title = context.getTitle();
        page.dynamic = false;
        page.unknown = false;
        return page;
    },

    buildEntry: function(page, file)
    {
        var entry = {};
        entry.pageref = page.id;
        //?page.started = {};
        entry.startedDateTime = (new Date(file.startTime)).toGMTString();
        entry.time = file.endTime - file.startTime;
        entry.sent = 0;
        entry.received = 0;
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
        request.requestMethod = file.method;
        request.cookies = this.buildCookies(file);
        request.headers = this.buildHeaders(file.requestHeaders);
        return request;
    },

    buildCookies: function(cookies)
    {
        var cookies = {};
        return cookies;
    },

    buildHeaders: function(headers)
    {
        var result = [];
        for (var i=0; i<headers.length; i++)
            result.push({name: headers[i].name, value: headers[i].value});
        return result;
    },

    buildResponse: function(file)
    {
        var response = {};
        response.responseStatus = file.responseStatus + " " + file.responseStatusText;
        response.cookies = this.buildCookies(file);
        response.headers = this.buildHeaders(file.requestHeaders);
        response.content = this.buildContent(file);
        return response;
    },

    buildContent: function(file)
    {
        var content = {};
        return content;
    },

    buildCache: function(file)
    {
        var cache = {};
        return cache;
    },

    buildTimings: function(file)
    {
        var timings = {};
        return timings;
    }
}

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.NetMonitorSerializer);

// ************************************************************************************************
}});
