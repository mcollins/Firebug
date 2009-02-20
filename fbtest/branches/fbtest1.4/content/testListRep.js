/* See license.txt for terms of usage */

// ************************************************************************************************
// Test List Domplate repository.

with (FBL) {

/**
 * Domplate templates in this file are used to generate list of registered tests.
 */
var CategoryList = domplate(
{
    tableTag:
        TABLE({"class": "categoryTable", cellpadding: 0, cellspacing: 0, onclick: "$onClick"},
            TBODY(
                FOR("category", "$categories",
                    TR({"class": "testCategoryRow", _repObject: "$category"},
                        TD({"class": "categoryName testCategoryCol"},
                            SPAN({"class": "testCategoryName"},
                                "$category|getCategoryName"
                            ),
                            SPAN({"class": "testCategoryCount"},
                                "$category|getCategoryCount"
                            ),
                            SPAN({"class": "categoryAction testLink", onclick: "$onCategoryClick"},
                                SPAN("Run")
                            )
                        )
                    )
                )
            )
        ),

    categoryBodyTag:
        TR({"class": "categoryBodyRow", _repObject: "$category"},
            TD({"class": "categoryBodyCol", colspan: 1})
        ),

    getCategoryName: function(category) 
    {
        var n = category.name;
        return n.charAt(0).toUpperCase() + n.substr(1).toLowerCase();
    },

    getCategoryCount: function(category) 
    {
        return "(" + category.tests.length + ")";
    },

    onCategoryClick: function(event) 
    {
        if (isLeftClick(event)) 
        {
            var row = getAncestorByClass(event.target, "testCategoryRow");
            if (row) 
            {
                cancelEvent(event);
                TestRunner.runTests(row.repObject.tests);
            }
        }
    },

    onClick: function(event)
    {
        if (isLeftClick(event)) 
        {
            var row = getAncestorByClass(event.target, "testCategoryRow");
            if (row) 
            {
                this.toggleRow(row);
                cancelEvent(event);
            }
        }
    },

    expandCategory: function(row)
    {
        if (hasClass(row, "testCategoryRow"))
            this.toggleRow(row, true);
    },

    collapseCategory: function(row)
    {
        if (hasClass(row, "testCategoryRow", "opened"))
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
            var category = row.repObject;
            var infoBodyRow = this.categoryBodyTag.insertRows({category: category}, row)[0];
            infoBodyRow.repObject = category;
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
        var category = infoBodyRow.repObject;
        var table = TestList.tag.replace({}, infoBodyRow.firstChild);
        var row = TestList.rowTag.insertRows({tests: category.tests}, table.firstChild)[0];
        for (var i=0; i<category.tests.length; i++)
        {
            var test = category.tests[i];
            test.row = row;
            row = row.nextSibling;
        }
    },

    // Firebug rep support
    supportsObject: function(category, type)
    {
        return category instanceof Category;
    },

    browseObject: function(category, context)
    {
        return false;
    },

    getRealObject: function(category, context)
    {
        return category;
    },

    // Context menu
    getContextMenuItems: function(category, target, context)
    {
        var items = [];

        items.push({
          label: $STR("test.cmd.Expand_All"),
          nol10n: true,
          command: bindFixed(this.onExpandAll, this, category)
        });

        items.push({
          label: $STR("test.cmd.Collapse_All"),
          nol10n: true,
          command: bindFixed(this.onCollapseAll, this, category)
        });

        return items;
    },

    // Commands
    onExpandAll: function(category)
    {
        var table = getAncestorByClass(category.row, "categoryTable");
        var rows = cloneArray(table.firstChild.childNodes);
        for (var i=0; i<rows.length; i++)
            this.expandCategory(rows[i]);
    },

    onCollapseAll: function(category)
    {
        var table = getAncestorByClass(category.row, "categoryTable");
        var rows = cloneArray(table.firstChild.childNodes);
        for (var i=0; i<rows.length; i++)
            this.collapseCategory(rows[i]);
    }
});

//-------------------------------------------------------------------------------------------------

var TestList = domplate(
{
    tag:
        TABLE({"class": "testListTable", cellpadding: 0, cellspacing: 0},
            TBODY()
        ),

    rowTag:
        FOR("test", "$tests",
            TR({"class": "testListRow", _repObject: "$test", 
                $results: "$test|hasResults",
                $error: "$test|hasError"},
                TD({"class": "testListCol testName", onclick: "$onExpandTest"},
                    SPAN("&nbsp;")
                ),
                TD({"class": "testListCol testUri", onclick: "$onRunTest"},
                    SPAN({"class": "testLink"},
                        SPAN("$test.uri")
                    )
                ),
                TD({"class": "testListCol testIcon"},
                    DIV({"class": "statusIcon"})
                ),
                TD({"class": "testListCol testDesc"},
                    SPAN("$test.desc")
                )
            )
        ),

    rowBodyTag:
        TR({"class": "testBodyRow", _repObject: "$test"},
            TD({"class": "testBodyCol", colspan: 4})
        ),

    hasResults: function(test)
    {
        return test.results && test.results.length > 0;
    },

    hasError: function(test)
    {
        return test.error;
    },

    onRunTest: function(event)
    {
        if (isLeftClick(event))
        {
            var row = getAncestorByClass(event.target, "testListRow");
            TestSummary.clear();
            TestRunner.runTest(row.repObject);
            cancelEvent(event);
        }
    },

    onExpandTest: function(event)
    {
        if (isLeftClick(event))
        {
            var row = getAncestorByClass(event.target, "testListRow");
            if (row && row.repObject.results && row.repObject.results.length > 0)
            {
                this.toggleRow(row);
                cancelEvent(event);
            }
        }
    },

    expandTest: function(row)
    {
        if (hasClass(row, "testListRow"))
            this.toggleRow(row, true);
    },

    collapseTest: function(row)
    {
        if (hasClass(row, "testListRow", "opened"))
            this.toggleRow(row);
    },

    toggleRow: function(row)
    {
        var opened = hasClass(row, "opened");
        if (opened && forceOpen)
            return;

        toggleClass(row, "opened");
        if (hasClass(row, "opened")) 
        {
            var test = row.repObject;
            var infoBodyRow = this.rowBodyTag.insertRows({test: test}, row)[0];
            infoBodyRow.repObject = test;
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
        var test = infoBodyRow.repObject;
        var table = TestResultRep.tableTag.replace({}, infoBodyRow.firstChild);
        var tbody = table.firstChild;
        var row = TestResultRep.resultTag.insertRows(
            {results: test.results}, tbody.lastChild ? tbody.lastChild : tbody)[0];

        for (var i=0; i<test.results.length; i++)
        {
            var result = test.results[i];
            result.row = row;
            row = row.nextSibling;
        }
    },
});

// ************************************************************************************************
// Category (list of related tests)

function Category(name)
{
    this.name = name;
    this.tests = [];
}

// ************************************************************************************************
// Test

function Test(category, uri, desc)
{
    this.category = category;
    this.uri = uri;
    this.desc = desc;
}

// ************************************************************************************************
}

