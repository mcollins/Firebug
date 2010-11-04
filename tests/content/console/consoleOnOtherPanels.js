/**
 * 1) Open a new tab and Firebug on it.
 * 2) Select and enable the Console panel.
 * 3) Verify visibility of the console preview (must be collapsed).
 * 4) Switch to the HTML panel.
 * 5) Verify visibility of the console preview (must be visible).
 * 6) Switch to the Console panel and disable it.
 * 7) Verify visibility of the console preview (must be collapsed).
 * 8) Switch to the HTML panel.
 * 9) Verify visibility of the console preview (must be collapsed).
 */
function runTest()
{
    FBTest.sysout("consoleOnOtherPanels.START");
    FBTest.openNewTab(basePath + "console/consoleOnOtherPanels.html", function(win)
    {
        FBTest.openFirebug();

        var tasks = new FBTest.TaskList();
        tasks.push(enableConsole);
        tasks.push(disableConsole);

        tasks.run(function() {
            FBTest.testDone("consoleOnOtherPanels.DONE");
        });
    });
}

// ************************************************************************************************
// Tasks

function enableConsole(callback)
{
    FBTest.selectPanel("console");
    FBTest.enableConsolePanel(function()
    {
        verifyConsolePreview(false);
        FBTest.selectPanel("html");

        FBTest.clickConsolePreviewButton();
        verifyConsolePreview(true);

        callback();
    });
}

function disableConsole(callback)
{
    FBTest.selectPanel("console");
    FBTest.disableConsolePanel(function()
    {
        verifyConsolePreview(false);
        FBTest.selectPanel("html");

        FBTest.clickConsolePreviewButton();
        verifyConsolePreview(false);

        callback();
    });
}

// ************************************************************************************************
// Helpers

function verifyConsolePreview(shouldBeVisible)
{
    var preview = FW.document.getElementById("fbCommandPopup");
    var splitter = FW.document.getElementById("fbCommandPopupSplitter");

    FBTest.ok(shouldBeVisible ? !splitter.collapsed : splitter.collapsed,
        "Preview splitter must be " + (shouldBeVisible ? "visible" : "hidden"));
    FBTest.ok(shouldBeVisible ? !preview.collapsed : preview.collapsed,
        "Console preview must be " + (shouldBeVisible ? "visible" : "hidden"));
}
