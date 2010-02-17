function runTest()
{
    FBTest.sysout("exampleScreenGrab1.START");
    FBTestFirebug.openNewTab(basePath + "examples/exampleScreenGrab1.html", function(win)
    {
        FBTestFirebug.openFirebug();

        // Helper code for creating the image file.
        //var file = pickFile();
        //if (file)
        //    FBTestFirebug.saveWindowImageToFile(win, 100, 100, file.path);

        var imgURL = basePath + "examples/exampleScreenGrab1.png";
        FBTestFirebug.loadImageData(imgURL, function(expectedImage)
        {
            var actualImage = FBTestFirebug.getImageDataFromWindow(win, 100, 100);
            FBTest.compare(expectedImage, actualImage, "The screen must be in expected state");
            FBTestFirebug.testDone("exampleScreenGrab1.DONE");
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
