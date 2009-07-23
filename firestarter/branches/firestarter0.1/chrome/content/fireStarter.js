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

        if (FBTrace.DBG_STARTER)
            FBTrace.sysout("starter.initialized " + prefDomain, prefNames);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        if (FBTrace.DBG_STARTER)
            FBTrace.sysout("starter.shutdown");
    },

    internationalizeUI: function(doc)
    {
        var elements = ["menu_logAnnotations", "menu_onByDefault2"];
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
        if (FBTrace.DBG_STARTER)
            FBTrace.sysout("starter.shouldCreateContext " + url + ", " + userCommands);

        // If there is no annotation for the current URL, return value of the
        // onByDefault option.
        var selector = Firebug.URLSelector;
        if (!selector.annotationSvc.pageHasAnnotation(uri, selector.annotationName))
            return Firebug.onByDefault;

        return false;
    }
});

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.FireStarter);

// ************************************************************************************************
}});
