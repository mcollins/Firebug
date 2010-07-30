// Test entry point.
function runTest()
{
    FBTest.sysout("issue1256.START");
    FBTestFirebug.openNewTab(basePath + "net/1256/issue1256.html", function(win)
    {
        // Open Firebug UI and enable Net panel.
        FBTestFirebug.enableNetPanel(function(win) 
        {
            FBTestFirebug.selectPanel("net");

            FBTest.sysout("issue1256.onReload; " + win.location.href);

            // Run test implemented on the page.
            win.runTest(function(request)
            {
                FBTest.sysout("issue1256.response received: " + request.channel.URI.spec, request);

                // Expand the test request with params
                var panel = FW.FirebugChrome.selectPanel("net");
                var netRow = FW.FBL.getElementByClass(panel.panelNode, "netRow", "category-xhr",
                    "hasHeaders", "loaded");

                FBTest.ok(netRow, "There must be just one xhr request.");
                if (!netRow)
                    return FBTestFirebug.testDone();

                FBTest.click(netRow);

                // Activate Params tab.
                var netInfoRow = netRow.nextSibling;
                FBTestFirebug.expandElements(netInfoRow, "netInfoPostTab");

                var postTable = FW.FBL.getElementByClass(netInfoRow, "netInfoPostTable");
                if (postTable)
                {
                    var paramName = FW.FBL.getElementByClass(postTable, "netInfoParamName").textContent;
                    var paramValue = FW.FBL.getElementByClass(postTable, "netInfoParamValue").textContent;

                    FBTest.compare("param1", paramName, "The parameter name must be 'param1'.");
                    FBTest.compare("1 + 2", paramValue, "The parameter value must be '1 + 2'");
                }

                FBTestFirebug.testDone("issue1256.DONE");
            });
        });
    });
}
