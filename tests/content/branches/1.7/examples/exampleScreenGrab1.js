function runTest()
{
    FBTest.sysout("exampleScreenGrab1.START");
    FBTest.openNewTab(basePath + "examples/exampleScreenGrab1.html", function(win)
    {
        FBTest.openFirebug();

        // Helper code for creating the image file.
        //var file = pickFile();
        //if (file)
        //    FBTest.saveWindowImageToFile(win, 100, 100, file.path);

        var imgURL = basePath + "examples/exampleScreenGrab1.png";
        FBTest.loadImageData(imgURL, function(expectedImage)
        {
            var actualImage = FBTest.getImageDataFromWindow(win, 100, 100);
            FBTest.compare(expectedImage, actualImage, "The screen must be in expected state");
            FBTest.testDone("exampleScreenGrab1.DONE");
        })
    });
}

function pickFile()
{
    var nsIFilePicker = Ci.nsIFilePicker;
    var fp = Cc["@mozilla.org/filepicker;1"].getService(nsIFilePicker);
    fp.init(window, null, nsIFilePicker.modeSave);
    fp.appendFilter("PNG Images","*.png;");
    fp.appendFilters(nsIFilePicker.filterAll);
    fp.filterIndex = 1;
    fp.defaultString = "exampleScreenGrab1.png";

    var rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace)
        return fp.file;

    return null;
}
