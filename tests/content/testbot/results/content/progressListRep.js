/* See license.txt for terms of usage */

CDB.ns(function() { with (CDB) { with (Domplate) {

// ************************************************************************************************

/**
 * @domplate Expandable list of progress messages for specified test.
 * @param {Object} object The parent test object.
 */
CDB.Reps.ProgressList = domplate(Reps.Rep,
{
    tag:
        DIV({"class": "progressList", onclick: "$onClick",
            $hasProgress: "$object|hasProgress",
            _repObject: "$object"},
            TAG("$CDB.Reps.Link.tag", {object: "$object"})
        ),

    bodyTag:
        DIV({"class": "progressBody"},
            FOR("message", "$object.progress|getMessages",
                DIV("$message")
            )
        ),

    getMessages: function(progress)
    {
        var reSplitLines = /.*(:?\r\n|\n|\r)?/mg;
        return progress.match(reSplitLines);
    },

    hasProgress: function(object)
    {
        return object.progress ? true : false;
    },

    onClick: function(event)
    {
        var e = fixEvent(event);
        if (!isLeftClick(e))
            return;

        if (hasClass(e.target, "objectLink"))
            return;

        var node = getAncestorByClass(e.target, "progressList");
        if (node)
        {
            this.toggle(node);
            cancelEvent(e);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    toggle: function(parentNode, forceOpen)
    {
        var opened = hasClass(parentNode, "opened");
        if (opened && forceOpen)
            return;

        toggleClass(parentNode, "opened");
        if (hasClass(parentNode, "opened"))
        {
            this.bodyTag.append({object: parentNode.repObject}, parentNode)[0];
        }
        else
        {
            var body = parentNode.lastChild;
            parentNode.removeChild(body);
        }
    }
});

// ************************************************************************************************
}}});
