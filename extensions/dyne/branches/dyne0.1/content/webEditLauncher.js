/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ********************************************************************************************* //
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

// ********************************************************************************************* //
// Module Implementation

Firebug.WebEditLauncher = extend(Firebug.Module,
{
    editorWatchers: [],

    initializeUI: function()
    {
        Firebug.Module.initializeUI.apply(this, arguments);

        // we listen for panel update
        Firebug.registerUIListener(this);
        // we listen for http requests to look for special headers
        Firebug.NetMonitor.addListener(this);
    },

    updateOption: function(name, value)
    {
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // UIListener

    onPanelNavigate: function(location, panel)
    {
        if (location instanceof CompilationUnit && panel.context.httpEditorURL)
            this.syncToURL(panel.context, location.getURL);
    },

    onObjectSelected: function(link, panel)
    {
        if (link instanceof SourceLink && panel.context.httpEditorURL)
            this.syncToURL(panel.context, link.href, link.line);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Firebug.NetMonitor listener

    onResponse: function(context, file)
    {
        var headers = file.responseHeaders;
        for (var i = 0; i < headers.length; i++)
        {
            if (headers[i].name === "x-firebug-editor-url")
                context.httpEditorURL = headers[i].value;
        }

    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    syncToURL: function(context, url, line)
    {
        var url = context.httpEditorURL.replace("file=&", 'file='+url+'&');
        if (line)
            url.replace("line=&", 'line='+line+'&');

        this.editorWatchers.push(new WebEditorWatcher(url));
    },

});

function WebEditorWatcher(url)
{
    this.tab = FBL.openTab(url);
}

// ********************************************************************************************* //
// Registration

Firebug.registerModule(Firebug.WebEditLauncher);

// ********************************************************************************************* //
}});