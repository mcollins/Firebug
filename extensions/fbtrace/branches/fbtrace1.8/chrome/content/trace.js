/* See license.txt for terms of usage */

Components.utils["import"]("resource://fbtrace-firebug/firebug-trace-service.js");
var FBTrace = traceConsoleService.getTracer("extensions.chromebug");

FBTrace.setScope(window);
function clearFBTraceScope()
{
    window.removeEventListener('unload', clearFBTraceScope, true);
    FBTrace.setScope(null);
}
window.addEventListener('unload', clearFBTraceScope, true);
