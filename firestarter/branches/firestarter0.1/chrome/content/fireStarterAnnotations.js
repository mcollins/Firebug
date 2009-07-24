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
        var blacklist = [];
        var whitelist = [];

        Firebug.Activation.iterateAnnotations(function buildLists(uri)
        {
            var annotation = Firebug.Activation.annotationSvc.getPageAnnotation(uri,
                Firebug.Activation.annotationName);

            if (annotation.indexOf("closed") > 0)
                blacklist.push(uri.spec);
            else
                whitelist.push(uri.spec);
        });

        return {blacklist: blacklist, whitelist: whitelist};
    },

    logBlackAndWhiteLists: function()
    {
        if (FBTrace.DBG_STARTER)
            FBTrace.sysout("starter.logBlackAndWhiteLists");

        Firebug.Console.logFormatted([this.getBlackAndWhiteLists()]);
    }
});

// ************************************************************************************************
}});
