/* See license.txt for terms of usage */

CDB.ns(function() { with (CDB) { with (Domplate) {

// ************************************************************************************************

/**
 * @module This object represents the application.
 */
CDB.Main = extend(CDB.Module,
{
    initialize: function()
    {
        // Preload twisty image to make UX better (it's there immediately after expanding).
        //xxxHonza: this doesn't seem to work.
        this.image1 = new Image(11, 11);
        this.image1.src = "style/twistyOpen.png";

        var content = document.getElementById("testResults");
        var headerID = getURLParameter("headerid");
        var userHeaderID = getURLParameter("userheaderid");
        if (headerID)
        {
            this.GroupView.render(headerID, "header", content);
        }
        else if (userHeaderID)
        {
            this.GroupView.render(userHeaderID, "user-header", content);
        }
        else
        {
            var defaultTab = "Home";
            if (window.location.hash)
                defaultTab = window.location.hash.substring(1);

            // Render basic page content (tab view) and select the Input tab by default.
            var tabViewNode = this.TabView.render(content);
            this.TabView.selectTabByName(tabViewNode, defaultTab);
        }
    }
});

// ************************************************************************************************

/**
 * Domplate template for the main tabbed UI.
 */
CDB.Main.TabView = domplate(CDB.Reps.TabView,
{
    limitTag:
        DIV({"class": "tabHomeHeader"},
            SPAN("Number of displayed measurements: "), //xxxHonza: localization
            SELECT({"class": "queryLimit", onchange: "$onLimitChange"},
                OPTION({selected: true}, "10"),
                OPTION("20"),
                OPTION("50"),
                OPTION("100")
            )
        ),

    rangeTag:
        DIV({"class": "tabHomeHeader", style: "display: none"},
            SPAN("Show failing test for past "),
            SELECT({"class": "failuresLimit", onchange: "$onFailuresLimitChange"},
                OPTION("1"),
                OPTION("2"),
                OPTION("3"),
                OPTION("5"),
                OPTION("6"),
                OPTION("10")
            ),
            SPAN(" week(s).")
        ),

    defaultContentTag:
        DIV({"class": "groupBodyDefault"}),

    tabList:
        DIV({"class": "tabViewBody"},
            DIV({"class": "tabBar", onmousedown: "$onClickTab"},
                A({"class": "HomeTab tab", view: "Home"},
                    $STR("Test Bot")
                ),
                A({"class": "UsersTab tab", view: "Users"},
                    $STR("Users")
                ),
                A({"class": "FailuresTab tab", view: "Failures"},
                    $STR("Failures")
                )
            ),
            DIV({"class": "tabHomeBody tabBody"},
                TAG("$limitTag"),
                DIV({"class": "groupList"},
                    TAG("$defaultContentTag")
                )
            ),
            DIV({"class": "tabUsersBody tabBody"},
                TAG("$limitTag"),
                DIV({"class": "groupList"},
                    TAG("$defaultContentTag")
                )
            ),
            DIV({"class": "tabFailuresBody tabBody"},
                TAG("$rangeTag"),
                DIV({"class": "failureList", style: "width: 500px"},
                    TAG("$defaultContentTag")
                )
            )
        ),

    onLimitChange: function(event)
    {
        var e = fixEvent(event);
        var viewBody = getAncestorByClass(e.target, "tabViewBody");
        var view = viewBody.selectedTab.getAttribute("view");
        this.updateTabBody(viewBody, view, null);
    },

    onFailuresLimitChange: function(event)
    {
        var e = fixEvent(event);
        var viewBody = getAncestorByClass(e.target, "tabViewBody");
        this.updateTabBody(viewBody, "Failures", null);
    },

    updateTabBody: function(viewBody, view, object)
    {
        var tab = viewBody.selectedTab;

        var tabHomeBody = getElementByClass(viewBody, "tabHomeBody");
        if (hasClass(tab, "HomeTab"))
        {
            this.refreshGroupList(tabHomeBody, "headers");
        }

        var tabUsersBody = getElementByClass(viewBody, "tabUsersBody");
        if (hasClass(tab, "UsersTab"))
        {
            this.refreshGroupList(tabUsersBody, "user-headers");
        }

        var tabFailuresBody = getElementByClass(viewBody, "tabFailuresBody");
        if (hasClass(tab, "FailuresTab"))
        {
            this.refreshFailuresList(tabFailuresBody);
        }
    },

    refreshGroupList: function(tabHomeBody, viewName)
    {
        var parentNode = getElementByClass(tabHomeBody, "groupList");
        var queryLimit = getElementByClass(tabHomeBody, "queryLimit").value;

        this.defaultContentTag.replace({}, parentNode);

        // Render list of test groups (a group == Firebug test suite launched once)
        FirebugDB.getGroupList(queryLimit, viewName, function(data)
        {
            // xxxHonza: localization
            if (data)
                Reps.GroupList.render(data, viewName, parentNode);
            else
                parentNode.innerHTML = "Failed to execute remote AJAX! See debugging console for more details.";
        });
    },

    refreshFailuresList: function(tabFailuresBody)
    {
        var weeks = tabFailuresBody.querySelector(".failuresLimit").value;
        var now = (new Date()).getTime();
        var dateFrom = new Date(now - (weeks*24*60*60*1000));
        var dateTo = new Date();

        FirebugDB.getFailures(dateFrom, dateTo, function (data)
        {
            var list = tabFailuresBody.querySelector(".failureList");
            var table = new Reps.Table([
                {property: "key", label: "Test", rep: Reps.Link},
                {property: "value", label: "Failures"},
            ]);
            table.render(data, list);
        });
    },

    render: function(parentNode)
    {
        var tabView = this.tag.replace({}, parentNode, this);
        return tabView;
    }
});

// ************************************************************************************************

/**
 * Displays information about specific header (group of results).
 */
CDB.Main.GroupView = domplate(CDB.Rep,
{
    headerTag:
        TABLE({"class": "", cellpadding: 0, cellspacing: 0},
            TBODY(
                FOR("param", "$object|headerIterator",
                    TR(
                        TD({"class": "paramName"},
                            SPAN("$param.name")
                        ),
                        TD({"class": "paramValue"},
                            SPAN("$param.value")
                        )
                    )
                )
            )
        ),

    tag:
        DIV({"class": "groupView"},
            DIV({"class": "groupViewHeader"},
                DIV({"class": "groupBodyDefault"})
            ),
            BR(),
            DIV({"class": "groupViewBody"})
        ),

    // xxxHonza: localization
    emptyTag:
        DIV("Empty JSON returned from the Database!"),

    headerIterator: function(object)
    {
        var skip = {
            "_id": 1,
            "_rev": 1,
            "type": 1
        };

        var result = [];
        for (var p in object)
        {
            if (p in skip)
                continue;

            var value = object[p];
            if (p == "Extensions")
            {
                var extList = [];
                for (var i=0; i<value.length; i++)
                {
                    var ext = value[i];
                    extList.push(ext.name + (ext.enabled ? "" : " (disabled)"));
                }
                value = extList.join(", ");
            }

            result.push({name: p, value: value});
        }

        return result;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    render: function(groupID, viewName, parentNode)
    {
        var view = this.tag.replace({}, parentNode, self);

        var self = this;
        FirebugDB.getGroupInfo(groupID, viewName, function(data)
        {
            if (data.length == 0)
            {
                self.renderEmptyResult(view.querySelector(".groupViewHeader"));
                return;
            }

            var header = data.shift();
            assert(header.value.type == "header" ||
                header.value.type == "user-header");

            self.renderHeader(view.querySelector(".groupViewHeader"), header);
            self.renderBody(view.querySelector(".groupViewBody"), data);
        });
    },

    renderEmptyResult: function(parentNode)
    {
        this.emptyTag.replace({}, parentNode, this);
    },

    renderHeader: function(parentNode, header)
    {
        this.headerTag.replace({object: header.value}, parentNode, this);
    },

    renderBody: function(parentNode, results)
    {
        //xxxHonza localization
        var table = new Reps.Table([
            {property: "value", label: "Test", rep: Reps.ProgressList},
            {property: "value.result", label: "Error"},
            {property: "value.description", label: "Description"}
        ]);

        table.render(results, parentNode);
        table.sort("value.result", true);
    }
});

// ************************************************************************************************

CDB.registerModule(CDB.Main);

// ************************************************************************************************
}}});

