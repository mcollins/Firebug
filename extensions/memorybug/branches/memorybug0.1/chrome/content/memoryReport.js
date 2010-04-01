/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// ************************************************************************************************
// Data Provider

Firebug.MemoryBug.ReportProvider = function(input)
{
    this.data = input;

    this.input = {};

    // List of native classes
    this.input.nativeClasses = {
        type: "nativeclasses",
        children: input.nativeClasses,
    };

    // List of objects.
    this.input.objects = {
        type: "objects",
        children: input.objects,
    };

    // List of functions.
    this.input.functions = {
        type: "functions",
        children: input.functions,
    };

/*    this.input.summary = {
        type: "summary",
        children: [this.input.nativeClasses, this.input.objects, this.input.functions],
    }
*/
    this.input.type = "summary";
    this.input.children = [this.input.nativeClasses, this.input.objects, this.input.functions];
}

Firebug.MemoryBug.ReportProvider.prototype =
{
    getInput: function()
    {
        return this.input;
    },

    hasChildren: function(object)
    {
        var children = this.getChildren(object);
        for (var name in children)
            return true;

        return false;
    },

    getChildren: function(object)
    {
        if (object.children)
            return object.children;

        var children = [];
        if (object.type == "object")
        {
            for (p in object.value)
            {
                var child = {name: p, value: object.value[p]};
                if (typeof(child.value) == "object")
                    child.type = "object";
                children.push(child);
            }
        }

        return children;
    },

    getLabel: function(object, colId)
    {
        if (object.type == "summary")
            return this.data.startTime.toLocaleString();// + " - " + this.data.title;
        else if (object.type == "nativeclasses")
            return "Native Classes";
        else if (object.type == "objects")
            return "Objects";
        else if (object.type == "functions")
            return "Functions";

        if (object.type == "object")
        {
            if (colId == "name")
                return object.name;
            else if (colId == "size")
                return object.info ? object.info.size : "?";
            else if (colId == "constructor")
            {
                if (object.info && object.info.prototype &&
                    object.info.prototype.children.length == 1)
                {
                    var info = object.info.prototype.children[0]
                    return new SourceLink(info.filename, info.lineStart, "js");
                }
            }
        }

        if (object.type == "nativeclass")
        {
            if (colId == "name")
                return object.name;
            else if (colId == "count")
                return object.count;
        }

        if (object.type == "function")
        {
            if (colId == "name")
                return object.name;
            else if (colId == "referents")
                return object.info.referents ? object.info.referents.length : "?";
            else if (colId == "size")
                return object.info.size;
        }

        return object.name;
    },

    getValue: function(object)
    {
        if (object.type == "object")
            return object.value;

        return null;
    },

    getValueTag: function(object, colId)
    {
        if (object instanceof SourceLink)
        {
            var rep = Firebug.getRep(object);
            return rep.shortTag ? rep.shortTag : rep.tag;
        }

        return null;
    },

    getBodyTemplate: function(object)
    {
        if (object.type == "objects" ||
            object.type == "nativeclasses" ||
            object.type == "functions")
        {
            Firebug.MemoryBug.TableView.provider = this;
            return Firebug.MemoryBug.TableView;
        }

        return Firebug.MemoryBug.TreeView;
    },

    getColumnDesc: function(object)
    {
        if (object.type == "object")
        {
            return [
                {id: "name", title: "Name"},
                {id: "size", title: "Size"},
                {id: "constructor", title: "Constructor"}
            ];
        }

        if (object.type == "nativeclass")
        {
            return [
                {id: "name", title: "Name"},
                {id: "count", title: "Count"}
            ];
        }

        if (object.type == "function")
        {
            return [
                {id: "name", title: "Name"},
                {id: "size", title: "Size"},
                {id: "referents", title: "Referents"}
            ];
        }

        return [];
    }
};

// ************************************************************************************************
}});
