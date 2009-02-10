// Test entry point.
function runTest()
{
    FBTest.loadScript("net/env.js", this);

    openNewTab(basePath + "net/issue1256.html", function(win)
    {
        FBTest.sysout("issue1256.START");

        var browser = FBTest.FirebugWindow;

        // Open Firebug UI and activate Net panel.
        browser.Firebug.showBar(true);
        browser.FirebugChrome.selectPanel("net");

        // Run test implemented on the page.
        win.wrappedJSObject.runTest(function(request)
        {
            FBTest.sysout("issue1256.response received: " + request.name);

            // Expand the test request with params
            var panel = browser.FirebugContext.getPanel("net");
            var netRow = browser.FBL.getElementByClass(panel.panelNode, "netRow", "category-xhr", 
                "hasHeaders", "loaded");

            FBTest.ok(netRow, "There must be just one xhr request.");
            if (!netRow)
                return endTest(win);

            FBTest.click(win, netRow);

            // Activate Params tab.
            var netInfoRow = netRow.nextSibling;
            expandNetTabs(win, netInfoRow, "netInfoPostTab");

            var postTable = browser.FBL.getElementByClass(netInfoRow, "netInfoPostTable");
            if (postTable) 
            {
                var paramName = browser.FBL.getElementByClass(postTable, "netInfoParamName").textContent;
                var paramValue = browser.FBL.getElementByClass(postTable, "netInfoParamValue").textContent;

                FBTest.compare("param1", paramName, "The parameter name must be 'param1'.");
                FBTest.compare("1 + 2", paramValue, "The parameter value must be '1 + 2'");
            }

            endTest(win);
        });
    });
}

function endTest(win)
{
    // Finish test
    removeCurrentTab();
    FBTest.sysout("issue1256.DONE");
    FBTest.testDone();
}
