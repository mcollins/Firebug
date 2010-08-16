function runTest()
{
    FBTest.sysout("issue369.jsonViewer.START");

    FBTestFirebug.openNewTab(basePath + "net/369/issue369.1.6.htm", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableNetPanel(function(win)
        {
            var options = {
                tagName: "tr",
                classes: "netRow category-xhr hasHeaders loaded",
                counter: 4
            };

            FBTest.waitForDisplayedElement("net", options, function(row)
            {
                verifyContent();
                FBTestFirebug.testDone("issue369.jsonViewer.DONE");
            });

            FBTest.click(win.document.getElementById("testButton1"));
            FBTest.click(win.document.getElementById("testButton2"));
            FBTest.click(win.document.getElementById("testButton3"));
            FBTest.click(win.document.getElementById("testButton4"));
            // xxxHonza: Not implemented yet.
            //FBTest.click(win.document.getElementById("testButton5"));
            //FBTest.click(win.document.getElementById("testButton6"));
        });
    });
}

function verifyContent()
{
    var panelNode = FBTestFirebug.getPanel("net").panelNode;
    var rows = FBTestFirebug.expandElements(panelNode, "netRow", "category-xhr");
    var tabs = FBTestFirebug.expandElements(panelNode, "netInfoJSONTab");

    FBTest.ok(rows.length == 4, "There must be 4 requests in the Net panel.");
    FBTest.ok(tabs.length == 4, "There must be 4 JSON tabs in the net panel."); 

    if (rows.length != 4 || tabs.length != 4)
        return FBTestFirebug.testDone();

    for (var i=0; i<rows.length; i++)
    {
        var row = rows[i];
        var nextSibling = row.nextSibling;
        var jsonBody = FW.FBL.getElementByClass(nextSibling, "netInfoJSONText", "netInfoText");
        var domTable = FW.FBL.getElementByClass(jsonBody, "domTable");

        var label = FW.FBL.getElementByClass(row, "netFullHrefLabel", "netHrefLabel");

        FBTest.ok(domTable, "JSON tree must exist for: " + label.textContent);
        FBTest.ok(textContent, domTable.textContent, "JSON data must be properly displayed.");
    }
}

// ************************************************************************************************

var textContent = "addressObject streetAddress=21 2nd Street city=New York state=NY" +
    "firstName\"John\"lastName\"Smith\"phoneNumbers[\"212 555-1234\", \"646 555-4567\" 0=" +
    "212 555-1234 1=646 555-4567]";
