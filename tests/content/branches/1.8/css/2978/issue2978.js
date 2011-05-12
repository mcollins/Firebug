function runTest()
{
    FBTest.sysout("issue2978.START");
    FBTest.openNewTab(basePath + "css/2978/issue2978.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableNetPanel(function(win)
        {
            var panel = FW.Firebug.chrome.selectPanel("html");

            // Search for 'myElement' within the HTML panel, which
            // automatically expands the tree.
            FBTest.searchInHtmlPanel("myElement", function(sel)
            {
                FBTest.sysout("issue2978; Selection:", sel);

                var nodeLabelBox = FW.FBL.getAncestorByClass(sel.anchorNode, "nodeLabelBox");
                var nodeTag = nodeLabelBox.querySelector(".nodeTag");

                // Reset clipboard content and execute "Copy CSS Path" command.
                FBTest.clearClipboard();
                FBTest.executeContextMenuCommand(nodeTag, "fbCopyCSSPath", function()
                {
                    setTimeout(function() {
                        var cssPath = FBTest.getClipboardText();
                        FBTest.compare("html body div.myClass span#myElement", cssPath,
                            "CSS path must be properly copied into the clipboard");
                        FBTest.testDone("issue2978.DONE");
                    }, 1000);
                });
            })
        });
    });
}
