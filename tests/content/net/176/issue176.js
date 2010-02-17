function runTest()
{
    FBTest.sysout("issue176.START");

    FBTestFirebug.openNewTab(basePath + "net/176/issue176.html", function(win)
    {
        FBTestFirebug.enableNetPanel(function(win)
        {
            FBTestFirebug.clearCache();
            win.wrappedJSObject.runTest(function()
            {
                var panel = FW.FirebugChrome.selectPanel("net");

                // Set "Flash" filter and wait for relayout.
                FW.Firebug.NetMonitor.onToggleFilter(FW.FirebugContext, "flash");
                setTimeout(checkNetPanelUI, 300);
            });
        });
    });
}

// Request handler (server side)
function requestHandler(metadata, response)
{
    var path = metadata.path;
    var extension = path.substr(path.lastIndexOf(".") + 1);
    response.setHeader("Content-Type", (extension == "txt" ? "video/x-flv" : ""), false);
    response.write("onScriptLoaded();");
}

// Make sure the Net panel's UI is properly filtered.
function checkNetPanelUI()
{
    var panelNode = FBTestFirebug.getPanel("net").panelNode;

    // Check number of requests. Must be exactly two.
    var netRows = FW.FBL.getElementsByClass(panelNode, "netRow", "category-flash", "hasHeaders", "loaded");
    FBTest.compare(2, netRows.length, "There must be exactly two requests displayed!");

    // Each row can specify just one category.
    for (var i=0; i<netRows.length; i++)
    {
        var row = netRows[i];
        var file = FW.Firebug.getRepObject(row);
        var m = row.className.match(/category-/gi);
        FBTest.compare(1, m.length, "There must be just one file category specified for a request: " + 
            file.href);
    }

    FW.Firebug.NetMonitor.onToggleFilter(FW.FirebugContext, "all");
    FBTestFirebug.testDone("issue1256.DONE");
}
