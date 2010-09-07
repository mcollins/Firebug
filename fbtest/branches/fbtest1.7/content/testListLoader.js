/* See license.txt for terms of usage */

FBTestApp.ns(function() { with (FBL) {

// ************************************************************************************************
// Test Logger Implementation

var Cc = Components.classes;
var Ci = Components.interfaces;

// ************************************************************************************************

FBTestApp.TestListLoader =
{
    loadAllRegisteredTests: function()
    {
        this.testLists = this.getRegisteredTestLists();

        // ----
    },

    getRegisteredTestLists: function()
    {
        var testLists = [];
        dispatch([Firebug], "onGetTestList", [testLists]);
        dispatch(Firebug.modules, "onGetTestList", [testLists]);

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.getRegisteredTestLists; ", testLists);

        return testLists;
    },

    loadTestList: function(testListPath)
    {
        var taskBrowser = $("taskBrowser");
        taskBrowser.addEventListener("DOMContentLoaded", TestListLoader.onTaskWindowDOMLoaded, true);
        taskBrowser.setAttribute("src", testListPath);
    },

    /**
     * The loaded page can directly represent a test list or a swarm page with test list
     * embedded.
     */
    onTaskWindowDOMLoaded: function(event)
    {
        var taskBrowser = $("taskBrowser");
        taskBrowser.removeEventListener("DOMContentLoaded", TestListLoader.onTaskWindowDOMLoaded, true);

        var fbTestFrame = event.target.getElementById("FBTest");

        // If fbTestFrame element exists it's a swarm page.
        if (fbTestFrame)
            fbTestFrame.contentDocument.addEventListener("load", TestListLoader.onTaskFrameLoaded, true);
        else
            taskBrowser.addEventListener("load", TestListLoader.onTaskWindowLoaded, true);
    },

    onTaskFrameLoaded: function(event)
    {
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.onTaskFrameLoaded "+event.target.getAttribute("id"), event.target);

        if (event.target.getAttribute('id') === "FBTest")
        {
            TestListLoader.processTestList(event.target.contentDocument);

            var taskBrowser = $("taskBrowser");
            taskBrowser.removeEventListener("load", TestListLoader.onTaskFrameLoaded, true);
        }
    },

    onTaskWindowLoaded: function(event)
    {
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.onTaskWindowLoaded "+event.target.location, event.target);

        TestListLoader.processTestList(event.target);

        var taskBrowser = $("taskBrowser");
        taskBrowser.removeEventListener("load", TestListLoader.onTaskWindowLoaded, true);
    },

    processTestList: function(doc)
    {
        FBTestApp.TestConsole.processTestList(doc);
    }
};

// Shortcut
var TestListLoader = FBTestApp.TestListLoader;

// ************************************************************************************************
}});
