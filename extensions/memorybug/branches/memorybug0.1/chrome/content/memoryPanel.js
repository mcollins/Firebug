/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Memory Panel implementation

/**
 * @panel Represents the Memory panel, main Memorybug UI.
 */
Firebug.MemoryBug.Panel = function MemoryBugPanel() {}
Firebug.MemoryBug.Panel.prototype = extend(Firebug.Panel,
/** @lends Firebug.MemoryBug.Panel */
{
    name: "memory",
    title: $STR("memorybug.Memory"),

    initialize: function(context, doc)
    {
        Firebug.Panel.initialize.apply(this, arguments);

        appendStylesheet(doc, "memoryBugStyles");

        Firebug.MemoryBug.DefaultContent.tag.replace({}, this.panelNode);
    },

    show: function(state)
    {
        Firebug.Panel.show.apply(this, arguments);

        this.showToolbarButtons("fbMemoryButtons", true);

        this.refresh();
    },

    hide: function()
    {
        Firebug.Panel.hide.apply(this, arguments);

        this.showToolbarButtons("fbMemoryButtons", false);
    },

    refresh: function()
    {
    }
});

// ************************************************************************************************

function appendStylesheet(doc)
{
    // Make sure the stylesheet isn't appended twice.
    if (!$("memoryBugStyles", doc))
    {
        var styleSheet = createStyleSheet(doc, "chrome://memorybug/skin/memorybug.css");
        styleSheet.setAttribute("id", "memoryBugStyles");
        addStyleSheet(doc, styleSheet);
    }
}

// ************************************************************************************************

/**
 * @domplate Default template displayed within empty Memory panel.
 */
Firebug.MemoryBug.DefaultContent = domplate(Firebug.Rep,
{
    tag:
        TABLE({"class": "memoryProfilerDefaultTable", cellpadding: 0, cellspacing: 0},
            TBODY(
                TR({"class": "memoryProfilerDefaultRow"},
                    TD({"class": "memoryProfilerDefaultCol"},
                        BUTTON({"class": "memoryProfilerDefaultBtn", onclick: "$onRefresh"},
                            $STR("memorybug.button.memorysnapshot")
                        )
                    )
                )
            )
        ),

    onRefresh: function(event)
    {
        var panel = Firebug.getElementPanel(event.target);
        Firebug.MemoryBug.Profiler.profile(panel.context);
    }
});

// ************************************************************************************************

/**
 * @domplate This template is used for displaying memory profiling results.
 */
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
                            SPAN({"class": "url" },
                                "$line|getUrl"
                            ),
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

    getUrl: function(line)
    {
        return getFileName(line.url);
    },

    getTitle: function(line)
    {
        var text = [];
        for (var desc in line.descriptions)
            text.push(line.descriptions[desc] + "x " + desc);
        return text.join("\n");
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
        for (var object in winInfo.objects)
        {
            var object = winInfo.objects[object];
            lines.push.apply(lines, [l for each (l in object.lines)]);
        }

        for (var i=0; i<lines.length; i++)
        {
            var line = lines[i];
            try
            {
                line.source = panel.context.sourceCache.getLine(line.url, line.number);
            }
            catch (e)
            {
                if (FBTrace.DBG_MEMORYBUG || FBTrace.DBG_ERRORS)
                    FBTrace.sysout("memorybug.initBody; EXCEPTION " + e, e);
            }
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
// Registration

Firebug.registerPanel(Firebug.MemoryBug.Panel);
Firebug.registerStringBundle("chrome://memorybug/locale/memorybug.properties");
Firebug.registerModule(Firebug.MemoryBug);

// ************************************************************************************************
}});
