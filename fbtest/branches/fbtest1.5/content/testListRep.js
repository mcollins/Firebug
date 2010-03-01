/* See license.txt for terms of usage */

FBTestApp.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

var Cc = Components.classes;
var Ci = Components.interfaces;

// ************************************************************************************************
// Test List Domplate repository.

/**
 * Domplate templates in this file are used to generate list of registered tests.
 */
FBTestApp.GroupList = domplate(Firebug.Rep,
{
    tableTag:
        TABLE({"class": "groupTable", cellpadding: 0, cellspacing: 0, onclick: "$onClick"},
            TBODY(
                FOR("group", "$groups",
                    TR({"class": "testGroupRow", _repObject: "$group"},
                        TD({"class": "groupName testGroupCol"},
                            SPAN({"class": "testGroupName"},
                                "$group|getGroupName"
                            ),
                            SPAN({"class": "testGroupCount"},
                                "$group|getGroupCount"
                            ),
                            SPAN({"class": "groupAction testLink", onclick: "$onGroupClick"},
                                SPAN("Run")
                            )
                        )
                    )
                )
            )
        ),

    groupBodyTag:
        TR({"class": "groupBodyRow", _repObject: "$group"},
            TD({"class": "groupBodyCol", colspan: 1})
        ),

    getGroupName: function(group) 
    {
        var n = group.name;
        return n.charAt(0).toUpperCase() + n.substr(1).toLowerCase();
    },

    getGroupCount: function(group) 
    {
        return "(" + group.tests.length + ")";
    },

    onGroupClick: function(event) 
    {
        if (isLeftClick(event)) 
        {
            var row = getAncestorByClass(event.target, "testGroupRow");
            if (row) 
            {
                cancelEvent(event);
                FBTestApp.TestRunner.runTests(row.repObject.tests);
            }
        }
    },

    onClick: function(event)
    {
        if (isLeftClick(event)) 
        {
            var row = getAncestorByClass(event.target, "testGroupRow");
            if (row) 
            {
                this.toggleRow(row);
                cancelEvent(event);
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
        var table = FBTestApp.TestList.tag.replace({}, infoBodyRow.firstChild);
        var row = FBTestApp.TestList.rowTag.insertRows({tests: group.tests}, table.firstChild)[0];
        for (var i=0; i<group.tests.length; i++)
        {
            var test = group.tests[i];
            test.row = row;
            row = row.nextSibling;
        }
    },

    // Firebug rep support
    supportsObject: function(group, type)
    {
        return group instanceof FBTestApp.TestGroup;
    },

    browseObject: function(group, context)
    {
        return false;
    },

    getRealObject: function(group, context)
    {
        return group;
    },

    // Context menu
    getContextMenuItems: function(group, target, context)
    {
        var items = [];

        items.push({
          label: $STR("fbtest.cmd.Expand_All"),
          nol10n: true,
          command: bindFixed(this.onExpandAll, this, group)
        });

        items.push({
          label: $STR("fbtest.cmd.Collapse_All"),
          nol10n: true,
          command: bindFixed(this.onCollapseAll, this, group)
        });

        items.push("-");

        items.push({
          label: $STR("fbtest.cmd.Copy All Errors"),
          nol10n: true,
          command: bindFixed(this.onCopyAllErrors, this)
        });

        return items;
    },

    // Commands
    onExpandAll: function(group)
    {
        var table = getAncestorByClass(group.row, "groupTable");
        var rows = cloneArray(table.firstChild.childNodes);
        for (var i=0; i<rows.length; i++)
            this.expandGroup(rows[i]);
    },

    onCollapseAll: function(group)
    {
        var table = getAncestorByClass(group.row, "groupTable");
        var rows = cloneArray(table.firstChild.childNodes);
        for (var i=0; i<rows.length; i++)
            this.collapseGroup(rows[i]);
    },

    onCopyAllErrors: function()
    {
        try
        {
            var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
            var currLocale = Firebug.getPref("general.useragent", "locale");
            var systemInfo = Cc["@mozilla.org/system-info;1"].getService(Ci.nsIPropertyBag); 
            var name = systemInfo.getProperty("name");
            var version = systemInfo.getProperty("version");

            // Store head info.
            var text = "Firebug: " + Firebug.version + "\n" + 
                appInfo.name + ": " + appInfo.version + ", " + 
                appInfo.platformVersion + ", " + 
                appInfo.appBuildID + ", " + currLocale + "\n" +
                "OS: " + name + " " + version + "\n" +
                "Test List: " + FBTestApp.TestConsole.testListPath + "\n" +
                "Export Date: " + (new Date()).toGMTString() + 
                "\n==========================================\n\n";

            var groups = FBTestApp.TestConsole.groups;
            for (group in groups)
                text += groups[group].getErrors();

            copyToClipboard(text);
        }
        catch (err)
        {
            if (FBTrace.DBG_ERRORS || FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbrace.FTestApp.GroupList; onCopyAllErrors EXCEPTION", err);
        }
    }
});

//-------------------------------------------------------------------------------------------------

FBTestApp.TestList = domplate(
{
    tag:
        TABLE({"class": "testListTable", cellpadding: 0, cellspacing: 0},
            TBODY()
        ),

    rowTag:
        FOR("test", "$tests",
            TR({"class": "testListRow", _repObject: "$test", 
                $results: "$test|hasResults",
                $error: "$test|hasError",
                $todo: "$test|isTodo"},
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

    isTodo: function(test)
    {
        return test.category == "fails";
    },

    onRunTest: function(event)
    {
        if (isLeftClick(event))
        {
            cancelEvent(event);

            // Even one test is launched as a test-suite.
            var row = getAncestorByClass(event.target, "testListRow");
            FBTestApp.TestRunner.runTests([row.repObject]);
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
        if (hasClass(row, "testListRow") && hasClass(row, "opened"))
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
        var table = FBTestApp.TestResultRep.tableTag.replace({}, infoBodyRow.firstChild);
        var tbody = table.firstChild;
        var row = FBTestApp.TestResultRep.resultTag.insertRows(
            {results: test.results}, tbody.lastChild ? tbody.lastChild : tbody)[0];

        for (var i=0; i<test.results.length; i++)
        {
            var result = test.results[i];
            result.row = row;
            row = row.nextSibling;
        }
    },

    // Firebug rep support
    supportsObject: function(test, type)
    {
        return test instanceof FBTestApp.Test;
    },

    browseObject: function(test, context)
    {
        return false;
    },

    getRealObject: function(test, context)
    {
        return test;
    },

    // Context menu
    getContextMenuItems: function(test, target, context)
    {
        var items = [];

        if (test.testPage)
        {
            items.push({
              label: $STR("fbtest.cmd.Open Test Page"),
              nol10n: true,
              command: bindFixed(this.onOpenTestPage, this, test)
            });
        }

        items.push("-");

        items.push({
          label: $STR("fbtest.cmd.Copy All Errors"),
          nol10n: true,
          command: bindFixed(FBTestApp.GroupList.onCopyAllErrors, FBTestApp.GroupList)
        });

        if (test.error)
        {
            items.push({
              label: $STR("fbtest.cmd.Copy Errors"),
              nol10n: true,
              command: bindFixed(this.onCopyAllErrors, this, test)
            });
        }

        return items;
    },

    // Commands
    onCopyAllErrors: function(test)
    {
        copyToClipboard(test.getErrors());
    },

    onOpenTestPage: function(test)
    {
        FBTestApp.FBTest.FirebugWindow.FBL.openNewTab(
            FBTestApp.TestConsole.getHTTPURLBase() + test.testPage);
    }
});

// ************************************************************************************************
// TestGroup (list of related tests)

FBTestApp.TestGroup = function(name)
{
    this.name = name;
    this.tests = [];
}

FBTestApp.TestGroup.prototype =
{
    getErrors: function()
    {
        var text = "";
        for (var i=0; i<this.tests.length; i++)
        {
            var test = this.tests[i];
            var errors = test.getErrors();
            if (errors)
                text += errors + "\n";
        }
        return text;
    }
}

// ************************************************************************************************
// Test

FBTestApp.Test = function(group, uri, desc, category, testPage)
{
    if (category != "passes" && category != "fails")
    {
        if (FBTrace.DBG_ERRORS || FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbrace.FTestApp.Test; Wrong category for a test: " + 
                category + ", " + uri);
    }

    // Test definition.
    this.group = group;
    this.uri = uri;
    this.desc = desc;
    this.category = category;
    this.testPage = testPage;

    // Used by the test runner.
    this.results = [];
    this.error = false;
    this.row = null;
    this.path = null;

    // Timing
    this.start = 0;
    this.end = 0;
}

FBTestApp.Test.prototype =
{
    appendResult: function(testResult)
    {
        this.results.push(testResult);

        // If it's an error update test so, it's reflecting an error state.
        if (!testResult.pass)
        {
            setClass(this.row, "error");
            this.error = true;
        }
    },

    onStartTest: function(baseURI)
    {
        this.path = baseURI + this.uri;
        this.results = [];
        this.error = false;

        setClass(this.row, "running");
        removeClass(this.row, "results");
        removeClass(this.row, "error");

        // Remove previous results from the UI.
        if (hasClass(this.row, "opened"))
        {
            var infoBody = this.row.nextSibling;
            clearNode(FBL.getElementByClass(infoBody, "testBodyCol"));
        }

        // Clear time info
        var timeNode = FBL.getElementByClass(this.row, "statusIcon");
        clearNode(timeNode);
        timeNode.removeAttribute("title");
    },

    onTestDone: function()
    {
        removeClass(this.row, "running");
        if (this.results.length > 0)
            setClass(this.row, "results");

        var timeNode = FBL.getElementByClass(this.row, "statusIcon");
        var elapsedTime = this.end - this.start;
        timeNode.innerHTML = "(" + formatTime(elapsedTime) + ")";
        timeNode.setAttribute("title", elapsedTime + "ms");
    },

    onManualVerify: function(verifyMsg, instructions)
    {
        removeClass(this.row, "running");
    },

    getErrors: function()
    {
        if (!this.error)
            return "";

        var status = (this.category == "fails") ? "[FAILED, NOT BLOCKING]" : "[FAILED]";
        var text = status + " " + this.uri + ": " + this.desc + "\n";
        for (var i=0; i<this.results.length; i++)
        {
            var testResult = this.results[i];
            text += "- " + testResult.msg + (testResult.pass ? "" : " [ERROR]") + "\n";
        }
        return text;
    }
};

// ************************************************************************************************
// Registration

Firebug.registerRep(FBTestApp.GroupList);
Firebug.registerRep(FBTestApp.TestList);

// ************************************************************************************************
}});
