/* See license.txt for terms of usage */

define(function(require, exports, module) {

// ********************************************************************************************* //
// Module Implementation

// We need to use the console object in case of the web page that doesn't have proper
// privileges to use Components.utils

var FBTrace =
{
    sysout: function()
    {
        if (typeof(console.log) == "function")
            console.log.apply(console, arguments);
    }
};

try
{
    var FirebugTrace = {};
    Components.utils["import"]("resource://firebug/firebug-trace-service.js", FirebugTrace);
    FBTrace = FirebugTrace.traceConsoleService.getTracer("extensions.firebug");
}
catch (e)
{
}


// ********************************************************************************************* //
// Exported Symbols

exports.FBTrace = FBTrace;

// ********************************************************************************************* //
});
