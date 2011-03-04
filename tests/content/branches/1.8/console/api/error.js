function runTest()
{
    FBTest.sysout("console.error.START");
    FBTest.openNewTab(basePath + "console/api/error.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var config = {tagName: "div", classes: "logRow logRow-errorMessage"};
            FBTest.waitForDisplayedElement("console", config, function(row)
            {
                // Verify displayed text.
                var reTextContent = /This is a test error\s*console.error\(\"This is a test error\"\);\s*error\.html\s*\(line 31\)/;
                FBTest.compare(reTextContent, row.textContent, "Text content must match.");

                // Show stack trace.
                var objectBox = row.getElementsByClassName("errorTitle")[0];
                FBTest.click(objectBox);

                // Verify the first stack frame.
                var stackFrame = row.getElementsByClassName("objectBox-stackFrame")[0];
                FBTest.compare(/onExecuteTest\(\)\s*error.html\s*\(line 31\)/,
                    stackFrame.textContent, "Stack frame content must match.");

                // Finish test
                FBTest.testDone("console.error.DONE");
            });

            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}
