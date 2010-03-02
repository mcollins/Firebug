function runTest()
{
    FBTest.sysout("console.assert.START");
    FBTest.openNewTab(basePath + "console/api/assert.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var config = {tagName: "div", classes: "logRow logRow-errorMessage"};
            FBTest.waitForDisplayedElement("console", config, function(row)
            {
                verifyConsoleUI(config);
                FBTest.testDone("console.dir.DONE");
            });

            // Execute test implemented on the test page.
            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}

function verifyConsoleUI(config)
{
    var panelNode = FBTest.getPanel("console").panelNode;

    var rows = panelNode.getElementsByClassName(config.classes);
    if (!FBTest.compare(2, rows.length, "There must be two logs (only negative are displayed)."))
        return;

    var reExpectedLog1 = /negative\s*console.assert\(false,\s*\"negative\"\);\\r\\nassert.html\s*\(line\s*28\)/
    if (!FBTest.compare(reExpectedLog1, rows[0].textContent,
        "The log must be something like as follows: " +
        "negative    console.assert(false, \"negative\");\r\nassert.html (line 28)"))
        return;

    // xxxHonza: TODO, the other log "negative with object" must be verified.
    // It is not clear how the output should look like.
    FBTest.ok(false, "TODO: This test is not fully implemented yet");
}
