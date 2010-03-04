function runTest()
{
    FBTest.sysout("console.assert.START");
    FBTest.openNewTab(basePath + "console/api/assert.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var config = {tagName: "div", classes: "logRow logRow-errorMessage", counter: 2};
            FBTest.waitForDisplayedElement("console", config, function(row)
            {
                verifyConsoleUI(config);
                FBTest.testDone("console.assert.DONE");
            });

            // Execute test implemented on the test page.
            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}

function verifyConsoleUI(config)
{
    var panelNode = FBTest.getPanel("console").panelNode;

    // Verify number of asserts
    var rows = panelNode.getElementsByClassName(config.classes);
    if (!FBTest.compare(2, rows.length, "There must be two logs (only negative are displayed)."))
        return;

    // Verify the first assert message.
    var reExpectedLog1 = /negative\s*console.assert\(false,\s*\"negative\"\);\\r\\nassert.html\s*\(line\s*28\)/
    if (!FBTest.compare(reExpectedLog1, rows[0].textContent,
        "The log must be something like as follows: " +
        "negative    console.assert(false, \"negative\");\r\nassert.html (line 28)"))
        return;

    // Verify the second assert message.
    var title = rows[1].getElementsByClassName("errorTitle")[0];
    FBTest.compare("negative with an object", title.textContent, "Verify error title");

    var objects = rows[1].getElementsByClassName("objectBox-array")[0];
    FBTest.compare(/[Object\s*{\s*a="b"\s*}, 15, \"asdfa\"]/, objects.textContent,
        "List of arguments must be displayed");

    // Verify stact trace presence.
    var errorTrace = rows[1].getElementsByClassName("errorTrace")[0];
    FBTest.ok(!errorTrace.textContent, "The trace info is hidden by default");
    FBTest.click(title);
    FBTest.ok(errorTrace.textContent, "Now it must be visible");
}
