function runTest()
{
    FBTest.sysout("commandline.cd.START");
    FBTest.openNewTab(basePath + "commandLine/cd.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.clearCache();
        FBTest.enableConsolePanel(function(win)
        {
            var tasks = new FBTest.TaskList();

            tasks.push(executeAndVerify, "cd(frames[0])",
                "[\"Current window:\", Window cdFrame.html]",
                "span", "objectBox objectBox-array");

            tasks.push(executeAndVerify, "$(\"test-iframe-1\")",
                "<div id=\"test-iframe-1\">",
                "a", "objectLink objectLink-element");

            tasks.push(executeAndVerify, "cd(top)",
                "[\"Current window:\", Window cd.html]",
                "span", "objectBox objectBox-array");

            tasks.run(function() {
                FBTest.testDone("commandline.cd.DONE");
            });
        });
    });
}

/**
 * Helper function for executing expression on the command line.
 * @param {Function} callback Appended by the test harness.
 * @param {String} expression Expression to be executed.
 * @param {String} expected Expected value displayed.
 * @param {String} tagName Name of the displayed element.
 * @param {String} class Class of the displayed element.
 */
function executeAndVerify(callback, expression, expected, tagName, classes)
{
    var config = {tagName: tagName, classes: classes};
    FBTest.waitForDisplayedElement("console", config, function(row)
    {
        FBTest.compare(expected, row.textContent, "Verify: " +
            expression + " SHOULD BE " + expected);

        FBTest.clickToolbarButton(null, "fbConsoleClear");
        callback();
    });

    FBTest.executeCommand(expression);
}
