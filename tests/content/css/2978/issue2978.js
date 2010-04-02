function runTest()
{
    FBTest.sysout("issue2978.START");
    FBTest.openNewTab(basePath + "css/2978/issue2978.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableNetPanel(function(win)
        {
            var panel = FW.FirebugChrome.selectPanel("html");

            // Search for 'myElement' within the HTML panel, which
            // automatically expands the tree.
            FBTest.searchInHtmlPanel("myElement", function(sel)
            {
                FBTrace.sysout("sel", sel);

                //xxxHonza: TODO
                FBTest.progress("TODO: xxxHonza");

                FBTest.testDone("issue2978.DONE");
            })
        });
    });
}
