/* See license.txt for terms of usage */

define(function(require, exports, module) {

// ********************************************************************************************* //
// Imports

var Lib = require("lib").Lib;
var Domplate = require("domplate").Domplate;
var FBTrace = require("firebug-trace").FBTrace;

// ********************************************************************************************* //

function DomTree(input)
{
    this.input = input;
}

/**
 * @domplate Represents a tree of properties/objects
 */
with (Domplate) {
DomTree.prototype = domplate(
/** @lends DomTree */
{
    tag:
        TABLE({"class": "hmDomTable", cellpadding: 0, cellspacing: 0, onclick: "$onClick"},
            TBODY(
                FOR("member", "$object|memberIterator", 
                    TAG("$member|getRowTag", {member: "$member"}))
            )
        ),

    rowTag:
        TR({"class": "hmMemberRow $member.open $member.type\\Row",
            $hasChildren: "$member|hasChildren",
            _repObject: "$member", level: "$member.level"},
            TD({"class": "hmMemberLabelCell", style: "padding-left: $member.indent\\px"},
                SPAN({"class": "hmMemberLabel $member.type\\Label"}, "$member.name")
            ),
            TD({"class": "hmMemberValueCell"},
                TAG("$member.tag", {object: "$member.value"})
            )
        ),

    valueTag:
        SPAN({"class": "objectTitle"}, "$object|getTitle"),

    loop:
        FOR("member", "$members", 
            TAG("$member|getRowTag", {member: "$member"})),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    hasChildren: function(object)
    {
        return object.hasChildren ? "hasChildren" : "";
    },

    memberIterator: function(object)
    {
        return this.getMembers(object);
    },

    getRowTag: function(member)
    {
        return this.rowTag;
    },

    getTitle: function(object)
    {
        var label = safeToString(object);

        var re = /\[object (.*?)\]/;
        var m = re.exec(label);
        return m ? m[1] : label;
    },

    onClick: function(event)
    {
        var e = Lib.eventFix(event || window.event);
        if (!Lib.isLeftClick(e))
            return;

        var row = Lib.getAncestorByClass(e.target, "hmMemberRow");
        var label = Lib.getAncestorByClass(e.target, "hmMemberLabel");
        if (label && Lib.hasClass(row, "hasChildren"))
            this.toggleRow(row);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    toggleRow: function(row)
    {
        var level = parseInt(row.getAttribute("level"));

        if (Lib.hasClass(row, "opened"))
        {
            Lib.removeClass(row, "opened");

            var tbody = row.parentNode;
            for (var firstRow = row.nextSibling; firstRow; firstRow = row.nextSibling)
            {
                if (parseInt(firstRow.getAttribute("level")) <= level)
                    break;
                tbody.removeChild(firstRow);
            }
        }
        else
        {
            Lib.setClass(row, "opened");

            var repObject = row.repObject;
            if (repObject)
            {
                var members = this.getMembers(repObject.value, level+1);
                if (members && members.length)
                    this.loop.insertRows({members: members}, row);
            }
        }
    },

    getMembers: function(object, level)
    {
        if (!level)
            level = 0;

        var members = [];
        for (var p in object)
        {
            try
            {
                var propObj = object[p];
                if (typeof(propObj) != "function"/* && typeof(propObj) != "number"*/)
                    members.push(this.createMember("dom", p, propObj, level));
            }
            catch (err)
            {
            }
        }

        FBTrace.sysout("DomTree.getMembers; " + (members ? members.length : -1));

        return members;
    },

    createMember: function(type, name, value, level)
    {
        var valueType = typeof(value);
        var hasChildren = this.hasProperties(value) && (valueType == "object");

        return {
            name: name,
            value: value,
            type: type,
            rowClass: "hmMemberRow-" + type,
            open: "",
            level: level,
            indent: level*16,
            hasChildren: hasChildren,
            tag: this.valueTag
        };
    },

    hasProperties: function(ob)
    {
        try
        {
            for (var p in ob)
            {
                var propObj = ob[p];
                if (typeof(propObj) != "function")
                    return true;
            }
        }
        catch (exc)
        {
        }
        return false;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Public

    append: function(parentNode)
    {
        return this.tag.append({object: this.input}, parentNode);
    }
})}

// ********************************************************************************************* //
// Helpers

function safeToString(ob)
{
    try
    {
        return ob.toString();
    }
    catch (exc)
    {
        return "";
    }
}

// ********************************************************************************************* //

exports.DomTree = DomTree;

// ********************************************************************************************* //
});
