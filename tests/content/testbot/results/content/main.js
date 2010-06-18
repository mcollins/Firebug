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
        var image1 = new Image(11, 11);
        image1.src = "style/twistyOpen.png";

        // Render basic page content (tab view) and select the Input tab by default.
        var content = document.getElementById("content");
        this.tabViewNode = this.TabView.render(content);
        this.TabView.selectTabByName(this.tabViewNode, "Home");
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
            SPAN("Number of last measurements: "), //xxxHonza: localization
            SELECT({"class": "queryLimit", onchange: "$onLimitChange"},
                OPTION("10"),
                OPTION({selected: true}, "20"),
                OPTION("50"),
                OPTION("100")
            )
        ),

    defaultContentTag:
        DIV({"class": "groupBodyDefault"}),

    tabList:
        DIV({"class": "tabViewBody"},
            DIV({"class": "tabBar", onmousedown: "$onClickTab"},
                A({"class": "HomeTab tab", view: "Home"},
                    $STR("By Date")
                )
            ),
            DIV({"class": "tabHomeBody tabBody"},
                TAG("$limitTag"),
                DIV({"class": "groupList"},
                    TAG("$defaultContentTag")
                )
            )
        ),

    onLimitChange: function(event)
    {
        var e = eventFix(event);
        var tabHomeBody = getAncestorByClass(e.target, "tabHomeBody");
        this.refreshGroupList(tabHomeBody);
    },

    refreshGroupList: function(tabHomeBody)
    {
        var parentNode = getElementByClass(tabHomeBody, "groupList");
        var queryLimit = getElementByClass(tabHomeBody, "queryLimit").value;

        this.defaultContentTag.replace({}, parentNode);

        // Render list of test groups (a group == Firebug test suite launched once)
        FirebugDB.getGroupList(queryLimit, function(data)
        {
            // xxxHonza: localization
            if (data)
                Reps.GroupList.render(data, parentNode);
            else
                parentNode.innerHTML = "Failed to execute remote AJAX! See debugging console for more details.";
        });
    },

    updateTabBody: function(viewBody, view, object)
    {
        var tab = viewBody.selectedTab;

        var tabHomeBody = getElementByClass(viewBody, "tabHomeBody");
        if (hasClass(tab, "HomeTab") && !tabHomeBody.updated)
        {
            tabHomeBody.updated = true;
            this.refreshGroupList(tabHomeBody);
        }
    },

    render: function(parentNode)
    {
        var tabView = this.tag.replace({}, parentNode, this);
        return tabView;
    }
});

// ************************************************************************************************

CDB.registerModule(CDB.Main);

// ************************************************************************************************
}}});

