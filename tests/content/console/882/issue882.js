function runTest() // special function name used by FBTest
{
    FBTest.sysout("882.START");  // These messages are shown in the trace console if DBG_TESTCASE is true

    // basePath is set by FBTestFirebug
    FBTestFirebug.openNewTab(basePath + "console/882/issue882.html", function(win)
    {
        var panelWindow = FBTestFirebug.getPanelDocument().defaultView;

        // Use Chromebug to inspect the Firebug UI for elements you want to verify
        var lookForLogRow = new MutationRecognizer(panelWindow, 'span', {"class": "objectBox-text"}, "external");

        lookForLogRow.onRecognize(function sawLogRow(elt)
        {
            FBTest.progress("matched objectBox-text", elt);  // shown in the Test Console
            checkConsoleSourceLinks(elt);
        });

        FBTestFirebug.selectPanel("console");
        FBTestFirebug.enableConsolePanel(function(win) // causes reload
        {
            FBTestFirebug.selectPanel("console");
            FBTest.progress("Loaded "+win.location);
        });
    });
}

function checkConsoleSourceLinks(elt)
{
    FBTest.progress("checking source links");
    var panelNode = elt.parentNode.parentNode;
    FBTest.sysout("Using panelNode "+panelNode.getAttribute("class"));
    var links = panelNode.getElementsByClassName("objectLink-sourceLink");
    FBTest.compare("2 sourcelinks", links.length+" sourcelinks", "The test case shows two source links");

    var initLink = links[0].firstChild; // after R4847 there is a div around the text of the link
    FBTest.compare("issue882.html (line 10)", initLink.innerHTML, "Line 10 should be linked");

    var externalLink = links[1].firstChild;
    FBTest.compare("external.js (line 2)", externalLink.innerHTML, "Line 2 of external.js should be linked");

    // Now set a new recognizer for the highlight in the script panel
    var panelWindow = FBTestFirebug.getPanelDocument().defaultView;
    var sourceLineHighlight = new MutationRecognizer(panelWindow, 'div', {"class": "jumpHighlight"});

    sourceLineHighlight.onRecognize(function sawHighlight(elt)
        {
            FBTest.compare("sourceRow jumpHighlight", elt.getAttribute("class"), "Line is highlighted");  // shown in the Test Console
            FBTestFirebug.testDone("882 DONE");
        });

    FBTest.progress("Click the 'external' source link");
    FBTest.click(externalLink);  // click the source link to test the highlighting
}
