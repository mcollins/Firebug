function runTest()
{
    FBTest.sysout("issue4542.START");
    FBTest.openNewTab(basePath + "html/4542/issue4542.html", function(win)
    {
        FBTest.openFirebug();
        var panel = FBTest.selectPanel("html");

        FBTest.selectElementInHtmlPanel("sayHi", function(node)
        {
            var attributes = node.querySelectorAll(".nodeAttr");
            var i;

            hasOnClickAttribute = false;
            for (i=0; i<attributes.length; i++)
            {
                var nodeName = attributes[i].querySelector(".nodeName");
                if (nodeName.textContent == "onclick")
                {
                    hasOnClickAttribute = true;
                    break;
                }
            }

            if (FBTest.ok(hasOnClickAttribute, "There must be an 'onclick' attribute"))
            {
                var nodeValue = attributes[i].querySelector(".nodeValue");
                // Click the attribute value to open the inline editor
                FBTest.synthesizeMouse(nodeValue);

                var editor = panel.panelNode.querySelector(".textEditorInner");
                if (FBTest.ok(editor, "Editor must be available now"))
                {
                    FBTest.sendKey("HOME", editor);
                    // Move text cursor between the opening bracket and 'output' of
                    // 'getElementById(output')'
                    for (var i=0; i<37; i++)
                        FBTest.sendKey("RIGHT", editor);
      
                    // Enter a single quote
                    FBTest.sendChar("'", editor);

                    if (!FBTest.ok(editor &&editor.value.search("var output") != -1,
                        "Editor must still be available and must not jump to the next editable " +
                        "item when a single quote is entered"))
                    {
                        FBTest.synthesizeMouse(nodeValue);
                        editor = panel.panelNode.querySelector(".textEditorInner");
                    }

                    FBTest.compare(/getElementById\('output'\)/, editor.value, "Single quote must be entered");
    
                    // Move text cursor before the 'H' of 'Hi'
                    for (var i=0; i<61; i++)
                        FBTest.sendKey("RIGHT", editor);

                    // Enter a double quote
                    FBTest.sendChar("\"", editor);

                    if (!FBTest.ok(editor && editor.value.search("var output") != -1,
                        "Editor must still be available and must not jump to the next editable " +
                        "item when a double quote is entered"))
                    {
                        FBTest.synthesizeMouse(nodeValue);
                        editor = panel.panelNode.querySelector(".textEditorInner");
                    }

                    FBTest.compare(/"Hi/, editor.value, "Double quote must be entered");
                }

                FBTest.testDone("issue4542.DONE");
            }
        });
    });
}