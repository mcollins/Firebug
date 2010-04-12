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
            FirebugReps.OBJECTLINK({onclick: "$onClickName"},
                SPAN({"class": "name"}, "$object|getName")
            ),
            FirebugReps.OBJECTLINK({onclick: "$onClickPropName"},
                SPAN({"class": "propName noTooltip"}, "$object|getPropName")
            )
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

    onClickName: function(event)
    {
        var link = getAncestorByClass(event.target, "objectLink-memoryLink");
        if (!link)
            return;

        link = link.repObject;
        var selection = new Firebug.MemoryBug.Selection(link.refInfo.value);
        Firebug.chrome.select(selection, "memory", null, true);
        cancelEvent(event);
    },

    onClickPropName: function(event)
    {
        var link = getAncestorByClass(event.target, "objectLink-memoryLink");
        if (!link)
            return;

        link = link.repObject;
        var selection = new Firebug.MemoryBug.Selection(link.refInfo.value[link.propName]);
        Firebug.chrome.select(selection, "memory", null, true);
        cancelEvent(event);
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
});

// ************************************************************************************************

Firebug.MemoryBug.Selection = function(object)
{
    this.object = object;
}

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

