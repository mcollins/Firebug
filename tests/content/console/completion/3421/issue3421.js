function runTest()
{
    FBTest.sysout("issue3421.START");
    FBTest.openNewTab(basePath + "console/completion/3421/issue3421.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var panel = FW.FirebugChrome.selectPanel("console");

            var tasks = new FBTest.TaskList();
            tasks.push(testExpression, "1+do");
            tasks.push(testExpression, "{}do");

            tasks.run(function() {
                FBTest.testDone("issue3421.DONE");
            });
        });
    });
}

function testExpression(callback, expr)
{
    typeCommand(expr);
    FBTest.ok(isCompletionPopupOpen(),
        "The completion popup must be available for: " + expr);
    callback();
}

// ************************************************************************************************
// xxxHonza: These should be polished and moved into FBTest namespace.

function isCompletionPopupOpen()
{
    var doc = FW.FirebugChrome.window.document;
    var popup = doc.getElementById("fbCommandLineCompletionList");
    return popup.state == "open";
}

function typeCommand(string)
{
    var doc = FW.FirebugChrome.window.document;
    var cmdLine = doc.getElementById("fbCommandLine");
    var panelBar1 = doc.getElementById("fbPanelBar1");
    var win = panelBar1.browser.contentWindow;

    FW.FirebugChrome.window.focus();
    panelBar1.browser.contentWindow.focus();
    FBTest.focus(cmdLine);

    for (var i=0; i<string.length; ++i)
        FBTest.synthesizeKey(string.charAt(i), win);
}
