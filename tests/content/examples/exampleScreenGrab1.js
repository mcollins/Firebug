function runTest()
{
    FBTest.sysout("exampleScreenGrab1.START");
    FBTestFirebug.openNewTab(basePath + "examples/exampleScreenGrab1.html", function(win)
    {
        FBTestFirebug.openFirebug();

        var imgURL = basePath + "examples/exampleScreenGrab1.png";
        FBTestFirebug.loadImageData(imgURL, function(expectedImage)
        {
            var actualImage = FBTestFirebug.getImageDataFromWindow(win, 100, 100);
            FBTest.compare(expectedImage, actualImage, "The screen must be in expected state");
            FBTestFirebug.testDone("exampleScreenGrab1.DONE");
        })
    });
}
