var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
//
/*
 * bootstrap.js API
 * https://wiki.mozilla.org/Extension_Manager:Bootstrapped_Extensions
*/
function startup(aData, aReason) {

    try
    {
        Components.utils.import("resource://firebug/require.js");
        Components.utils.reportError("bootstrap loaded require on startup");
        }
    catch (exc)
    {
         Cu.reportError("bootstrap 0 ERROR "+exc);
         debugger;
    }

    try
    {
        Components.utils.import("resource://gre/modules/Services.jsm");
         let resource = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
          let alias = Services.io.newFileURI(aData.installPath);
          if (!aData.installPath.isDirectory())
            alias = Services.io.newURI("jar:" + alias.spec + "!/", null, null);
          resource.setSubstitution("moduleloader", alias);
          Cu.reportError("bootstrap aData.installPath "+aData.installPath);
          Cu.reportError("bootstrap alias "+alias.spec);
          Cu.import("resource://moduleloader/modules/moduleLoader.js");
        Cu.reportError("bootstrap loaded "+ModuleLoader);
    }
    catch(exc)
    {
         Cu.reportError("bootstrap ERROR "+exc);
    }


}

function shutdown(aData, aReason) {

}

function install(aData, aReason) { }

function uninstall(aData, aReason) { }
