/* See license.txt for terms of usage */

// ************************************************************************************************

/**
 * Content of this file is executed within a worker thread so, time consuming analysis (on data
 * returned from <code>nsIJetpack.profileMemory</code>) doesn't block the UI.
 */

// ************************************************************************************************

/**
 * Analyses are made in a worker thread so, the UI isn't frozen. The results is
 * posted into the UI thread using JSON.
 */
function onmessage(event)
{
    var result = analyzeResult(event.data);
    postMessage(result);
}

// ************************************************************************************************
// Memory graph analysis.

function analyzeResult(result)
{
    var data = JSON.parse(result);
    var graph = convertKeys(data.graph);
    var namedObjects = data.namedObjects;

    for (id in graph)
    {
        // Filter out children that doesn't exist in out (filtered) graph.
        graph[id].children = [childId
            for each (childId in graph[id].children)
            if (childId in graph)];

        // Add referent field.
        graph[id].referents = [];
    }

    var nativeClasses = {};

    // Iterate entire graph and collect additional info.
    for (id in graph)
    {
        var info = graph[id];

        // Count number of native classes.
        var nativeClass = info.nativeClass;
        if (nativeClass.indexOf("XPC") == 0)
            nativeClass = "XPConnect Object Wrapper";
        if (!(nativeClass in nativeClasses))
            nativeClasses[nativeClass] = 1;
        else
            nativeClasses[nativeClass]++;

        // Add referent info.
        info.children.forEach(function(childId)
        {
            graph[childId].referents.push(parseInt(id));
        });
    }

    return JSON.stringify({
        nativeClasses: nativeClasses,
        graph: graph,
        namedObjects: data.namedObjects
    });
}

// ************************************************************************************************
// Helpers

function convertKeys(graph)
{
    // Convert keys in the graph from strings to ints.
    // TODO: Can we get rid of this ridiculousness?
    var newGraph = {};
    for (id in graph)
        newGraph[parseInt(id)] = graph[id];

    return newGraph;
}
