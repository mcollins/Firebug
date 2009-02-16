// Test entry point.
function runTest()
{
    FBTest.loadScript("net/env.js", this);
    FBTest.sysout("issue1425.START");

    var cache = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService);
    cache.evictEntries(Ci.nsICache.STORE_ON_DISK);
    cache.evictEntries(Ci.nsICache.STORE_IN_MEMORY);

    openNewTab(basePath + "script/1425/issue1425.html", function(win)
    {
        // Open Firebug UI and activate Net panel.
        FW.Firebug.showBar(true);
        var panel = FW.FirebugChrome.selectPanel("script");

        // Select proper JS file.
        var fileUrl = basePath + "script/1425/main.js";
        var sourceFile = FW.FirebugContext.sourceFileMap[fileUrl];
        panel.navigate(sourceFile);

        var sourceViewports = FW.FBL.getElementsByClass(panel.panelNode, "sourceViewport");
        FBTest.compare(2, sourceViewports.length, "There must be two source viewports by now");

        var sourceViewport = sourceViewports[1];
        if (sourceViewport)
        {
            var rows = sourceViewport.childNodes;

            FBTest.ok(rows.length > 1, "The script view must not be empty.");
            if (rows[1]) {
                var source1 = "function MapLoadingIndicator(m){";
                FBTest.compare(source1, rows[1].firstChild.nextSibling.textContent,
                    "Verify source on line 1");
            }

            // Scroll to 1143
            var sourceLink = new FBL.SourceLink(fileUrl, 1143, "js");
            panel.showSourceLink(sourceLink);

            setTimeout(function() {
                // Look for line 1143
                var row1143 = null;
                for (var i=0; i<rows.length; i++)
                {
                    if (rows[i].firstChild.textContent == "1143") {
                        row1143 = rows[i];
                        break;
                    }
                }

                // Check 1143
                FBTest.ok(row1143, "The row 1143 must exist");
                if (row1143) {
                    var source1143 = "initialize:function(config){";
                    FBTest.compare(source1143, row1143.firstChild.nextSibling.textContent,
                        "The source code at line 1143 verified.");
                }

                // Finish test
                //removeCurrentTab();
                FBTest.sysout("issue1425.DONE");
                FBTest.testDone();
            }, 300);
        }
    });
}
