function runTest()
{
    FBTest.sysout("issue2948.START");

    FBTest.openNewTab(basePath + "console/2948/issue2948.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var panel = FW.FirebugChrome.selectPanel("console");

            // Define individual async tasks.
            var tasks = new FBTest.TaskList();
            tasks.push(executeResponse, win);
            tasks.push(openPopup, win);
            tasks.push(executeResponse, win);

            // Run them all.
            tasks.run(function() {
                FBTest.testDone("issue2948.DONE");
            })
        });
    });
}

function executeResponse(callback, win)
{
    // Wait for request being displayed in the Console panel.
    FBTestFirebug.waitForDisplayedElement("console", null, function(row)
    {
        FBTest.progress("Cool, XHR log has been created.");

        callback();
    });

    FBTest.click(win.document.getElementById("executeRequest"));
}

function openPopup(callback, win)
{
    win.document.addEventListener("popup-loaded", function()
    {
        FBTest.progress("Great, the popup is loaded");

        // close the popup window.
        win.popup.close();
        callback();
    }, true);

    FBTest.click(win.document.getElementById("openPopup"));
}
