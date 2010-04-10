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
        var profileData = this.getProfileData(context);
        profileData.startTime = startTime;

        var resultJSON = binary.profileMemory(code, fileName, 1, profileData.objects);
        var totalTime = (new Date()) - startTime;

        // Parse result JSON data.
        var result = JSON.parse(resultJSON);
        if (!result.success)
        {
            if (FBTrace.DBG_MEMORYBUG)
                FBTrace.sysout("memorybug.Profiler.profile; ERROR " + result.error);
            return;
        }

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.profile; " + totalTime +
                " ms were spent in memory profiling. Result:", result);

        // Insert profile results into the profile report object.
        profileData.map = result.data.map;
        profileData.graph = result.data.graph;

        // Execute further analysis on the result and update profile data object.
        profileData.analyze(result.data);

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.profile; Input for ReportView:", profileData);

        // Generate UI.
        var ReportView = Firebug.MemoryBug.ReportView;
        var panelNode = context.getPanel("memory").panelNode;
        ReportView.render(profileData, panelNode);
    },

    /**
     * Returns structure with following arrays:
     * 
     * objects: list of all objects (translated to list of IDs in memory profiler runtime).
     * members: list of name-value pairs (where value == object) to remember name of an object.
     * globals: list of all global objects on the page (these will be displayed in the report).
     * 
     * The list of objects is translated into a list of IDs, which is consequently used
     * to match real objects found on the page (using indexes)
     * ID(objects[n]) -> members[n].
     * 
     * These two arrays represent an effective map of "meta-data" to real (named) "object".
     */
    getProfileData: function(context)
    {
        var windows = [];
        for (var i=0; i<context.windows.length; i++)
            windows.push(unwrapObject(context.windows[i]));

        var objects = cloneArray(windows);
        var members = [];
        var globals = [];

        // Collect windows as named members too.
        for (var i=0; i<windows.length; i++)
        {
            var win = windows[i];
            members.push({name: getFileName(safeGetWindowLocation(win)), value: win});
        }

        // Iterate over all windows (the current window and all iframes).
        var domMembers = getDOMMembers(unwrapObject(context.window));
        for (var i=0; i<windows.length; i++)
        {
            var iterator = new WindowObjectIterator(windows[i]);
            objects.push.apply(objects, iterator.objects);
            members.push.apply(members, iterator.members);
            globals.push.apply(globals, iterator.globals);
        }

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.profile; Named Objects (" +
                objects.length + "):", objects);

        var title = safeGetWindowLocation(context.window);
        return new ProfileResult(title, objects, globals, members);
    },
});

// ************************************************************************************************

/**
 * Data object containing all input data from the page (objects) and result data provided
 * by memory profiler APIs.
 * ID(objects[n]) -> members[n] is used to map IDs to named objects.
 * 
 * @param {String} title Name of the memory snaphot.
 * @param {Array} objects List of all objects on the page.
 * @param {Array} globals List of all global objects on the page.
 * @param {Array} members List of (named objects) name-value pairs where name is a name
 *      of the object and value is the object itself.
 */
function ProfileResult(title, objects, globals, members)
{
    this.title = title;
    this.objects = objects;
    this.globals = globals;
    this.members = members;

    // Set when profiling starts.
    this.startTime = null;

    // Set after profiling in analyzeResult method.
    this.uidMap = null;
    this.graph = null;
}

