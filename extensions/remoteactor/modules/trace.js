/* See license.txt for terms of usage */

// ********************************************************************************************* //
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

var EXPORTED_SYMBOLS = ["FBTrace"];

// ********************************************************************************************* //
// Service implementation

/**
 * This implementation serves as a proxy to the FBTrace extension. All logs are forwarded
 * to the FBTrace service.
 */
try
{
    Components.utils["import"]("resource://fbtrace/firebug-trace-service.js");
}
catch (err)
{
    var traceConsoleService =
    {
        getTracer: function(prefDomain)
        {
            var TraceAPI = ["dump", "sysout", "setScope", "matchesNode", "time", "timeEnd"];
            var TraceObj = {};
            for (var i=0; i<TraceAPI.length; i++)
                TraceObj[TraceAPI[i]] = function() {};

            // Log into the system console by default.
            TraceObj.sysout = function(message) { dump(message + "\n"); };

            return TraceObj;
        }
    };
}

var FBTrace = traceConsoleService.getTracer("extensions.firebug");

// ********************************************************************************************* //
