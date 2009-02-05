// Test entry point.
function runTest() 
{
    window.open(basePath + "net/issue1256.html", "FBTestWindow",
        "width=500,height=300,status=yes,toolbar=yes,location=yes,menubar=yes");
}

// Callback from the test page.
function onTestLoaded(win) 
{
    FBTest.sysout("issue1256.test loaded");
    var chrome = getChromeWindow(win);

    // Open Firebug UI and activate Net panel.
    chrome.Firebug.showBar(true);
    chrome.FirebugChrome.selectPanel("net");

    // Run test implemented on the page.
    win.runTest(function(request) 
    {
        FBTest.sysout("issue1256.test response received");

        // Expand the test request with params
        var panel = chrome.FirebugContext.getPanel("net");
        var netRow = chrome.FBL.getElementByClass(panel.panelNode, "netRow", "category-xhr", 
            "hasHeaders", "loaded");

        FBTest.ok(netRow, "There must be just one xhr request.");
        if (!netRow)
            return endTest(win);

        FBTest.click(win, netRow);

        // Activate Params tab.
        var netInfoRow = netRow.nextSibling;
        expandNetTabs(win, netInfoRow, "netInfoPostTab");

        var postTable = chrome.FBL.getElementByClass(netInfoRow, "netInfoPostTable");
        if (postTable) 
        {
            var paramName = chrome.FBL.getElementByClass(postTable, "netInfoParamName").textContent;
            var paramValue = chrome.FBL.getElementByClass(postTable, "netInfoParamValue").textContent;

            FBTest.compare("param1", paramName, "The parameter name must be 'param1'.");
            FBTest.compare("1 + 2", paramValue, "The parameter value must be '1 + 2'");
        }

        endTest(win);
    });
}

function endTest(win)
{
    // Finish test
    win.close();
    FBTest.testDone();
}
