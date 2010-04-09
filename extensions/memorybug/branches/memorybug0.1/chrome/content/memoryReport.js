/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Memory Report Template

/**
 * @domplate: Template for memory report. This template is used to generate Memory panel UI.
 */
Firebug.MemoryBug.ReportView = domplate(Firebug.Rep,
{
    tag:
        TABLE({"class": "tableView reportView", cellpadding: 0, cellspacing: 0,
            onclick: "$onClick", _repObject: "$input"},
            TBODY({"class": "tableViewBody"},
                TR({"class": "viewHeaderRow"},
                    TH(DIV($STR("memorybug.report.col.Name"))),
                    TH(DIV($STR("memorybug.report.col.Size"))),
                    TH(DIV($STR("memorybug.report.col.Value"))),
                    TH(DIV($STR("memorybug.report.col.Constructor"))),
                    TH({width: "100%"},
                        DIV($STR("memorybug.report.col.References"))
                    )
                ),
                FOR("member", "$input|rootIterator",
                    TAG("$rowTag", {member: "$member"}
                )
            )
        )
    ),

    rowTag:
        TR({"class": "viewRow", _repObject: "$member",
            $hasChildren: "$member.hasChildren",
            level: "$member.level"},
            TD({"class": "viewCol", style: "padding-left: $member.indent\\px"},
                DIV({"class": "viewLabel"},
                    SPAN({"class": "labelName"}, "$member.name")
                )
            ),
            TD({"class": "viewCol"},
                DIV({"class": "viewLabel"}, "$member|getSize")
            ),
            TD({"class": "viewCol"},
                DIV({"class": "viewLabel"},
                    TAG("$member|getValueTag", {object: "$member|getValue"})
                )
            ),
            TD({"class": "viewCol"},
                DIV({"class": "viewLabel"},
                    TAG("$member|getCtorTag", {object: "$member|getCtorObject"})
                )
            ),
            TD({"class": "viewCol"},
                DIV({"class": "viewLabel"},
                    TAG("$member|getRefsTag", {member: "$member"})
                )
            )
        ),

    getRefsTag: function()
    {
        Firebug.MemoryBug.Referents.input = this.input;
        return Firebug.MemoryBug.Referents.tag;
    },

    typeNameTag:
        DIV("$object"),

    loop:
        FOR("member", "$members",
            TAG("$rowTag", {member: "$member"})),

    refsTag:
        DIV({"class": "referents", _repObject: "$member"},
            FOR("item", "$member|refsIterator",
                TAG("$item.tag", {object: "$item.object"}),
                SPAN({"class": "arrayComma"}, "$item.delim")
            )
        ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    render: function(input, parent)
    {
        this.input = input;
        return this.tag.replace({input: input}, parent, this);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    getSize: function(member)
    {
        return member.info ? formatSize(member.info.size) : "";
    },

    getCtorTag: function(member)
    {
        var ctor = member.info ? member.info.ctor : null;
        if (ctor && ctor.filename && ctor.lineStart)
            return FirebugReps.Func.tag;

        // There is no user conctructor so, display the native type.
        return this.typeNameTag;
    },

    getCtorObject: function(member)
    {
        var ctor = member.info ? member.info.ctor : null;
        if (ctor && ctor.filename && ctor.lineStart)
            return this.input.getMember(ctor.id).value;

        if (member.value instanceof Array)
            return "array";
        else if (member.value instanceof String)
            return "string";

        return typeof(member.value);
    },

    getValueTag: function(member)
    {
        if (typeof(member.value) != "object")
        {
            var rep = Firebug.getRep(member.value);
            return rep.shortTag ? rep.shortTag : rep.tag;
        }

        return FirebugReps.Nada.tag;
    },

    getValue: function(member)
    {
        var objectInfo = this.input.findMember(member.value);
        if (!objectInfo)
            return member.value;
        return null;
    },

    onClick: function(event)
    {
        if (!isLeftClick(event))
            return;

        if (!hasClass(event.target, "viewLabel") &&
            !hasClass(event.target, "labelName"))
            return;

        var row = getAncestorByClass(event.target, "viewRow");
        if (hasClass(row, "hasChildren"))
        {
            this.toggleRow(row);
            cancelEvent(event);
        }
    },

    toggleRow: function(row)
    {
        var member = row.repObject;
        if (!member)
            return;

        var level = parseInt(row.getAttribute("level"));
        var table = getAncestorByClass(row, "tableView");

        toggleClass(row, "opened");
        if (hasClass(row, "opened"))
        {
            var members = this.getMembers(member, level+1);
            this.loop.insertRows({members: members}, row)[0];
        }
        else
        {
            var tbody = row.parentNode;
            for (var firstRow = row.nextSibling; firstRow; firstRow = row.nextSibling)
            {
                if (parseInt(firstRow.getAttribute("level")) <= level)
                    break;
                tbody.removeChild(firstRow);
            }
        }
    },

    rootIterator: function(input)
    {
        var members = [];
        for (var p in input.globals)
        {
            var object = input.globals[p];
            var hasChildren = this.hasProperties(object.value);
            members.push({
                name: object.name,
                value: object.value,
                info: object.info,
                hasChildren: hasChildren,
                level: 0,
                indent: 0,
            });
        }
        return members;
    },

    getMembers: function(member, level)
    {
        var members = [];
        for (var p in member.value)
        {
            var object = member.value[p];
            var objectInfo = this.input.findMember(object);

            if (objectInfo && object !== objectInfo.value)
            {
                if (FBTrace.DBG_ERRORS)
                    FBTrace.sysout("memorybug.ReportView.getMembers; ERROR wrong object found!");
            }

            var hasChildren = this.hasProperties(object);
            members.push({
                name: p,
                value: object,
                info: objectInfo ? objectInfo.info : null,
                hasChildren: hasChildren,
                level: level,
                indent: level*16,
            });
        }
        return members;
    },

    hasProperties: function(object)
    {
        if (typeof(object) != "object")
            return false;

        // Use the lib function.
        return hasProperties(object);
    },
});

// ************************************************************************************************

Firebug.MemoryBug.Referents = domplate(Firebug.Rep,
{
    tag:
        DIV({"class": "referents", _repObject: "$member"},
            FOR("item", "$member|refsIterator",
                TAG("$item.tag", {object: "$item.object"}),
                SPAN(" ")
            )
        ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    refsIterator: function(member)
    {
        var refs = [];
        if (!member.info)
            return refs;

        for (var p in member.info.referents)
        {
            var ref = member.info.referents[p];
            if (ref.nativeClass == "XPCSafeJSObjectWrapper")
                continue;

            var refInfo = this.input.getMember(ref.id);

            // Iterate the referent object to find out what is the property pointing
            // to the object in inspection.
            //xxxHonza: What if there is more fields in the referent pointing to us? 
            var propName;
            if (refInfo) {
                for (var p in refInfo.value) {
                    if (refInfo.value[p] == member.value) {
                        propName = p;
                        break;
                    }
                }
            }

            refs.push({
                tag: refInfo ? FirebugReps.MemoryLink.tag : DIV("$object.name"),
                name: refInfo ? refInfo.name : "unknown",
                object: refInfo ? new Firebug.MemoryBug.MemoryLink(refInfo, propName) : member,
            });
        }

        // There is no delimiter after the last item in the array.
        if (refs.length)
            refs[refs.length-1].delim = "";

        return refs;
    },
});

// ************************************************************************************************
}});
