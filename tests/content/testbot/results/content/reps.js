/* See license.txt for terms of usage */

CDB.Reps = CDB.ns(function() { with (CDB) { with (Domplate) {

// ************************************************************************************************

this.Rep = domplate(
{
    className: "",
    inspectable: true,

    supportsObject: function(object, type)
    {
        return false;
    },

    inspectObject: function(object, context)
    {
        context.chrome.select(object);
    },

    browseObject: function(object, context)
    {
    },

    persistObject: function(object, context)
    {
    },

    getRealObject: function(object, context)
    {
        return object;
    },

    getTitle: function(object)
    {
        if (jQuery.isArray(object))
            return "Array";

        var label = object.toString();

        var re = /\[object (.*?)\]/;
        var m = re.exec(label);
        return m ? m[1] : label;
    },

    getTooltip: function(object)
    {
        return null;
    },

    getContextMenuItems: function(object, target, context)
    {
        return [];
    },

    // Convenience for domplates
    STR: function(name)
    {
        return $STR(name);
    },

    cropString: function(text)
    {
        return cropString(text);
    },

    toLowerCase: function(text)
    {
        return text ? text.toLowerCase() : "";
    },

    plural: function(n)
    {
        return n == 1 ? "" : "s";
    }
});

var OBJECTBOX = this.OBJECTBOX =
    SPAN({"class": "objectBox objectBox-$className", role : "presentation"});

var OBJECTLINK = this.OBJECTLINK =
    A({
        "class": "objectLink objectLink-$className a11yFocus",
        _repObject: "$object"
    });

this.String = domplate(this.Rep,
{
    tag:
        OBJECTBOX("$object"),

    className: "string",

    supportsObject: function(object, type)
    {
        return type == "string";
    }
});

this.Link = domplate(this.Rep,
{
    className: "link",

    tag:
        OBJECTLINK({href: "$object|getTargetUrl"}, "$object|getTitle"),

    getTargetUrl: function(object)
    {
        //xxxHonza: the test list base path should be pulled out from the database.
        var version = object.Firebug.substr(0, 3);
        return "https://getfirebug.com/tests/content/branches/" + version +
            "/" + this.getTitle(object);
    },

    getTitle: function(object)
    {
        return object.file + "";
    }
});

// ************************************************************************************************
}}});
