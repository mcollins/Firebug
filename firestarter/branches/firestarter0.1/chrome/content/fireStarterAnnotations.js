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
        Firebug.Activation.clearAnnotations();
    },

    getBlackAndWhiteLists: function()
    {
        var lists = new Firebug.FireStarter.Lists();

        Firebug.Activation.iterateAnnotations(function buildLists(uri, annotation)
        {
            if (annotation.indexOf("closed") > 0)
                lists.blackList.push(uri);
            else
                lists.whiteList.push(uri);
        });

        return lists;
    },

    logBlackAndWhiteLists: function()
    {
        if (FBTrace.DBG_STARTER)
            FBTrace.sysout("starter.logBlackAndWhiteLists");

        var lists = this.getBlackAndWhiteLists();

        // Open Firebug UI and select the Console panel.
        Firebug.toggleBar(true);
        Firebug.chrome.selectPanel("console");

        // Log black and white lists into the Console panel.
        //xxxHonza: localization
        this.logList("Firebug is activated for (%d):", lists.whiteList);
        this.logList("Firebug is deactivated for (%d):", lists.blackList);
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
