/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

// ************************************************************************************************

Firebug.MemoryBug.Profiler = extend(Firebug.Module,
{
    profile: function(context)
    {
        Components.utils.forceGC();

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

                for (var index in data.objects) {
                    var info = data.objects[index];
                    if (info.name == win.url) {
                        win.objectCount = info.count;
                        win.lines = info.lines;
                        break;
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

Firebug.MemoryBug.MemoryProfilerTable = domplate(Firebug.Rep,
{
    tableTag:
        TABLE({"class": "memoryProfilerTable", cellpadding: 0, cellspacing: 0,
            onclick: "$onClick", _repObject: "$results"},
            TBODY(
                TR({"class": "memoryProfilerRow windows", _repObject: "$results.windows"},
                    TD({"class": "memoryProfilerCol"},
                        SPAN({"class": "label", title: $STR("memorybug.results.windows.tooltip")},
                            $STR("memorybug.results.windows")
                        )
                    ),
                    TD({"class": "memoryProfilerCol"},
                        SPAN({"class": "desc"}, $STR("memorybug.results.windows.tooltip"))
                    )
                ),
                TR({"class": "memoryProfilerRow objects", _repObject: "$results.shapes"},
                    TD({"class": "memoryProfilerCol"},
                        SPAN({"class": "label", title: $STR("memorybug.results.shapes.tooltip")},
                            $STR("memorybug.results.shapes")
                        )
                    ),
                    TD({"class": "memoryProfilerCol"},
                        SPAN({"class": "desc"}, $STR("memorybug.results.objects.tooltip"))
                    )
                ),
                TR({"class": "memoryProfilerRow nativeClasses", _repObject: "$results.nativeClasses"},
                    TD({"class": "memoryProfilerCol"},
                        SPAN({"class": "label", title: $STR("memorybug.results.nativeclasses.tooltip")},
                            $STR("memorybug.results.nativeclasses")
                        )
                    ),
                    TD({"class": "memoryProfilerCol"},
                        SPAN({"class": "desc"}, $STR("memorybug.results.nativeclasses.tooltip"))
                    )
                ),
                TR({"class": "memoryProfilerRow functions", _repObject: "$results.functions"},
                    TD({"class": "memoryProfilerCol"},
                        SPAN({"class": "label", title: $STR("memorybug.results.functions.tooltip")},
                            $STR("memorybug.results.functions")
                        )
                    ),
                    TD({"class": "memoryProfilerCol"},
                        SPAN({"class": "desc"}, $STR("memorybug.results.functions.tooltip"))
                    )
                )
            )
        ),

    infoBodyTag:
        TR({"class": "memoryProfilerBodyRow"},
            TD({"class": "memoryProfilerBodyCol", colspan: 2},
                TABLE({"class": "memoryProfilerInfoBodyTable", cellpadding: 0, cellspacing: 0},
                    TBODY({"class": "infoBody"})
                )
            )
        ),

    loop:
        FOR("member", "$members",
            TAG("$rowTag", {member: "$member"})),

    // Windows
    windowHeaderTag:
        TR({"class": "headerRow windowRow"},
            TH(DIV("URL")),
            TH(DIV("Objects")),
            TH(DIV("References")),
            TH(DIV("Referents"))
        ),

    windowRowTag:
        TR({"class": "resultRow windowRow", _repObject: "$member"},
            TD(
                DIV({"class": "windowUrlLabel", onclick: "$onClickWindow"},
                    "$member|getWindowURL"
                )
            ),
            TD("$member.objectCount"),
            TD("$member.references"),
            TD("$member.referents")
        ),

    // Objects/shapes
    objectHeaderTag:
        TR({"class": "headerRow objectRow"},
            TH(DIV("Properties")),
            TH(DIV("Instances"))
        ),

    objectRowTag:
        TR({"class": "resultRow objectRow"},
            TD({title: "$member.name"}, "$member|getShapeName"),
            TD("$member.count")
        ),

    // Native classes
    nativeClassHeaderTag:
        TR({"class": "headerRow nativeClassRow"},
            TH(DIV("Name")),
            TH(DIV("Instances"))
        ),

    nativeClassRowTag:
        TR({"class": "resultRow nativeClassRow"},
            TD("$member.name"),
            TD("$member.count")
        ),

    // Functions
    functionHeaderTag:
        TR({"class": "headerRow functionRow"},
            TH(DIV("Name")),
            TH(DIV("Size")),
            TH(DIV("Function Size")),
            TH(DIV("Script Size")),
            TH(DIV("Instances")),
            TH(DIV("Referents")),
            TH(DIV("Is Global")),
            TH({title: "Times in Prototype Chains"},
                DIV("Lookup")
            )
        ),

    functionRowTag:
        TR({"class": "resultRow functionRow", _repObject: "$member"},
            TD({onclick: "$onClickFunction"}, DIV("$member.name")),
            TD("$member.size"),
            TD("$member.functionSize"),
            TD("$member.scriptSize"),
            TD("$member.instances"),
            TD("$member.referents"),
            TD("$member.isGlobal"),
            TD("$member.protoCount")
        ),

    getWindowURL: function(member)
    {
        return cropString(member.url, 100);
    },

    getShapeName: function(member)
    {
        return cropString(member.name, 80);
    },

    onClick: function(event)
    {
        if (!isLeftClick(event))
            return;

        var row = getAncestorByClass(event.target, "memoryProfilerRow");
        if (row)
        {
            this.toggleRow(row);
            cancelEvent(event);
        }
    },

    toggleRow: function(row, forceOpen)
    {
        var opened = hasClass(row, "opened");
        if (opened && forceOpen)
            return;

        toggleClass(row, "opened");
        if (hasClass(row, "opened"))
        {
            var infoBodyRow = this.infoBodyTag.insertRows({}, row)[0];
            this.initBody(row, infoBodyRow);
        }
        else
        {
            var infoBodyRow = row.nextSibling;
            row.parentNode.removeChild(infoBodyRow);
        }
    },

    initBody: function(row, infoBodyRow)
    {
        var results = [result for each (result in row.repObject)];
        var parentNode = infoBodyRow.getElementsByClassName("infoBody").item(0);

        var rowTag;
        var headerTag;

        if (hasClass(row, "windows"))
        {
            headerTag = this.windowHeaderTag
            rowTag = this.windowRowTag;
        }
        else if (hasClass(row, "objects"))
        {
            headerTag = this.objectHeaderTag;
            rowTag = this.objectRowTag;
        }
        else if (hasClass(row, "nativeClasses"))
        {
            headerTag = this.nativeClassHeaderTag;
            rowTag = this.nativeClassRowTag;
        }
        else if (hasClass(row, "functions"))
        {
            headerTag = this.functionHeaderTag;
            rowTag = this.functionRowTag;
        }

        headerTag.replace({}, parentNode);
        this.loop.insertRows({members: results, rowTag: rowTag}, parentNode);
    },

    onClickFunction: function(event)
    {
        if (!isLeftClick(event))
            return;

        var row = getAncestorByClass(event.target, "functionRow");
        if (row)
        {
            var func = row.repObject;
            var sourceLink = new SourceLink(func.filename, func.lineStart, "js");
            var panel = Firebug.getElementPanel(row);
            FirebugReps.SourceLink.inspectObject(sourceLink, panel.context);
        }
    },

    onClickWindow: function(event)
    {
        if (!isLeftClick(event))
            return;

        var row = getAncestorByClass(event.target, "windowRow");
        if (row)
            Firebug.MemoryBug.ObjectListRep.toggle(row);
    }
});

// ************************************************************************************************

Firebug.MemoryBug.ObjectListRep = domplate(Firebug.Rep,
{
    infoBodyTag:
        TR({"class": "windowBodyRow"},
            TD({colspan: 4})
        ),

    objectTableTag:
        TABLE({"class": "objectListTable", cellpadding: 0, cellspacing: 0, onclick: "$onClick"},
            TBODY(
                FOR("line", "$lines",
                    TR({"class": "objectListRow", _repObject: "$line"},
                        TD(
                            SPAN({"class": "desc", "title": "$line|getTitle"},
                                "$line|getDescription"
                            ),
                            SPAN({onclick: "$onClickSource"},
                                A({"class": "objectLink objectLink-function"},
                                    "$line|getSource"
                                )
                            )
                        )
                    )
                )
            )
        ),

    getTitle: function(line)
    {
        var text = [];
        for (var desc in line.descriptions)
            text.push(line.descriptions[desc] + "x " + desc);
        return text.join(",");
    },

    getDescription: function(line)
    {
        return line.count + " object(s) at line: " + line.number;
    },

    getSource: function(line)
    {
        return cropString(line.source, 120);
    },

    toggle: function(row, forceOpen)
    {
        var opened = hasClass(row, "opened");
        if (opened && forceOpen)
            return;

        toggleClass(row, "opened");
        if (hasClass(row, "opened"))
        {
            var infoBodyRow = this.infoBodyTag.insertRows({}, row)[0];
            this.initBody(row, infoBodyRow);
        }
        else
        {
            var infoBodyRow = row.nextSibling;
            row.parentNode.removeChild(infoBodyRow);
        }
    },

    initBody: function(row, infoBodyRow)
    {
        var windowRow = getAncestorByClass(row, "windowRow");
        var winInfo = windowRow.repObject;
        var infoBody = infoBodyRow.firstChild;
        var panel = Firebug.getElementPanel(row);

        var lines = [];
        for (var item in winInfo.lines)
        {
            var line = winInfo.lines[item];
            lines.push(line);
            line.source = panel.context.sourceCache.getLine(line.url, line.number);
        }

        this.objectTableTag.replace({lines: lines}, infoBody);
    },

    onClick: function(event)
    {
        
    },

    onClickSource: function(event)
    {
        if (!isLeftClick(event))
            return;

        var row = getAncestorByClass(event.target, "objectListRow");
        if (row)
        {
            var line = row.repObject;
            var sourceLink = new SourceLink(line.url, line.number, "js");
            var panel = Firebug.getElementPanel(row);
            FirebugReps.SourceLink.inspectObject(sourceLink, panel.context);
        }
    }
});

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
