/* See license.txt for terms of usage */

CDB.ns(function() { with (CDB) { with (Domplate) {

/*************************************************************************************************/

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
                            ),
                            SPAN({"class": "testGroupCount"},
                                "$group|getGroupCount"
                            )
                        )
                    )
                )
            )
        ),

    groupBodyTag:
        TR({"class": "groupBodyRow", _repObject: "$group"},
            TD({"class": "groupBodyCol", colspan: 1},
                DIV({"class": "groupBodyDefault"})
            )
        ),

    getGroupName: function(group)
    {
        var date = new Date(group.key[1]);
        return date.toLocaleString();
    },

    getGroupCount: function(group)
    {
        // xxxHonza: localization
        if (group.value == 0)
            return "";
        else if (group.value == 1)
            return "(" + group.value + " fails)";
        else
            return "(" + group.value + " fail)";
    },

    onClick: function(event)
    {
        var e = $.event.fix(event);
        if (isLeftClick(e))
        {
            var row = getAncestorByClass(e.target, "testGroupRow");
            if (row)
            {
                this.toggleRow(row);
                cancelEvent(e);
            }
        }
    },

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
        FirebugDB.getGroupResults(group.key[0], function(data)
        {
            //xxxHonza localization
            Reps.TableRep.render(data, infoBodyRow.firstChild, [
                {property: "value.file", label: "Test", rep: Reps.Link},
                {property: "value.result", label: "Error"},
                {property: "value.description", label: "Description"}
            ]);
        });
    },

    render: function(rows, parentNode)
    {
        this.tag.replace({rows: rows}, parentNode, this);
    }
});

/*************************************************************************************************/
}}});
