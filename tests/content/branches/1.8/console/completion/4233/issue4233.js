function runTest()
{
    FBTest.sysout("issue4233.START");
    FBTest.setPref("commandLineShowCompleterPopup", true);
    FBTest.openNewTab(basePath + "console/completion/4233/issue4233.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var panel = FW.FirebugChrome.selectPanel("console");

            var tasks = new FBTest.TaskList();
            tasks.push(testExpression, "i", true);
            tasks.push(testExpression, "document.q", true);
            tasks.push(testExpression, "window.window.window.i", true);
            tasks.push(testExpression, "document.querySelector('div').a", true);
            tasks.push(testExpression, "document.querySelectorAll('div')[0].a", true);
            tasks.push(testExpression, "document.querySelector('div').querySelector.c", true);
            tasks.push(testExpression, "document.querySelector('div').parentNode.querySelector('div').a", true);
            tasks.push(testExpression, "alert.c", true);
            tasks.push(testExpression, "getterSeemingEval('window').i", true);
            tasks.push(testExpression, "getterSeemingEval('[window]')[0].i", true);
            tasks.push(testExpression, "[].s", true);
            tasks.push(testExpression, "''.s", true);
            tasks.push(testExpression, "/a/.t", true);
            tasks.push(testExpression, "mk4().c", true);
            tasks.push(testExpression, "mk4().chain().c", true);
            tasks.push(testExpression, "(1)/i", true);
            tasks.push(testExpression, "if(1){i", true);
            tasks.push(testExpression, "a=0;{i", true);
            tasks.push(testExpression, "'\"'+i", true);
            tasks.push(testExpression, "id[/\\[/]=i", true);
            tasks.push(testExpression, "throw(1)/i", true);
            tasks.push(testExpression, "id(1)/i", true);
            tasks.push(testExpression, "(1)/i", true);

            tasks.push(testExpression, "id(eval('window')).i", false);
            tasks.push(testExpression, "if(1)/i", false);
            tasks.push(testExpression, "if(1)/i", false);
            tasks.push(testExpression, "(function()/i", false);
            tasks.push(testExpression, "/[/; i", false);
            tasks.push(testExpression, "1+/i", false);
            tasks.push(testExpression, "id[/[/]=i", false);
            tasks.push(testExpression, "id[/[/]/i", false);

            // currently not handled
            tasks.push(testExpression, "(window).i", false);
            tasks.push(testExpression, "q='';q.s", false);

            tasks.push(testExpression, "var a = i", true);
            tasks.push(testExpression, "var i", false);
            tasks.push(testExpression, "var a = 0, i", false);
            tasks.push(testExpression, "var a, i", false);
            tasks.push(testExpression, "({a: i", true);
            tasks.push(testExpression, "({ i", false);
            tasks.push(testExpression, "({a: window, i", false);
            tasks.push(testExpression, "{i", true);
            tasks.push(testExpression, "{a: window, i", true);
            tasks.push(testExpression, "if(1) { i", true);
            tasks.push(testExpression, "function(i", false);
            tasks.push(testExpression, "function f(i", false);
            tasks.push(testExpression, "f=function(i", false);
            tasks.push(testExpression, "function i", false);
            tasks.push(testExpression, "function([i", false);

            tasks.push(testExpression, "date().g", true);
            tasks.push(testExpression, "String.prototype.ch", true);

            tasks.run(function()
            {
                FBTest.testDone("issue4233.DONE");
            });
        });
    });
}

function testExpression(callback, expr, popupOpened)
{
    FBTest.typeCommand(expr);

    setTimeout(function()
    {
        FBTest.compare(popupOpened, isCompletionPopupOpen(),
            "The completion popup should " + (popupOpened ? "" : "not ") +
            "be there for: " + expr);

        var doc = FW.FirebugChrome.window.document;
        var cmdLine = doc.getElementById("fbCommandLine");
        cmdLine.value = "";

        callback();
    });
}

// ************************************************************************************************
// xxxHonza: These should be polished and moved into FBTest namespace.

function isCompletionPopupOpen()
{
    var doc = FW.FirebugChrome.window.document;
    var popup = doc.getElementById("fbCommandLineCompletionList");
    return popup.state == "open";
}
