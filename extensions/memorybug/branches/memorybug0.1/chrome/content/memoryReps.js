/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Memory Link

FirebugReps.MemoryLink = domplate(FirebugReps.SourceLink,
{
    tag:
        SPAN(
            FirebugReps.OBJECTLINK(
                SPAN({"class": "name"}, "$object|getName")
            ),
            SPAN({"class": "propName"}, "$object|getPropName")
        ),

    getName: function(sourceLink)
    {
        return sourceLink.getName();
    },

    getPropName: function(sourceLink)
    {
        return sourceLink.getPropName();
    },

    getTooltip: function(sourceLink)
    {
        var value = sourceLink.refInfo.value;
        var text = "";
        for (var p in value)
            text += p + ": " + value[p] + "\n";
        return text;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    className: "memoryLink",

    supportsObject: function(object, type)
    {
        return object instanceof Firebug.MemoryBug.MemoryLink;
    },

    inspectObject: function(sourceLink, context)
    {
        return Firebug.chrome.select(sourceLink);
    },

    getContextMenuItems: function(sourceLink, target, context)
    {
        return [];
    },

    getRealObject: function(object, context)
    {
        return object.refInfo.value;
    },
});

// ************************************************************************************************

Firebug.MemoryBug.MemoryLink = function(info, propName)
{
    this.refInfo = info;
    this.propName = propName;
}

Firebug.MemoryBug.MemoryLink.prototype =
{
    getName: function()
    {
        return this.refInfo.name;
    },

    getPropName: function()
    {
        return Firebug.MemoryBug.Props.getPropName(this.refInfo.value, this.propName);
    }
}

// ************************************************************************************************
// Registration

Firebug.registerRep(FirebugReps.MemoryLink);

// ************************************************************************************************
}});

