/* See license.txt for terms of usage */

/**
 * Content of this file is injected and executed within a new runtime (created by JetPack
 * memory APIs). Input data are passsed into this scope using <code>nsIJetpack.profileMemory</code>
 * method (see {@link Firebug.MemoryBug.Profiler.profile}). This input data are accessed here
 * using <code>getNamedObjects</code> method. All results returned from this scope are JSON based.
 * 
 * Execution of this script is blocking the target runtime (the one we are taking the memory
 * snaphost for) so, try to be fast here.
 */

// ************************************************************************************************
// Constants

var INTERESTING_TYPES = [
    'Object', 'Function', 'Call', 'Window', 'Array', 'RegExp',
    'Block', 'Date', 'String', 'StopIteration', 'Iterator',
    'Error', 'Math', 'JSON', 'Boolean', 'With', 'Number',
    'XML', 'Script', 'CanvasRenderingContext2D',
    'PageTransitionEvent', 'MouseEvent',
    'Location', 'Navigator', 'Generator', 'XPCNativeWrapper',
    'XPCSafeJSObjectWrapper', 'XPCCrossOriginWrapper',

    // Additions
    'Pointer', 'NodeList', 'JSDGlobal'
];

// Convert INTERESTING_TYPES array into a map (it's just easier to define these types as
// array and faster to use it as a map).
var interestingTypes = {};
INTERESTING_TYPES.forEach(
    function(name) { interestingTypes[name] = true; }
);

// ************************************************************************************************
// Inspecting memory of the target runtime.

function inspectMemory()
{
    var namedObjects = getNamedObjects();
    var parents = unwrapObjects(namedObjects);

    var graph = {};
    var rejected = {};

    // Returns an object whose keys are object IDs and whose values are the name of the JSClass
    // used by the object for each ID. This is effectively an index into all objects in the
    // target runtime.
    var table = getObjectTable();
    for (var id in table)
    {
        var nativeClass = table[id];

        // Get info only for interesting objects, but remember what was skipped.
        // This can be useful for debugging purposes.
        if (!((nativeClass in interestingTypes) ||
            (nativeClass.indexOf('HTML') == 0) ||
            (nativeClass.indexOf('DOM') == 0) ||
            (nativeClass.indexOf('XPC_WN_') == 0)))
        {
            (nativeClass in rejected) ? rejected[nativeClass]++ : rejected[nativeClass] = 0;
            continue;
        }

        // Don't forget to parse, the ID is a string.
        var intId = parseInt(id);
        var parent = getObjectParent(intId);

        // Inspect only objects that belong to a specified parent window or represent the window.
        if (!((parent in parents) || (intId in parents)))
            continue;

        var info = getObjectInfo(intId);
        graph[id] = info;
    }

    // Return collected results.
    return {
        namedObjects: parents,
        graph: graph,
        rejectedTypes: rejected
    }
};

// ************************************************************************************************
// Helpers

function unwrapObjects(objects)
{
    var result = {};
    for (var name in objects)
    {
        var id = objects[name];
        var info = getObjectInfo(id);

        // Bypass wrappers.
        while (info.wrappedObject)
        {
            id = parseInt(info.wrappedObject);
            info = getObjectInfo(info.wrappedObject);
        }

        // Bypass split objects.
        if (info.innerObject)
            id = info.innerObject;

        // Store all named objects into a map where the key is object ID
        // and the value is position in the input array.
        result[id] = parseInt(name);
    }

    return result;
}

// ************************************************************************************************
// Execution

(function profilerRunner()
{
   var result;
   try
   {
        result = {
            success: true,
            data: inspectMemory()
        };
   }
   catch (e)
   {
        result = {
            success: false,
            error: String(e)
        };
   }
   return JSON.stringify(result);
})();
