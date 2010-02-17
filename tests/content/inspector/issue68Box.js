function runTest()
{
    FBTest.sysout("issue68Box.START");
        
    FBTestFirebug.openNewTab(basePath + "inspector/Issue68BoxExpected.htm", function(win)
    {
        var actualImage, expectedImage,
            width = win.document.body.clientWidth,
            height = 200;
            
        // To get full html for expected page: win.document.documentElement.innerHTML
        expectedImage = FBTestFirebug.getImageDataFromWindow(win, width, height);
        
        FBTestFirebug.openURL(basePath + "inspector/Issue68BoxActual.htm", function(win)
        {
            FBTestFirebug.openFirebug();

            var target = win.document.getElementById("testTarget1");
            FBTestFirebug.inspectUsingBoxModel(target);

            actualImage = FBTestFirebug.getImageDataFromWindow(win, width, height);
           
            FBTest.compare(expectedImage, actualImage, "The screen must be in expected state");
            FBTestFirebug.testDone("issue68Box.DONE");
        });
    });
}
