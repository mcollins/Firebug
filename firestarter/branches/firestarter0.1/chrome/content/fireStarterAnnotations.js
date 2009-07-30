/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Module implementation

/**
 * Logging of existing annotations into the Firebug Console panel.
 */
Firebug.FireStarter.Annotations = extend(Object,
{
     clearAnnotations: function()
     {
        var self =this;
        Firebug.Activation.iterateAnnotations(function remove(uri)
        {
            self.annotationSvc.removePageAnnotation(uri, self.annotationName); // unmark this URI
            if (FBTrace.DBG_STARTER)
                FBTrace.sysout("starter.Annotations.clearAll untagged " + uri.spec);
        });
    },

    getBlackAndWhiteLists: function()
    {
        var lists = new Firebug.FireStarter.Lists();

        Firebug.Activation.iterateAnnotations(function buildLists(uri)
        {
            var annotation = Firebug.Activation.annotationSvc.getPageAnnotation(uri,
                Firebug.Activation.annotationName);

            if (annotation.indexOf("closed") > 0)
                lists.blackList.push(uri.spec);
            else
                lists.whiteList.push(uri.spec);
        });

        return lists;
    },

    logBlackAndWhiteLists: function()
    {
        if (FBTrace.DBG_STARTER)
            FBTrace.sysout("starter.logBlackAndWhiteLists");

        var lists = this.getBlackAndWhiteLists();

        //xxxHonza: localization
        this.logList("Firebug is activated for (%d):", lists.whiteList);
        this.logList("Firebug is deactivated for (%d):", lists.blackList);

        // Activate the Console panel so, the log is immediately visible.
        Firebug.chrome.selectPanel("console");
    },

    logList: function(message, list)
    {
        if (!list.length)
            return;

        //xxxHonza: custom template should be defined.
        Firebug.Console.openGroup([message, list.length]);
        for (var i=0; i<list.length; i++)
            Firebug.Console.logFormatted([list[i]]);
        Firebug.Console.closeGroup();
    }
});

// ************************************************************************************************
}});
