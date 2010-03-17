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

            theWindow = win;

            var tests = [];
            tests.push(test1);
            tests.push(test2);

            FBTestFirebug.runTestSuite(tests, function() {
                FBTestFirebug.testDone("issue2160.DONE");
            });
        });
    });
}

// ************************************************************************************************

function test1(callback)
{
    scrollToTop();
    reload(function()
    {
        FBTest.ok(isScrolledToTop(), "The Console content must be scrolled to the top");
        scrollToBottom();
        callback();
    });
}

function test2(callback)
{
    reload(function()
    {
        var panelNode = FBTestFirebug.getPanel("console").panelNode;
        FBTest.progress("scroll position: " + panelNode.scrollTop + ", " +
            panelNode.scrollHeight + ", " + panelNode.scrollOffset);

        FBTest.ok(isScrolledToBottom(), "The Console content must be scrolled to the bottom");
        callback();
    });
}

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
