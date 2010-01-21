/* See license.txt for terms of usage */



// This code runs in the FBTest Window.
FBTestApp.ns(function() { with (FBL) {
    var Application = Components.classes["@mozilla.org/fuel/application;1"].getService(Components.interfaces.fuelIApplication);

 // ************************************************************************************************
 // Constants

 const Cc = Components.classes;
 const Ci = Components.interfaces;

 const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
 const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

FBTestApp.extensions =
{
    getInstalledExtensions: function()
    {
        FBTrace.sysout("FBTestApp.extensions Application: "+Application.name, Application);  // XXX crashes Firefox if you open the object tab
        var extensions = Application.extensions;
        FBTrace.sysout("FBTestApp.extensions Application.extensions: "+Application.name, extensions.all);
        return extensions.all;
    },

}

}});
