// 1. Click on the link below, a new tab should be opened.
// 2. Open Firebug on the new tab from step 1.
// 3. Enable all panels.
// 4. Clear browser cache and reload the page. Net panel should show one page load entry.
// 5. Close the FF tab, but not Firefox.
// 6. Return to the tab from step 1.
// 7. Clear browser cache and repeat step 1.
// 8. Firebug should open and show the page load entry - BUG.</li>

function runTest()
{
    FBTest.sysout("issue1764.START ");
    FBTest.ok(FW.Firebug.activateSameOrigin, "activateSameOrigin must be true (default value) for this test case");

    FBTestFirebug.openNewTab(basePath + "net/1764/issue1764-1.html", function(win)
    {
        // Step 1.
        nextStep(function() {
            FBTestFirebug.openNewTab(basePath + "net/1764/issue1764-2.html", function(win)
            {
                // Step 2.
                FBTestFirebug.openFirebug();

                // Step 3.
                FBTestFirebug.enableAllPanels();
                FBTestFirebug.selectPanelTab("net");

                // Step 4.
                FBTestFirebug.clearCache();
                FBTestFirebug.reload(function() {
                    verifyNetPanel("Step 4");

                    // Step 5 & 6.
                    nextStep(function() {
                        var tabbrowser = FBTestFirebug.getBrowser();
                        tabbrowser.removeTab(tabbrowser.selectedTab);

                        // Step 7.
                        nextStep(function() {
                            // ... clear cache and open again.
                            FBTestFirebug.clearCache();
                            nextStep(function() {
                                FBTestFirebug.openNewTab(basePath + "net/1764/issue1764-2.html", function(win)
                                {
                                    // Step 8.
                                    verifyNetPanel("Step 8");
                                    nextStep(function() {
                                        FBTestFirebug.testDone("issue1764.DONE");
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

function verifyNetPanel(msg)
{
    var panel = FBTestFirebug.getPanel("net");
    var netRow = FW.FBL.getElementByClass(panel.panelNode, "netRow", "category-html",
        "hasHeaders", "loaded");

    FBTest.ok(netRow, "There must be at least one request displayed. " + msg);
}

function nextStep(callback)
{
    setTimeout(callback, 500);
}
