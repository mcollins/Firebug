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

            // Type 'r' and verify auto completion.
            var editor = panel.panelNode.querySelector(".textEditorInner");
            FBTest.sendChar("r", editor);
            FBTest.compare("red", editor.value, "Must be autocompleted to red.");

            // Testing up and down arrows covers issue 3671
            // Type 'arrow-up' and verify completion (should be the previouis
            // color startin with 'r').
            FBTest.sendKey("UP", editor);
            FBTest.compare("royalBlue", editor.value, "Must be autocompleted to royalBlue.");

            // Type 'arrow-down' and verify completion.
            FBTest.sendKey("DOWN", editor);
            FBTest.compare("red", editor.value, "Must be autocompleted again to red.");

            // Type 'home' to move the cursor at the begginging and cancel the selection.
            // Consequently type 'arrow-up' to get the (global) previous color.
            FBTest.sendKey("HOME", editor);
            FBTest.sendKey("UP", editor);
            FBTest.compare("Purple", editor.value, "Must be autocompleted to Purple.");

            // And again go back to 'Red' (now with capital R)
            FBTest.sendKey("DOWN", editor);
            FBTest.compare("Red", editor.value, "Must be autocompleted to Red.");

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
