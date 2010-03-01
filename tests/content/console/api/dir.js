function runTest()
{
    FBTest.sysout("console.dir.START");

    FBTestFirebug.openNewTab(basePath + "console/api/dir.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableConsolePanel(function(win)
        {
            var config = {tagName: "div", classes: "logRow logRow-dir"};
            FBTestFirebug.waitForDisplayedElement("console", config, function(row)
            {
                var name = row.getElementsByClassName("memberLabelCell")[0];
                var value = row.getElementsByClassName("memberValueCell")[0];

                FBTest.compare("a", name.textContent, "The variable name must be: 'a'");
                FBTest.compare("\"b\"", value.textContent, "The variable value must be: 'b'");

                FBTestFirebug.testDone("console.dir.DONE");
            });

            // Execute test implemented on the test page.
            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}
