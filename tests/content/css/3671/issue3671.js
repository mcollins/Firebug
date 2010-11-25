function runTest()
{
    FBTest.sysout("issue3671.START");
    FBTest.openNewTab(basePath + "css/3671/issue3671.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.selectPanel("html");

        selectElementInHtmlPanel("Inspect This Element", function(node)
        {
            var panel = FBTest.selectSidePanel("css");
            var names = panel.panelNode.querySelectorAll(".cssPropName");
            FBTest.compare(1, names.length, "There must be just one CSS property.");

            // Click the CSS name to open the inline editor.
            FBTest.synthesizeMouse(names[0]);

            // Type 'del' to remove the current selection.
            var editor = panel.panelNode.querySelector(".textEditorInner");
            FBTest.sendKey("DELETE", editor);
            FBTest.compare("", editor.value, "The editor must be empty now.");

            // Type 'arrow-up' and verify completion (must be completed to the last css
            // property name that is in Firebug's internal list).
            FBTest.sendKey("UP", editor);
            FBTest.sendKey("UP", editor);
            FBTest.compare("text-transform", editor.value,
                "Must be autocompleted to -moz-transform-origin.");

            FBTest.testDone("issue3671.DONE");
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
