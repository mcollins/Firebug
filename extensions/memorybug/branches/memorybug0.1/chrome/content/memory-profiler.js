/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

var MAX_SHAPE_NAME_LEN = 80;
var ENTRIES_TO_SHOW = 10;

// ************************************************************************************************

Firebug.MemoryBug.Profiler = extend(Firebug.Module,
{
    profile: function(context)
    {
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

        var result = binary.profileMemory(code, fileName, 1, windows);
        var totalTime = (new Date()) - startTime;

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.profile; " + totalTime + " ms were spent in memory profiling.");

        result = JSON.parse(result);
        if (result.success)
        {
            if (FBTrace.DBG_MEMORYBUG)
                FBTrace.sysout("memorybug.profile; SUCCESS result data:", result.data);

            var self = this;
            window.setTimeout(function()
            {
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

            showReports(context, data);
        };

        worker.onerror = function(error)
        {
            log("An error occurred: " + error.message);
        };

        worker.postMessage(result);
    }
});

// ************************************************************************************************

Firebug.MemoryBug.ProfilerRep = domplate(Firebug.Rep,
{
    tag:
        DIV({"id": "reports", "class": "reports"},
            DIV({"class": "report"},
                H2("Window Information"),
                P("This list includes the page itself and any iframes contained within it."),
                TABLE({"id": "winTable", "class": "winTable"},
                    TBODY(
                        TR(
                            TH("Window"),
                            TH("References"),
                            TH("Referent")
                        )
                    )
                )
            ),
            DIV({"class": "report"},
                H2("Object Information"),
                P("The shape of an object is just a list of its properties. Because JavaScript doesn't have a concrete notion of classes, shape detection is the most we can do to categorize objects."),
                TABLE({"id": "objtable", "class": "objtable"},
                    TBODY(
                        TR(
                            TH("Shape"),
                            TH("Count")
                        )
                    )
                )
            ),
            DIV({"class": "report"},
                H2("Native Class Information"),
                P("The native class of a JavaScript object is the name given to the C/C++ structure that defines the object's behavior."),
                TABLE({"id": "nctable", "class": "nctable"},
                    TBODY(
                        TR(
                            TH("Native Class"),
                            TH("Instances")
                        )
                    )
                )
            ),
            DIV({"class": "report"},
                H2("Function Information"),
                P("You can click on a function name below to view its source code."),
                TABLE({"id": "functable", "class": "functable"},
                    TBODY(
                        TR(
                            TH("Function Name"),
                            TH("Instances"),
                            TH("Total Referents"),
                            TH("Is Global"),
                            TH("Times in Prototype Chains")
                        )
                    )
                )
            )
        ),
});

// ************************************************************************************************

function log(message, isInstant)
{
    if (FBTrace.DBG_MEMORYBUG)
        FBTrace.sysout("memorybug.log; (" + isInstant + ") " + message);

    Firebug.Console.log("Memory Profiler: " + message);
}

function addTableEntries(table, infos, buildRow, onDone)
{
  var cellsPerRow = table.firstChild.firstChild.childNodes.length;

  function addRow(info) {
    var row = table.ownerDocument.createElement("tr");
    var args = [info];
    for (var i = 0; i < cellsPerRow; i++) {
      var cell = table.ownerDocument.createElement("td");
      args.push(cell);
      row.appendChild(cell);
    }
    buildRow.apply(row, args);
    table.firstChild.appendChild(row);
  }

  infos.forEach(addRow);
}

function makeViewSourceCallback(context, filename, lineNo)
{
    return function viewSource()
    {
        var sourceLink = new SourceLink(filename, lineNo, "js");

        if (FBTrace.DBG_MEMORYBUG)
            FBTrace.sysout("memorybug.sourceLink; " + filename + "(" + lineNo + ")");

        FirebugReps.SourceLink.inspectObject(sourceLink, context);
    };
}

function makeShapeName(name) {
  if (name.length > MAX_SHAPE_NAME_LEN)
    name = name.slice(0, MAX_SHAPE_NAME_LEN) + "\u2026";
  name = name.replace(/,/g, "/");
  if (name && name.charAt(name.length-1) == "/")
    name = name.slice(0, name.length-1);
  if (!name)
    name = "(no properties)";
  return name;
}

function showReports(context, data, onDone)
{
    var panelNode = context.getPanel("memory").panelNode;
    Firebug.MemoryBug.ProfilerRep.tag.replace({}, panelNode);

    var doc = panelNode.ownerDocument;
    var reports = panelNode.getElementsByClassName("reports")[0];

    // Windows
    var winInfos = [info for each (info in data.windows)];
    winInfos.sort(function(b, a) { return a.referents - b.referents; });

    var windowNum = 1;
    function buildWinInfoRow(info, name, references, referents) {
        name.innerHTML = windowNum++;
        references.innerHTML = info.references;
        referents.innerHTML = info.referents;
    }

    if (FBTrace.DBG_MEMORYBUG)
        FBTrace.sysout("memorybug.showReports; WINDOWS", winInfos);

    addTableEntries(doc.getElementById("winTable"), winInfos, buildWinInfoRow);

    // Native Classes
    var ncInfos = [{name: name, instances: data.nativeClasses[name]}
        for (name in data.nativeClasses)];
    ncInfos.sort(function(b, a) { return a.instances - b.instances; });

    function buildNcInfoRow(info, name, instances) {
        name.innerHTML = info.name;
        instances.innerHTML = info.instances;
    }

    addTableEntries(doc.getElementById("nctable"), ncInfos, buildNcInfoRow);

    // Objects
    var objInfos = [{name: name, count: data.shapes[name]}
        for (name in data.shapes)];
    objInfos.sort(function(b, a) { return a.count - b.count; });

    function buildObjInfoRow(info, name, count) {
        name.innerHTML = makeShapeName(info.name);
        setClass(name, "object-name");
        count.innerHTML = info.count;
    }

    addTableEntries(doc.getElementById("objtable"), objInfos, buildObjInfoRow);

    // Functions
    var funcInfos = [info for each (info in data.functions)];
    funcInfos.sort(function(b, a) { return a.rating - b.rating; });

    function buildFuncInfoRow(info, name, instances, referents, isGlobal, protoCount) {
        name.innerHTML = info.name + "()";
        setClass(name, "object-name");
        setClass(name, "clickable");
        name.addEventListener("click", makeViewSourceCallback(context, info.filename, info.lineStart), false);
        instances.innerHTML = info.instances;
        referents.innerHTML = info.referents;
        isGlobal.innerHTML = info.isGlobal;
        protoCount.innerHTML = info.protoCount;
    }

    addTableEntries(doc.getElementById("functable"), funcInfos, buildFuncInfoRow, onDone);
}

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.MemoryBug.Profiler);

// ************************************************************************************************
}});
