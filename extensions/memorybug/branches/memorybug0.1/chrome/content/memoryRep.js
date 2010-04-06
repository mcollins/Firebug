/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Memory Report Template Implementation

Firebug.MemoryBug.TreeView = domplate(Firebug.Rep,
{
    provider: null,

    tag:
        TABLE({"class": "treeView", cellpadding: 0, cellspacing: 0,
            _repObject: "input",
            onclick: "$onClick"},
            TBODY({"class": "treeViewBody", style: "width: 100%"},
                FOR("member", "$input|memberIterator",
                    TAG("$member|getRowTag", {member: "$member"}))
            )
        ),

    rowTag:
        TR({"class": "viewRow $member.type\\Row",
            _repObject: "$member",
            $hasChildren: "$member.hasChildren"},
            TD({"class": "viewCol label"},
                DIV({"class": "viewLabel"}, "$member.name")
            ),
            TD({"class": "viewCol value"},
                TAG("$member.tag", {object: "$member.value"})
            )
        ),

    bodyTag:
        TR({"class": "viewRow", _repObject: "$member"},
            TD({"class": "infoBody", colspan: "400"})
        ),

    loop:
        FOR("member", "$members",
            TAG("$member|getRowTag", {member: "$member"})),

    memberIterator: function(input)
    {
        return this.getMembers(input);
    },

    getRowTag: function(member)
    {
        return this.rowTag;
    },

    onClick: function(event)
    {
        if (!isLeftClick(event))
            return;

        if (!hasClass(event.target, "viewLabel"))
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

        toggleClass(row, "opened");
        if (hasClass(row, "opened"))
        {
            var bodyRow = this.bodyTag.insertRows({member: member}, row)[0];
            this.initBody(member, bodyRow.querySelector(".infoBody"));
        }
        else
        {
            var bodyRow = row.nextSibling;
            row.parentNode.removeChild(bodyRow);
        }
    },

    initBody: function(member, body)
    {
        member.bodyTemplate.tag.replace({input: member.object}, body,
            member.bodyTemplate);
    },

    getMembers: function(object)
    {
        var members = [];

        var children = this.provider.getChildren(object);
        for (var p in children)
        {
            var child = children[p];
            var hasChildren = this.provider.hasChildren(child);
            var label = this.provider.getLabel(child);
            var value = this.provider.getValue(child);
            var tag = value ? this.provider.getValueTag(value, "value") : null;
            var bodyTemplate = this.provider.getBodyTemplate(child);

            members.push({
                name: label,
                object: child,
                value: value,
                rowClass: "memberRow",
                hasChildren: hasChildren,
                tag: tag,
                type: "",
                bodyTemplate: bodyTemplate,
            });
        }

        return members;
    },

    render: function(provider, parent)
    {
        this.provider = provider;
        return this.tag.replace({input: provider.getInput()}, parent, this);
    }
});

// ************************************************************************************************
// Table View

Firebug.MemoryBug.TableView = domplate(Firebug.MemoryBug.TreeView,
{
    tag:
        TABLE({"class": "tableView", cellpadding: 0, cellspacing: 0,
            onclick: "$onClick", _repObject: "$input"},
            TBODY({"class": "tableViewBody"},
                TAG("$input|getHeaderTag", {member: "$input|getFirstMember"}),
                FOR("member", "$input|memberIterator",
                    TAG("$member|getRowTag", {member: "$member"}
                )
            )
        )
    ),

    headerTag:
        TR({"class": "viewHeaderRow"},
            FOR("col", "$member|getColumnDesc",
                TH({width: "$col|getColWidth"}, DIV("$col.title"))
            )
        ),

    rowTag:
        TR({"class": "viewRow", _repObject: "$member",
            $hasChildren: "$member.hasChildren"},
            FOR("object", "$member|getColumnValues",
                TD({"class": "viewCol"},
                    TAG("$object|getValueTag", {object: "$object.label"})
                )
            )
        ),

    valueTag: 
        DIV({"class": "viewLabel", title: "$object"}, "$object"),

    getColWidth: function(col)
    {
        return (col.width) ? col.width: "";
    },

    getFirstMember: function(input)
    {
        var members = this.memberIterator(input);
        return members[0];
    },

    getHeaderTag: function(input)
    {
        return this.headerTag;
    },

    getColumnDesc: function(member)
    {
        return this.provider.getColumnDesc(member.object);
    },

    getColumnValues: function(member)
    {
        var result = [];
        var cols = this.provider.getColumnDesc(member.object);
        for (var i=0; i<cols.length; i++)
        {
            var label = this.provider.getLabel(member.object, cols[i].id);
            var valueTag = this.provider.getValueTag(label, cols[i].id);
            result.push({label:label, valueTag: valueTag});
        }
        return result;
    },

    getValueTag: function(object)
    {
        if (object.valueTag)
            return object.valueTag;
        return this.valueTag;
    }
});

// ************************************************************************************************
}});
