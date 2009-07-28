/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Module implementation

Firebug.FireStarter = extend(Firebug.Module,
{
    initialize: function(prefDomain, prefNames)
    {
        Firebug.Module.initialize.apply(this, arguments);

        if (Firebug.TraceModule)
            Firebug.TraceModule.addListener(this.TraceListener);

        if (FBTrace.DBG_STARTER)
            FBTrace.sysout("starter.initialized " + prefDomain, prefNames);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        if (Firebug.TraceModule)
            Firebug.TraceModule.removeListener(this.TraceListener);

        if (FBTrace.DBG_STARTER)
            FBTrace.sysout("starter.shutdown");
    },

    internationalizeUI: function(doc)
    {
        var elements = ["menu_logAnnotations", "menu_onByDefault"];
        for (var i=0; i<elements.length; i++)
        {
            var element = $(elements[i], doc);
            FBL.internationalize(element, "label");
            FBL.internationalize(element, "tooltiptext");
        }
    },

    // Customization of the activation logic.
    shouldCreateContext: function(browser, url, userCommands)
    {
        var result = false;

        var Activation = Firebug.Activation;
        var uri = Activation.convertToURIKey(url);
        if (uri)
        {
            // If there is no annotation for the current URL, return value of the
            // onByDefault option.
            if (!Activation.annotationSvc.pageHasAnnotation(uri, Activation.annotationName))
                result = Firebug.onByDefault;
        }

        if (FBTrace.DBG_STARTER)
            FBTrace.sysout("starter.shouldCreateContext: " + result + ", " +
                url + ", commands: " + userCommands);

        return result;
    }
});

// ************************************************************************************************

Firebug.FireStarter.TraceListener = 
{
    onLoadConsole: function(win, rootNode)
    {
        var doc = rootNode.ownerDocument;
        var styleSheet = createStyleSheet(doc, 
            "chrome://firestarter/skin/fireStarter.css");
        styleSheet.setAttribute("id", "fireStarterLogs");
        addStyleSheet(doc, styleSheet);
    },

    onDump: function(message)
    {
        var index = message.text.indexOf("starter.");
        if (index == 0)
            message.type = "DBG_STARTER";
    }
};

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.FireStarter);

// ************************************************************************************************
}});
