function runTest()
{
    FBTest.sysout("issue2978.START");
    FBTest.openNewTab(basePath + "css/2978/issue2978.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableNetPanel(function(win)
        {
            var panel = FW.FirebugChrome.selectPanel("html");

            // Search for 'myElement' within the HTML panel, which
            // automatically expands the tree.
            FBTest.searchInHtmlPanel("myElement", function(sel)
            {
                FBTest.sysout("issue2978; Selection", sel);

                var nodeLabelBox = FW.FBL.getAncestorByClass(sel.anchorNode, "nodeLabelBox");
                var nodeTag = nodeLabelBox.querySelector(".nodeTag");
                FBTest.mouseDown(nodeTag);

                // xxxHonza: why the context menu is not opened?
                //FBTest.rightClick(nodeTag);

                var myElement = win.document.getElementById("myElement");
                var cssPath = FW.FBL.getElementCSSPath(myElement);

                FBTest.compare("html body div.myClass span#myElement",
                    cssPath, "The CSS path must match.");

                FBTest.testDone("issue2978.DONE");
            })
        });
    });
}
