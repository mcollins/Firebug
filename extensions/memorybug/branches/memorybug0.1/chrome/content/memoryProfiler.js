/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

// ************************************************************************************************

/**
 * @class This object implements memory profiling logic. It's responsible for taking a memory
 * snaphot and also the one that is using JetPack memory APIs. All results are displayed
 * within the Memory panel using existing domplates {@link Firebug.MemoryBug.MemoryProfilerTable}.
 */
Firebug.MemoryBug.Profiler = extend(Firebug.Module,
{
    profile: function(context)
    {
        Components.utils.forceGC();

        //var fileName = "chrome://memorybug/content/memoryProfilerInjected.js";
        var fileName = "chrome://memorybug/content/memory-profiler.profiler.js";
        var code = getResource(fileName);

        var startTime = new Date();
        var binary = this.getBinaryComponent();
        if (!binary)
        {
            log("Required binary component not found! One may not be available " +
                "for your OS and Firefox version.");
            return;
        }

        var windows = [];
        for (var i=0; i<context.windows.length; i++)
            windows.push(context.windows[i].wrappedJSObject);

        var domPanel = context.getPanel("dom");

        var props = [];
        for (var i=0; i<windows.length; i++)
            props.push.apply(props, domPanel.getMembers(windows[i], 0, context));

        var namedObjects = [];
        namedObjects.push.apply(namedObjects, windows);
        //namedObjects.push.apply(namedObjects, props);

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.profile; Named Objects: ", namedObjects);

        var resultJSON = binary.profileMemory(code, fileName, 1, namedObjects);
        var totalTime = (new Date()) - startTime;

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.profile; " + totalTime +
                " ms were spent in memory profiling.");

        var result = JSON.parse(resultJSON);
        if (result.success)
        {
            if (FBTrace.DBG_MEMORYBUG)
            {
                FBTrace.sysout("memorybug.profile; SUCCESS result data:", result.data);
                traceResult(resultJSON, namedObjects, context);
            }

            var self = this;
            window.setTimeout(function() {
                self.analyzeResult(context, JSON.stringify(result.data), startTime, context.getTitle());
            }, 0);
        }
        else
        {
            log("An error occurred while profiling.");
            log(result.traceback);
            log(result.error);
        }
    },

    getBinaryComponent: function()
    {
        try
        {
            var factory = Cc["@labs.mozilla.com/jetpackdi;1"].createInstance(Ci.nsIJetpack);
            return factory.get();
        }
        catch (e)
        {
            if (FBTrace.DBG_MEMORYBUG || FBTrace.DBG_ERRORS)
                FBTrace.sysout("memorybug.getBinaryComponent; EXCEPTION", e);
        }
    },

    analyzeResult: function(context, result, startTime, name)
    {
        var worker = new Worker("chrome://memorybug/content/memory-profiler.worker.js");

        worker.onmessage = function(event)
        {
            var data = JSON.parse(event.data);

            if (FBTrace.DBG_MEMORYBUG)
                FBTrace.sysout("memorybug.profile; Result data analyzed:", data);

            for (var i=0; i<data.windows.length; i++)
            {
                var win = data.windows[i];
                win.url = safeGetWindowLocation(context.windows[i]).toString();
                win.objects = [];

                for (var index in data.objects) {
                    var info = data.objects[index];
                    if (info.parent == win.id) {
                        win.objectCount = info.count;
                        win.objects.push(info);
                    }
                }
            }

            var panelNode = context.getPanel("memory").panelNode;
            Firebug.MemoryBug.MemoryProfilerTable.tableTag.replace({results: data}, panelNode);
        };

        worker.onerror = function(error)
        {
            log("An error occurred: " + error.message);
        };

        worker.postMessage(result);
    }
});

// ************************************************************************************************

function traceResult(result, namedObjects, context)
{
    var result = JSON.parse(result);
    var graph = result.data.graph;

    for (var id in graph)
    {
        var info = graph[id];

        // Link to real parent
        if (info.parent)
            info.parent = graph[info.parent] ? graph[info.parent] : info.parent;

        // Link to real prototype
        if (info.parent)
            info.prototype = graph[info.prototype] ? graph[info.prototype] : info.prototype;

        // Link to real children
        var children = [];
        for (var i=0; i<info.children.length; i++)
        {
            var child = graph[info.children[i]];
            if (child && info.parent != child && info.prototype != child)
                children.push(child);
        }

        if (children.length)
            info.children = children;
        else
            delete info.children;

        // Get source code
        try
        {
            if (info.filename && info.lineStart)
                info.source = context.sourceCache.getLine(info.filename, info.lineStart);
        }
        catch (e)
        {
            info.source = "EXCEPTION: " + e;
        }

        // Get variable name
        var index = result.data.namedObjects[id];
        if (typeof(index) != "undefined")
        {
            if (info.name)
                info.name2 = namedObjects[index].name;
            else
                info.name = namedObjects[index].name;

            info.value = namedObjects[index].value;
        }
    }

    FBTrace.sysout("memorybug.profile; All:", graph);

    FBTrace.sysout("memorybug.profile; Functions:",
        [func for each (func in graph) if (func.nativeClass == "Function")]);

    FBTrace.sysout("memorybug.profile; Objects:",
        [obj for each (obj in graph) if (obj.nativeClass == "Object")]);
}

// ************************************************************************************************

function log(message, isInstant)
{
    if (FBTrace.DBG_MEMORYBUG)
        FBTrace.sysout("memorybug.log; (" + isInstant + ") " + message);

    Firebug.Console.log("Memory Profiler: " + message);
}

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.MemoryBug.Profiler);

// ************************************************************************************************
}});
