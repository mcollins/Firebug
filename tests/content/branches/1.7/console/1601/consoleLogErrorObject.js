/*
 * issue1601.js
 * test for http://code.google.com/p/fbug/issues/detail?id=1601
 * Author: johnjbarton@johnjbarton.com March 2009
 */

function isEmpty(obj) {
    if (obj)
        return obj.length == 0;
    return true;
}

function testConsoleError()
{

    FBTestFirebug.testDone("issue1601.DONE");
}

// Test entry point.
function runTest()
{
    FBTestFirebug.openNewTab(basePath + "console/1601/consoleLogErrorObject.html", function(win)
    {
        if (!FBTestFirebug.isFirebugOpen())
            FBTestFirebug.openFirebug();
        FBTestFirebug.enableConsolePanel(testConsoleError());
    });
}