var testProp = "0123456789012345678901234567890123456789012345678901234567890123456789";
function runTest()
{
    FBTest.sysout("issue3029.START");
    FBTest.openNewTab(basePath + "console/3029/issue3029.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableConsolePanel(function(win)
        {
            var panel = FW.FirebugChrome.selectPanel("console");
            onTextDisplayed(panel, "myProperty", function(row)
            {
                // Expand the property (the lable must be clicked).
                var label = row.querySelector(".memberLabel.userLabel");
                FBTest.click(label);

                var value = row.querySelector(".memberValueCell");
                FBTest.compare("\"" + testProp + "\"",
                    value.textContent, "Full value must be displayed now.");

                FBTest.testDone("issue3029.DONE");
            });

            // Execute test.
            FBTest.click(win.document.getElementById("testButton"));
        });
    });
}

// xxxHonza: this could be part of the shared lib.
function onTextDisplayed(panel, text, callback)
{
    var rec = new MutationRecognizer(panel.document.defaultView, "Text", {}, text);
    rec.onRecognizeAsync(callback);
}
