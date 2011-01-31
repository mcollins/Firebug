/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ********************************************************************************************* //
// Panel

var panelName = "linkInspector";

/**
 * @panel This panel integrates with Firebug Inspector API and provides own logic
 * and display of custom information for links. This code serves as an example of
 * how to properly use and implement Inspector.
 */
function LinkInspectorPanel() {}
LinkInspectorPanel.prototype = extend(Firebug.Panel,
/** @lends LinkInspectorPanel */
{
    name: panelName,
    title: "Link Inspector",
    inspectable: true,
    inspectOnlySupportedObjects: true,

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Initialization

    initialize: function()
    {
        Firebug.Panel.initialize.apply(this, arguments);

        Firebug.Inspector.addListener(this);
    },

    destroy: function(state)
    {
        Firebug.Panel.destroy.apply(this, arguments);

        Firebug.Inspector.removeListener(this);
    },

    show: function(state)
    {
        Firebug.Panel.show.apply(this, arguments);

        LinkInspectorPlate.defaultContent.replace({}, this.panelNode);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Inspector API implementation

    startInspecting: function()
    {
        if (FBTrace.DBG_LINKINSPECTOR)
            FBTrace.sysout("link-inspector; startInspecting()");
    },

    inspectNode: function(node)
    {
        if (FBTrace.DBG_LINKINSPECTOR)
            FBTrace.sysout("link-inspector; inspectNode(node: " + node.tagName + ")");

        LinkInspectorPlate.linkUrl.replace({object: node}, this.panelNode);
    },

    stopInspecting: function(node, cancelled)
    {
        if (FBTrace.DBG_LINKINSPECTOR)
            FBTrace.sysout("link-inspector; stopInspecting(node: " + node.tagName +
                ", cancelled: " + cancelled + ")");

        if (node.href.indexOf("http") != 0)
            return;

        var preview = LinkInspectorPlate.linkPreview.replace({object: node}, this.panelNode);
        preview.setAttribute("src", node.href);
    },

    supportsObject: function(object, type)
    {
        if (object instanceof Element)
        {
            if (object.tagName.toLowerCase() == "a")
                return 1;
        }

        return 0;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Inspector Listener

    onStartInspecting: function(context)
    {
        if (FBTrace.DBG_LINKINSPECTOR)
            FBTrace.sysout("link-inspector; Listener.onStartInspecting(context: " +
                context.getTitle() + ")");
    },

    onInspectNode: function(context, node)
    {
        if (FBTrace.DBG_LINKINSPECTOR)
            FBTrace.sysout("link-inspector; Listener.onInspectNode(context: " +
                context.getTitle() + ", node: " + node.tagName + ")");
    },

    onStopInspecting: function(context, node, cancelled)
    {
        if (FBTrace.DBG_LINKINSPECTOR)
            FBTrace.sysout("link-inspector; Listener.onStopInspecting(context: " +
                context.getTitle() + ", node: " + node.tagName + ", cancelled: " +
                cancelled + ")");
    },
});

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

var LinkInspectorPlate = domplate(
{
    linkUrl:
        DIV({"class": "linkUrl"},
            "$object.href"
        ),

    linkPreview:
        IFRAME({"class": "linkPreview"}),

    defaultContent:
        DIV({"class": "defaultContent"},
            "Use Firebug Inspector and try to inspect a link on the current page."
        )
});

// ********************************************************************************************* //
// Module & Customizing Tracing

/**
 * @module The module object isn't really neccessary for the Inspector API. It serves
 * only to support Firebug tracing console, which is useful when debugging inspector
 * features.
 */
Firebug.LinkInspectorModule = extend(Firebug.Module,
/** @lends Firebug.LinkInspectorModule */
{
    initialize: function()
    {
        Firebug.Module.initialize.apply(this, arguments);

        if (Firebug.TraceModule) 
            Firebug.TraceModule.addListener(this);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        if (Firebug.TraceModule)
            Firebug.TraceModule.removeListener(this);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Trace Listener

    onLoadConsole: function(win, rootNode)
    {
        appendStylesheet(rootNode.ownerDocument, "chrome://linkinspector/skin/inspector.css");
    },

    onDump: function(message)
    {
        var index = message.text.indexOf("link-inspector;");
        if (index == 0)
        {
            message.text = message.text.substr("link-inspector;".length);
            message.text = trim(message.text);
            message.type = "DBG_LINKINSPECTOR";
        }
    }
});

// ********************************************************************************************* //
// Registration

Firebug.registerPanel(LinkInspectorPanel);
Firebug.registerModule(Firebug.LinkInspectorModule);
Firebug.registerStylesheet("chrome://linkinspector/skin/inspector.css");

// ********************************************************************************************* //
}});