ProfileResult.prototype =
{
    /**
     * Returns a member according to ID;
     * @param {Object} id Object unique ID.
     * @returns this.members[map[id]];
     */
    getMember: function(id)
    {
        var index = this.uidMap[id];
        if (typeof(index) == "undefined")
            return null;

        return this.members[index];
    },

    findMember: function(object)
    {
        // Iterate over all members (named objects on the page) to return the proper
        // member for specific object. This is the way how to get meta data (info)
        // for an object.
        var index = this.objects.indexOf(object);
        if (index >= 0)
            return this.members[index];
        return null;
    },

    getGraph: function()
    {
        return this.graph;
    },

    isGlobal: function(id)
    {
        var index = this.uidMap[id];
        if (typeof(index) == "undefined")
            return null;

        return this.globals[index] ? true : false;
    },

    analyze: function(result)
    {
        this.uidMap = result.map;
        this.graph = result.graph;

        // Iterate entire graph and collect additional info.
        var graph = this.graph;
        for (var name in graph)
        {
            var id = parseInt(name);
            var info = graph[id];

            // Resolve links within the graph
            info.parent = graph[info.parent] ? graph[info.parent] : info.parent;
            info.prototype = graph[info.prototype] ? graph[info.prototype] : info.prototype;
            info.wrappedObject = graph[info.wrappedObject] ? graph[info.wrappedObject] : info.wrappedObject;

            var children = [];
            for (var i=0; i<info.children.length; i++)
            {
                var child = graph[info.children[i]];
                if (!child)
                    continue;

                // Remember all referents (except of the prototype) 
                if (!child.referents)
                    child.referents = [];

                // Don't include window into referents.
                if (info.nativeClass != "Window")
                    child.referents.push(info);

                // Filter non existing children, parent and prototype.
                if (child && info.parent != child && info.prototype != child)
                    children.push(child);
            }

            // Replace list of IDs with list of info objects.
            if (children.length)
                info.children = children;
            else
                delete info.children;

            // Associate meta-data with real objects on the page (not windows).
            // Now we have three important things together (in profileData.members):
            // name: name of the object
            // value: the object itself
            // info: meta-data returned by the profiler.
            var member = this.getMember(id);
            if (!member)
                continue;

            member.info = info;

            // Get constructor if any.
            member.info.ctor = this.getCtor(info);
        }

        if (this.objects.length != this.members.length)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("memorybug.ProfileResult.analyze; ERROR data mismatch!");
        }
    },

    getCtor: function(info)
    {
        if (!info.prototype || !info.prototype.children)
            return null;

        if (info.prototype.children.length != 1)
            return null;

        return info.prototype.children[0];
    }
}

// ************************************************************************************************

function WindowObjectIterator(win)
{
    this.window = win;
    this.objects = new Array();
    this.members = new Array();
    this.globals = new Array();

    this.getObjects();
}

WindowObjectIterator.prototype =
{
    getObjects: function()
    {
        try
        {
            var domMembers = getDOMMembers(unwrapObject(this.window));

            // Collect globals first.
            for (var p in this.window) {
                if (!(p in domMembers))
                    this.getChildren(p, this.window, true);
            }

            // And once again, colllect all
            // xxxHonza: this should be optimized.
            this.objects = [];
            this.members = [];

            for (var p in this.window) {
                if (!(p in domMembers))
                    this.getChildren(p, this.window, false);
            }
        }
        catch (err)
        {
            if (FBTrace.DBG_MEMORYBUG || FBTrace.DBG_ERRORS)
                FBTrace.sysout("memorybug.WindowObjectIterator.getAllObjects; EXCEPTION", err);
        }
    },

    getChildren: function(prop, object, global)
    {
        var value = unwrapObject(object[prop]);
        if (!value)
            return;

        if (typeof(value) !== "object" && typeof(value) !== "function")
            return;

        // Check if we have the object already.
        var index = this.objects.indexOf(value);
        if (index != -1)
            return;

        // Remember the object for fast lookup.
        this.objects.push(value);

        // Remember name and value.
        var member = {
            name: prop,
            value: value,
        };

        this.members.push(member);

        // Collect global objects first.
        if (global && typeof(value) !== "function")
            this.globals.push(member);

        if (global)
            return;

        for (var p in value)
            this.getChildren(p, value, false);
    }
}

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.MemoryBug.Profiler);

// ************************************************************************************************
}});
