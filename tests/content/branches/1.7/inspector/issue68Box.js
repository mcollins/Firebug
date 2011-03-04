function runTest()
{
    FBTest.sysout("issue68Box.START");
        
    FBTestFirebug.openNewTab(basePath + "inspector/InspectorTestIframe.htm?url=Issue68BoxExpected.htm", function(win)
    {
        var actualImage, expectedImage,
            ifr = win.document.getElementById('testIframe'),
            width = ifr.contentDocument.body.clientWidth,
            height = ifr.contentDocument.body.clientHeight;
            
        expectedImage = FBTestFirebug.getImageDataFromWindow(ifr.contentWindow, width, height);
        
        FBTestFirebug.openURL(basePath + "inspector/InspectorTestIframe.htm?url=Issue68BoxActual.htm", function(win)
        {
            FBTestFirebug.openFirebug();

            ifr = win.document.getElementById('testIframe');

            var target = ifr.contentDocument.getElementById("testTarget1");

            // To get full html for expected page break here and use: ifr.contentDocument.documentElement.innerHTML            
            
            FBTestFirebug.inspectUsingBoxModel(target);

            actualImage = FBTestFirebug.getImageDataFromWindow(ifr.contentWindow, width, height);

            FBTest.compare(expectedImage, actualImage, "The screen must be in expected state");
            FBTestFirebug.testDone("issue68Box.DONE");
        });
    });
}