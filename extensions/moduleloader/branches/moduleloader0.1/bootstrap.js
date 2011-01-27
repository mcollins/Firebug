var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

var ModuleLoader =
{
        onError: function(msg)
        {
            Cu.reportError(msg);
        },
        mozIOService: Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService),
};

function mozReadTextFromFile(pathToFile) {
    try {
        var channel = ModuleLoader.mozIOService.newChannel(pathToFile, null, null);
        var inputStream = channel.open();

        var ciStream = Cc["@mozilla.org/intl/converter-input-stream;1"]
            .createInstance(Ci.nsIConverterInputStream);

        var bufLen = 0x8000;
        ciStream.init(inputStream, "UTF-8", bufLen,
                      Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
        var chunk = {};
        var data = "";

        while (ciStream.readString(bufLen, chunk) > 0) {
            data += chunk.value;
        }

        ciStream.close();
        inputStream.close();

        return data;
    } catch (err) {
        if (err.name === "NS_ERROR_FILE_NOT_FOUND") {
            // TODO: The call stack needs to point to the caller here
            var callsite = "";
            var caller = err.location ? err.location.caller : null;
            while (caller) {
                if (caller.filename === "resource://firebug/moduleLoader.js" && caller.lineNumber === 49) {
                    if (caller.caller) {
                        callsite = caller.caller.filename +"@"+caller.caller.lineNumber;
                    }
                    break;
                }
                caller = caller.caller;
            }
            return ModuleLoader.onError(new Error("ModuleLoader file not found "+pathToFile+" "+callsite), {err:err, pathToFile: pathToFile, moduleLoader: this});
        }
        return ModuleLoader.onError(new Error("mozReadTextFromFile; EXCEPTION "+err), {err:err, pathToFile: pathToFile, moduleLoader: this});
    }
}

//
/*
 * bootstrap.js API
 * https://wiki.mozilla.org/Extension_Manager:Bootstrapped_Extensions
*/
function startup(aData, aReason) {

    try
    {
        Components.utils.import("resource://gre/modules/Services.jsm");
        Cu.reportError("bootstrap aData.installPath "+aData.installPath.path);
        aData.installPath.append("modules");
        Cu.reportError("bootstrap aData.installPath "+aData.installPath.path);
        let resource = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
        let alias = Services.io.newFileURI(aData.installPath);
        if (!aData.installPath.isDirectory())
            alias = Services.io.newURI("jar:" + alias.spec + "!/", null, null);
        resource.setSubstitution("moduleloader", alias);
          Cu.reportError("bootstrap alias "+alias.spec);
          Cu.import("resource://moduleloader/moduleLoader.js");
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
