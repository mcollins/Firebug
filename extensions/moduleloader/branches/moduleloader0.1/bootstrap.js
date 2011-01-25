var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
try
{
    Components.utils.import("resource://firebug/firebug-trace-service.js");
    Components.utils.reportError("bootstrap loaded "+FBTrace);
    }
catch (exc)
{
     Cu.reportError("bootstrap 0 ERROR "+exc);
}
//Cu.import("resource://moduleloader/moduleLoader.js");
/*
 * bootstrap.js API
 * https://wiki.mozilla.org/Extension_Manager:Bootstrapped_Extensions
*/
function startup(aData, aReason) {


    try
    {
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
