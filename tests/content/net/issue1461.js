// Test entry point.
function runTest()
{
    FBTest.sysout("issue1461.START");
    FBTest.loadScript("net/env.js", this);

    var cache = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService);
    cache.evictEntries(Ci.nsICache.STORE_ON_DISK);
    cache.evictEntries(Ci.nsICache.STORE_IN_MEMORY);

    openURL(basePath + "net/issue1461.html", function(win)
    {
        FBTest.sysout("issue1461.openNewTab; " + win.location.href);

        var browser = FBTest.FirebugWindow;

        // Open Firebug UI and activate Net panel.
        browser.Firebug.showBar(true);
        browser.FirebugChrome.selectPanel("net");

        var panelNode = browser.FirebugContext.getPanel("net").panelNode;
        expandNetRows(panelNode, "netRow", "category-html", "hasHeaders", "loaded");
        expandNetTabs(panelNode, "netInfoResponseTab");

        var responseBody = browser.FBL.getElementByClass(panelNode, "netInfoResponseText", 
            "netInfoText");

        // The response must be displayed.
        FBTest.ok(responseBody, "Response tab must exist.");
        if (!responseBody)
            return testDone(win);

        var partOfThePageSource = "<h1>Test for Issue #1461</h1>";
        var index = responseBody.textContent.indexOf(partOfThePageSource);
        FBTest.ok(index != -1, "The proper response is there.");

        testDone(win);
    });
}

function testDone(win)
{
    // Finish test
    FBTest.sysout("issue1461.DONE");
    FBTest.testDone();
}
