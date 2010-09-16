function runTest()
{
    FBTest.sysout("issue3394.START");
    FBTest.openNewTab(basePath + "console/completion/3394/issue3394.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var panel = FW.FirebugChrome.selectPanel("console");

            typeCommand("loc");

            FBTest.synthesizeKey("VK_TAB", win); // 9 == tab

            var doc = FW.FirebugChrome.window.document;
            var cmdLine = doc.getElementById("fbCommandLine");
            FBTest.compare(/^location/, cmdLine.value,
                "The autocomplete must produce: /^location/");

            FBTest.testDone("issue3394.DONE");
        });
    });
}

// ************************************************************************************************
// xxxHonza: These should be polished and moved into FBTest namespace.

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
