/* See license.txt for terms of usage */

CDB.ns(function() { with (CDB) { with (Domplate) {

// ************************************************************************************************

CDB.Reps.GroupList = domplate(CDB.Rep,
{
    tag:
        TABLE({"class": "groupTable", cellpadding: 0, cellspacing: 0, onclick: "$onClick"},
            TBODY(
                FOR("group", "$rows",
                    TR({"class": "testGroupRow", _repObject: "$group"},
                        TD({"class": "groupName testGroupCol"},
                            SPAN({"class": "testGroupName"},
                                "$group|getGroupName"
                            )
                        ),
                        TD({"class": "testGroupCol"},
                            SPAN({"class": "testGroupCount"},
                                "$group|getGroupCount"
                            )
                        ),
                        TD({"class": "testGroupCol"},
                            SPAN({"class": "testGroupInfo",
                                /*title: "$group|getGroupTooltip"*/},
                                "$group|getGroupInfo"
                            )
                        ),
                        TD({"class": "testGroupCol"},
                            A({"class": "groupLink", href: "$group|getPermaLink"},
                                "[...]"
                            )
                        )
                    )
                )
            )
        ),

    groupBodyTag:
        TR({"class": "groupBodyRow", _repObject: "$group"},
            TD({"class": "groupBodyCol", colspan: 4},
                DIV({"class": "groupBodyDefault"})
            )
        ),

    getGroupName: function(group)
    {
        var date = new Date(group.value.doc['Export Date']);
        return date.toLocaleString();
    },

    getGroupCount: function(group)
    {
        var count = group.value.failures;
        if (count == 0)
            return "";

        var doc = group.value.doc;

        // xxxHonza: localization
        var label = (count > 1) ? "failures" : "failure";
        return "(" + count + " " + label + " of " + 
            doc['Total Tests'] + ")";
    },

    getGroupInfo: function(group)
    {
        var doc = group.value.doc;
        return "Firebug " + doc['Firebug'] + ", " +
            doc['App Name'] + " " + doc['App Version'] + ", " +
            doc['OS Name'];
    },

    getGroupTooltip: function(group)
    {
        var doc = group.value.doc;
        return doc['App Platform'] + ", " +
            doc['App Build ID'] + ", " +
            doc['Locale'] + ", " +
            doc['OS Name'] + " " + doc["OS Version"] + 
            ", FBTest " + doc['FBTest'];
    },

    getPermaLink: function(group)
    {
        return "?headerid=" + group.value.doc._id;
    },

    onClick: function(event)
    {
        var e = fixEvent(event);
        if (!isLeftClick(e))
            return;

        if (hasClass(e.target, "groupLink"))
            return;

        var row = getAncestorByClass(e.target, "testGroupRow");
        if (row)
        {
            this.toggleRow(row);
            cancelEvent(e);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    expandGroup: function(row)
    {
        if (hasClass(row, "testGroupRow"))
            this.toggleRow(row, true);
    },

    collapseGroup: function(row)
    {
        if (hasClass(row, "testGroupRow") && hasClass(row, "opened"))
            this.toggleRow(row);
    },

    toggleRow: function(row, forceOpen)
    {
        var opened = hasClass(row, "opened");
        if (opened && forceOpen)
            return;

        toggleClass(row, "opened");
        if (hasClass(row, "opened"))
        {
            var group = row.repObject;
            var infoBodyRow = this.groupBodyTag.insertRows({group: group}, row)[0];
            infoBodyRow.repObject = group;
            this.initBody(infoBodyRow);
        }
        else
        {
            var infoBodyRow = row.nextSibling;
            row.parentNode.removeChild(infoBodyRow);
        }
    },

    initBody: function(infoBodyRow)
    {
        var group = infoBodyRow.repObject;
        var parentNode = infoBodyRow.firstChild;

        // Asynchronous request for data.
        FirebugDB.getGroupResults(group.value.doc._id, function(data)
        {
            //xxxHonza localization
            var table = new Reps.Table([
                {property: "value.file", label: "Test", rep: Reps.Link},
                {property: "value.result", label: "Error"},
                {property: "value.description", label: "Description"}
            ], {maxHeight: 150});

            table.render(data, infoBodyRow.firstChild);
        });
    },

    render: function(rows, parentNode)
    {
        this.tag.replace({rows: rows}, parentNode, this);
    }
});

// ************************************************************************************************
}}});
