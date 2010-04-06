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

    profile: function(context)
    {
        // xxxHonza: this is here for now. It could be also useful to profile
        // objects ready fo garbage collecting.
        Components.utils.forceGC();

        var fileName = "chrome://memorybug/content/memoryProfilerInjected.js";
        //var fileName = "chrome://memorybug/content/memory-profiler.profiler.js";
        var code = getResource(fileName);

        var startTime = new Date();
        var binary = this.getBinaryComponent();
        if (!binary)
        {
            // xxxHonza: also update the default Memory panel content.
            Firebug.Console.log("Memory Profiler: Required binary component not found! " +
                "One may not be available for your OS and Firefox version.");
            return;
        }

        // Run memory profiling.
        var namedObjects = this.getNamedObjects(context);
        var resultJSON = binary.profileMemory(code, fileName, 1, namedObjects.parents);
        var totalTime = (new Date()) - startTime;

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.profile; " + totalTime +
                " ms were spent in memory profiling.");

        // Parse result JSON data.
        var result = JSON.parse(resultJSON);
        if (!result.success)
        {
            if (FBTrace.DBG_MEMORYBUG)
                FBTrace.sysout("memorybug.Profiler.profile; ERROR " + result.error);
            return;
        }

        // Execute further analysis.
        var self = this;
        window.setTimeout(function()
        {
            self.analyzeResult(context, namedObjects, result.data, startTime,
                context.getTitle());
        }, 0);
    },

    analyzeResult: function(context, namedObjects, data, startTime, name)
    {
        var graph = data.graph;
        var nativeClasses = {};
        var objects = {};
        var functions = {};

        // Iterate entire graph and collect additional info.
        for (var name in graph)
        {
            var id = parseInt(name);
            var info = graph[id];

            // Count number of native classes.
            var nativeClass = info.nativeClass;
            if (nativeClass.indexOf("XPC") == 0)
                nativeClass = "XPConnect Object Wrapper";
            if (!(nativeClass in nativeClasses))
                nativeClasses[nativeClass] = {type: "nativeclass", name: nativeClass, count: 1};
            else
                nativeClasses[nativeClass].count++;

            info.parent = graph[info.parent] ? graph[info.parent] : info.parent;
            info.prototype = graph[info.prototype] ? graph[info.prototype] : info.prototype;
            info.wrappedObject = graph[info.wrappedObject] ? graph[info.wrappedObject] : info.wrappedObject;

            var children = [];
            for (var i=0; i<info.children.length; i++)
            {
                var child = graph[info.children[i]];
                if (!child)
                    continue;

                // Remember all referents
                if (!child.referents)
                    child.referents = [];
                child.referents.push(info);

                // Filter non existing children, parent and prototype.
                if (child && info.parent != child && info.prototype != child)
                    children.push(child);
            }

            if (children.length)
                info.children = children;
            else
                delete info.children;

            // Associate meta-data with real objects on the page.
            var index = data.namedObjects[id];
            if (typeof(index) != "undefined" && info.nativeClass != "Function")
            {
                var object = namedObjects.objects[index];
                if (!(object.obj instanceof Window))
                    objects[id] = {type: "object", name: object.name, value: object.obj, info: info};
            }

            // Collect all functions.
            if (info.nativeClass == "Function")
            {
                functions[id] = {type: "function", name: info.name, info: info};
            }
        }

        data.objects = objects;
        data.startTime = startTime;
        data.title = safeGetWindowLocation(context.window);
        data.nativeClasses = nativeClasses;
        data.functions = functions;

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.profile; Result data analyzed:", data);

        // Generate UI.
        var ReportView = Firebug.MemoryBug.TreeView;
        var panelNode = context.getPanel("memory").panelNode;
        var provider = new Firebug.MemoryBug.ReportProvider(data, namedObjects.objects);
        ReportView.render(provider, panelNode);
    },

    getNamedObjects: function(context)
    {
        var windows = [];
        for (var i=0; i<context.windows.length; i++)
            windows.push(unwrapObject(context.windows[i]));

        var parents = cloneArray(windows);
        var objects = [];

        // Collect also windows as objects.
        for (var i=0; i<windows.length; i++)
        {
            var win = windows[i];
            objects.push({name: safeGetWindowLocation(win), obj: win});
        }

        // Iterate over all windows (the current window and all iframes).
        var domMembers = getDOMMembers(unwrapObject(context.window));
        for (var i=0; i<windows.length; i++)
        {
            // Iterate over all global objects of a window and ignore built in members.
            var win = windows[i];
            for (var name in win)
            {
                if (name in domMembers)
                    continue;

                var obj = win[name];
                var type = typeof(obj);
                if (obj == null || type == "number" || type == "string" ||
                    type == "Boolean" || type == "undefined")
                {
                    continue;
                }

                objects.push({name: name, obj: obj});
                parents.push(obj);
            }
        }

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.profile; Named Objects (" +
                objects.length + "):", objects);

        return {
            parents: parents,
            objects: objects,
        };
    },
});

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.MemoryBug.Profiler);

// ************************************************************************************************
}});
