/* See license.txt for terms of usage */

/**
 * Analyses are made in a worker thread so, the UI isn't frozen. The results is
 * posted into the UI thread using JSON.
 */
function onmessage(event)
{
    var result = analyzeResult(event.data);
    postMessage(analyzeResult(event.data));
}

// ************************************************************************************************
// Memory graph analysis.

function analyzeResult(result)
{
    var data = JSON.parse(result);
    var graph = convertKeys(data.graph);

    // Update children array so, we are working only with those who actually exist
    // in our graph (some of them could be filter out by the memory profiler).
    updateChildren(graph);

    // Iterate entire graph.
    for (id in graph)
    {
        var info = graph[id];
    }



    return JSON.stringify({
        functions: functions,
        nativeClasses: tempNC,
        windows: windows,
        rejectedTypes: data.rejectedTypes,
        shapes: tempShapes,
        objects: tempObjects});
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

function updateChildren(graph)
{
    for (id in graph)
    {
        graph[id].children = [graph[childId]
            for each (childId in graph[id].children)
            if (childId in graph)];
    }
}

