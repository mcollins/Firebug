function runTest()
{
    FBTest.sysout("issue2580.START");

    FBTestFirebug.enableConsolePanel();
    FBTestFirebug.openNewTab(basePath + "dom/2580/issue2580.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.selectPanel("dom");

        // Test I.
        var text = "";
        for (var p in win.a)
            text += p + ", ";
        FBTest.compare("a, b, next, ", text, "There must be three properties.");

        // Unwrap
        win = FW.FBL.unwrapObject(win);

        // Test II.
        text = "";
        for (var p in win.a)
            text += p + ", ";
        FBTest.compare("a, b, next, ", text, "There still must be three properties.");

        FBTestFirebug.testDone("issue2580; DONE");
    });
}
