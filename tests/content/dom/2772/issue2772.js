function runTest()
{
    FBTest.sysout("issue2772.START");
    FBTestFirebug.openNewTab(basePath + "dom/2772/issue2772.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FW.FirebugChrome.selectPanel("dom");

        FBTestFirebug.reload(function()
        {
            var panel = FBTestFirebug.getPanel("dom");
            onPropertyDisplayed(panel, "_testObject", function(row)
            {
                onPropertyDisplayed(panel, "innerObject", function(row)
                {
                    FBTest.click(FW.FBL.getElementByClass(row, "objectLink-object"));

                    FBTestFirebug.reload(function()
                    {
                        var panel = FBTestFirebug.getPanel("dom");
                        onPropertyDisplayed(panel, "yetAnotherObject", function(row)
                        {
                            FBTest.ok(true, "yetAnotherObject object must be visible now.");
                            FBTestFirebug.testDone("issue2772.DONE");
                        });
                    });
                });

                FBTest.click(FW.FBL.getElementByClass(row, "memberLabel", "userLabel"));
            });
        });
    });
}

function onPropertyDisplayed(panel, propName, callback)
{
    var row = getPropertyRow(panel, propName);
    if (row)
        return callback(row);

    var panel = FBTestFirebug.getPanel("dom");
    var recognizer = new MutationRecognizer(panel.document.defaultView,
        "Text", {}, propName);
    recognizer.onRecognizeAsync(callback);
}

function getPropertyRow(panel, propName)
{
    var rows = FW.FBL.getElementsByClass(panel.panelNode, "memberRow", "userRow");
    for (var i=0; i<rows.length; i++)
    {
        var row = rows[i];
        var label = FW.FBL.getElementByClass(row, "memberLabel", "userLabel");
        if (label.textContent == propName)
            return row;
    }
    return null;
}
