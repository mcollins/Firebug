function runTest()
{
    FBTest.sysout("issue3652.START");
    FBTest.openNewTab(basePath + "css/3652/issue3652.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.selectPanel("html");

        selectElementInHtmlPanel("Inspect This Element", function(node)
        {
            var panel = FBTest.selectSidePanel("css");
            var values = panel.panelNode.querySelectorAll(".cssPropValue");
            FBTest.compare(1, values.length, "There must be just one CSS value.");

            // Click the CSS value to open the inline editor.
            FBTest.synthesizeMouse(values[0]);

            // Type 'r' and verify auto competion.
            var editor = panel.panelNode.querySelector(".textEditorInner");
            FBTest.sendChar("r", editor);
            FBTest.compare("red", editor.value, "Must be autocompleted to red.");

            FBTest.testDone("issue3652.DONE");
        });
    });
}

// xxxHonza: could be shared API if proved.
function selectElementInHtmlPanel(text, callback)
{
    FBTest.searchInHtmlPanel(text, function(sel)
    {
        // Click on the element to make sure it's selected.
        var nodeLabelBox = FW.FBL.getAncestorByClass(sel.anchorNode, "nodeLabelBox");
        var nodeTag = nodeLabelBox.querySelector(".nodeTag");
        FBTest.mouseDown(nodeTag);

        var nodeBox = FW.FBL.getAncestorByClass(sel.anchorNode, "nodeBox");
        callback(nodeBox);
    });
}
