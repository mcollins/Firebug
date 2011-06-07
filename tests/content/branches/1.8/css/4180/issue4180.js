function runTest()
{
    FBTest.sysout("issue4180.START");
    FBTest.openNewTab(basePath + "css/4180/issue4180.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.selectPanel("html");

        selectElementInHtmlPanel("element1", function(node)
        {
            var panel = FBTest.selectSidePanel("css");
            var values = panel.panelNode.querySelectorAll(".cssPropValue");

            FBTest.compare(
                "#8C8CFF -moz-linear-gradient(135deg, #788CFF, #B4C8FF) repeat scroll 0 0",
                values[0].innerHTML,
                "The values must be in the order: background-color, background-image, " +
                    "background-repeat, background-attachment, background-position."
            );

            FBTest.testDone("issue4180.DONE");
        });
    });
}

//xxxHonza: could be shared API if proved.
function selectElementInHtmlPanel(text, callback)
{
    FBTest.searchInHtmlPanel(text, function(sel)
    {
        FBTest.sysout("issue4180; selection:", sel);

        // Click on the element to make sure it's selected.
        var nodeLabelBox = FW.FBL.getAncestorByClass(sel.anchorNode, "nodeLabelBox");
        var nodeTag = nodeLabelBox.querySelector(".nodeTag");
        FBTest.mouseDown(nodeTag);

        var nodeBox = FW.FBL.getAncestorByClass(sel.anchorNode, "nodeBox");
        callback(nodeBox);
    });
}