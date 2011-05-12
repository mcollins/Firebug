function runTest()
{
    FBTest.sysout("issue2976.START");
    FBTest.openNewTab(basePath + "css/2976/issue2976.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableNetPanel(function(win)
        {
            FW.Firebug.chrome.selectPanel("html");

            // Search for 'myElement' within the HTML panel, which
            // automatically expands the tree.
            FBTest.searchInHtmlPanel("myElement", function(sel)
            {
                // Click on the element to make sure it's selected.
                var nodeLabelBox = FW.FBL.getAncestorByClass(sel.anchorNode, "nodeLabelBox");
                var nodeTag = nodeLabelBox.querySelector(".nodeTag");
                FBTest.mouseDown(nodeTag);

                // Reset clipboard content.
                FBTest.clearClipboard();

                var stylePanel = FW.Firebug.chrome.selectSidePanel("css");
                var node = stylePanel.panelNode.querySelector(".cssSelector");
                FBTest.executeContextMenuCommand(node, "fbCopyStyleDeclaration", function()
                {
                    setTimeout(function() {
                        var cssDecl = FBTest.getClipboardText();
                        var expected = /background-color: LightYellow;\s*color: red;\s*font-weight: bold;/;
                        FBTest.compare(expected, cssDecl,
                            "CSS declaration must be properly copied into the clipboard");
                        FBTest.testDone("issue2976.DONE");
                    }, 1000);
                });
            })
        });
    });
}
