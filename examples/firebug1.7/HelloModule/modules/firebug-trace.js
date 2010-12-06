/* See license.txt for terms of usage */

define(function(require, exports, module) {

// ************************************************************************************************
// Module Implementation

var FirebugTrace = {};
Components.utils.import("resource://firebug/firebug-trace-service.js", FirebugTrace);

// ************************************************************************************************
// Exported Symbols

exports.FBTrace = FirebugTrace.traceConsoleService.getTracer("extensions.firebug");

// ************************************************************************************************
});
