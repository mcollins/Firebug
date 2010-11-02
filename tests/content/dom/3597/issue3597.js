function runTest()
{
    FBTest.sysout("issue3597.START");
    FBTest.openNewTab(basePath + "dom/3597/issue3597.html", function(win)
    {
        FBTest.openFirebug();
        var panel = FBTest.selectPanel("dom");
        var panelNode = panel.panelNode;

        expandProperty(panel, "_testString", "childObj", function()
        {
            expandProperty(panel, "childObj", "lastItem", function()
            {
                FBTest.click(win.document.getElementById("testButton"));
                panel.rebuild(true);

                // Wait till the _testString is displayed again.
                onPropertyDisplayed(panel, "_testString", function(row)
                {
                    var row = getPropertyRow(panel, "_testString");

                    // The _testString must have 'string' type now.
                    FBTest.compare(
                        /_testString\"\{\"childObj\"\:\{\"a\"\:5\,\"b\"\:4\,\"lastItem\"\:5\}\}/,
                        row.textContent, "The object must be displayed as a string now");

                    FBTest.testDone("issue3597.DONE");
                });
            });
        });
    });
}

//xxxHonza: should be part of FBTest namespace. See also dom/2772
function expandProperty(panel, propName, lastChild, callback)
{
    onPropertyDisplayed(panel, lastChild, callback);
    var row = getPropertyRow(panel, propName);
    var propLabel = row.querySelector(".memberLabel.userLabel");
    FBTest.click(propLabel);
}

function getPropertyRow(panel, propName)
{
    var rows = panel.panelNode.querySelectorAll(".memberRow.userRow");
    for (var i=0; i<rows.length; i++)
    {
        var row = rows[i];
        var label = row.querySelector(".memberLabel.userLabel");
        if (label.textContent == propName)
            return row;
    }
    return null;
}

function onPropertyDisplayed(panel, propName, callback)
{
    //var row = getPropertyRow(panel, propName);
    //if (row)
    //    return callback(row);

    var panel = FBTestFirebug.getPanel("dom");
    var recognizer = new MutationRecognizer(panel.document.defaultView,
        "Text", {}, propName);
    recognizer.onRecognizeAsync(callback);
}
