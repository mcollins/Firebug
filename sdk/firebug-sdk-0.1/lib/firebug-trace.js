/* See license.txt for terms of usage */

const {Cc,Ci,Cu} = require("chrome");

var FirebugTrace = {};
Cu.import("resource://firebug/firebug-trace-service.js", FirebugTrace);

// ************************************************************************************************
// Exported Symbols

exports.FBTrace = FirebugTrace.traceConsoleService.getTracer("extensions.firebug");
