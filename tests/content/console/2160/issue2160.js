function runTest()
{
    FBTest.sysout("issue2160.START");

    // Show CSS errors for this test.
    FBTestFirebug.setPref("showCSSErrors", true);

    FBTestFirebug.openNewTab(basePath + "console/2160/issue2160.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableConsolePanel(function()
        {
            FBTestFirebug.selectPanel("console");

            // Scroll to the top
            scrollToTop();

            // Reload
            reload(function()
            {
                // It must be scrolled again to the top.
                FBTest.ok(isScrolledToTop(), "The Console content must be scrolled to the top");

                // Scroll to the bottom
                scrollToBottom();

                // Reload
                reload(function()
                {
                    var panelNode = FBTestFirebug.getPanel("console").panelNode;
                    FBTest.progress("scroll position: " + panelNode.scrollTop + ", " +
                        panelNode.scrollHeight + ", " + panelNode.scrollOffset);

                    // It must be again scrolled to the bottom.
                    FBTest.ok(isScrolledToBottom(), "The Console content must be scrolled to the bottom");
                    FBTestFirebug.testDone("issue2160.DONE");
                });
            });
        });
    });
}

// ************************************************************************************************

function reload(callback)
{
    FBTestFirebug.reload();

    // Wait for the last log.
    var doc = FBTestFirebug.getPanelDocument();
    var recognizer = new MutationRecognizer(doc.defaultView, "Text", null, "Doing addOnLoad..."); 
    recognizer.onRecognizeAsync(callback);
}

// ************************************************************************************************

function isScrolledToBottom()
{
    var panel = FBTestFirebug.getPanel("console");
    return FW.FBL.isScrolledToBottom(panel.panelNode);
}

function isScrolledToTop()
{
    var panel = FBTestFirebug.getPanel("console");
    return (panel.panelNode.scrollTop == 0);
}

function scrollToBottom()
{
    var panel = FBTestFirebug.getPanel("console");
    return FW.FBL.scrollToBottom(panel.panelNode);
}

function scrollToTop()
{
    var panel = FBTestFirebug.getPanel("console");
    return panel.panelNode.scrollTop = 0;
}
