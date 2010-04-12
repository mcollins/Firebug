/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Memory Report Template

/**
 * @domplate: Template for memory report. This template is used to generate Memory panel UI.
 * The main memory panel UI is composed from a table displaying all global objects on the page
 * (including all innner frames). Every object is expandeble (similarly to the DOM panel showing
 * its childreng. There is a size info and list of referents for each object,
 * see {@link Firebug.MemoryBug.Referents}.
 */
Firebug.MemoryBug.ReportView = domplate(Firebug.Rep,
/** @lends Firebug.MemoryBug.ReportView */
{
    tag:
        TABLE({"class": "tableView reportView", cellpadding: 0, cellspacing: 0,
            onclick: "$onClick", _repObject: "$input"},
            TBODY({"class": "tableViewBody"},
                TR({"class": "viewHeaderRow"},
                    TH(DIV($STR("memorybug.report.col.Name"))),
                    TH(DIV($STR("memorybug.report.col.Size"))),
                    TH({width: "20%"},
                        DIV($STR("memorybug.report.col.Value"))
                    ),
                    TH(DIV($STR("memorybug.report.col.Constructor"))),
                    TH({width: "80%"},
                        DIV($STR("memorybug.report.col.References"))
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
            TD({"class": "viewCol sizeCol"},
                SPAN({"class": "viewLabel byteSize"}, "$member|getByteSize"),
                SPAN({"class": "viewLabel"}, "$member|getSizeEx")
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
        var table = this.tag.replace({input: input}, parent, this);

        // Insert root rows.
        var members = this.getRootMembers(input);
        this.insertRows(members, table.firstChild.firstChild);

        return table;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    getByteSize: function(member)
    {
        return member.info ? formatSize(member.info.size) : "";
    },

    getSizeEx: function(member)
    {
        if (typeof(member.value) == "string")
            return "(chars=" + member.value.length + ")";

        if (!member.info)
            return "";

        if (FirebugReps.Arr.isArray(member.value))
        {
            var length = member.value.length;
            return (length > 0) ? "(length=" + length + ")" : "";
        }
        else if (typeof(member.value) === "object")
        {
            var count = this.countProperties(member.value);
            return (count > 0) ? "(props=" + count + ")" : "";
        }

        return "";
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

        if (member.value == null)
            return FirebugReps.Null.tag;

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
            return this.insertRows(members, row);
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

    insertRows: function(members, lastRow)
    {
        var firstRow = this.loop.insertRows({members: members}, lastRow)[0];
        var row = firstRow;
        for (var i=0; i<members.length; i++)
        {
            members[i].row = row;
            row = row.nextSibling;
        }
        return firstRow;
    },

    getRootMembers: function(input)
    {
        var members = [];
        for (var p in input.globals)
        {
            var object = input.globals[p];
            members.push(this.createMember(object, object.name, object.value, object.info, 0));
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

            members.push(this.createMember(member.value, p, object,
                objectInfo ? objectInfo.info : null, level));
        }
        return members;
    },

    createMember: function(parent, name, value, info, level)
    {
        var hasChildren = this.hasProperties(value);
        var member = new Firebug.MemoryBug.Member();
        member.parent = parent;
        member.name = name;
        member.value = value;
        member.info = info;
        member.hasChildren = hasChildren;
        member.level = level;
        member.indent = level*16;
        return member;
    },

    hasProperties: function(object)
    {
        if (typeof(object) != "object")
            return false;

        // Use the lib function.
        return hasProperties(object);
    },

    countProperties: function(o)
    {
        try
        {
            var n = 0;
            for (var p in o)
                n += Object.prototype.hasOwnProperty.call(o, p);
            return n;
        }
        catch (exc)
        {
            
        }
        return -1;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    supportsObject: function(object, type)
    {
        return object instanceof Firebug.MemoryBug.Member;
    },

    getRealObject: function(object, context)
    {
        return object.value;
    },
});

// ************************************************************************************************

Firebug.MemoryBug.Member = function()
{
    
}

// ************************************************************************************************

/**
 * @domplate This template shows a list of referents (links) to specific object.
 */
Firebug.MemoryBug.Referents = domplate(Firebug.Rep,
/** @lends Firebug.MemoryBug.Referents */
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

            //if (member.parent == refInfo.value)
            //    continue;

            // Iterate the referent object to find out what is the property pointing
            // to the object in inspection.
            //xxxHonza: What if there is more fields in the referent pointing to us? 
            var propName;
            if (refInfo)
            {
                // Skip the parent object
                if (member.value === refInfo.value)
                    continue;

                try
                {
                    for (var p in refInfo.value)
                    {
                        if (refInfo.value[p] == member.value)
                        {
                            propName = p;
                            break;
                        }
                    }
                }
                catch (e)
                {
                    return refs;
                }
            }

            refs.push({
                tag: refInfo ? FirebugReps.MemoryLink.tag : SPAN("$object.name"),
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
// Registration

Firebug.registerRep(Firebug.MemoryBug.ReportView);

// ************************************************************************************************
}});
