function runTest()
{
    FBTest.sysout("netInfoBodyListener.START");
    var NetInfoBody = FW.Firebug.NetMonitor.NetInfoBody;
    FBTestFirebug.openNewTab(basePath + "net/listeners/netInfoBodyListener.html", function(win)
    {
        FBTestFirebug.enableNetPanel(function(win)
        {
            NetInfoBody.addListener(netInfoBodyListener);
            win.runTest(function(request)
            {
                var panelNode = FBTestFirebug.selectPanel("net").panelNode;
                var netRow = FW.FBL.getElementByClass(panelNode, "netRow", "category-xhr", 
                    "hasHeaders", "loaded");

                // Click to open + click to close.
                FBTest.click(netRow);
                FBTest.click(netRow);

                NetInfoBody.removeListener(netInfoBodyListener);

                FBTest.ok(initTabBody, "initTabBody callback verified");
                FBTest.ok(updateTabBody, "updateTabBody callback verified");
                FBTest.ok(destroyTabBody, "destroyTabBody callback verified");

                FBTestFirebug.testDone("netInfoBodyListener.DONE");
            });
        });
    });
}

var initTabBody = false;
var updateTabBody = false;
var destroyTabBody = false;

var netInfoBodyListener = 
{
    initTabBody: function(infoBox, file) {
        initTabBody = true;
    },

    updateTabBody: function(infoBox, file, context) {
        updateTabBody = true;
    },

    destroyTabBody: function(infoBox, file) {
        destroyTabBody = true;
    }
}
