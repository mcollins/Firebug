// 1) Load test case page.
// 2) Select the DOM panel.
// 3) Double click on specific property row to start editing.
// 4) Set new value and press Enter to finish editor.
// 5) Verify new value.

function runTest()
{
    FBTest.sysout("1738.START");
    FBTestFirebug.openNewTab(basePath + "dom/1738/main.html", function(win)
    {
        // Open Firebug UI
        FBTestFirebug.pressToggleFirebug(true);

        FBTestFirebug.selectPanel("dom");
        setTimeout(function allowSelectPanelToComplete()
        {
            var panel = FBTestFirebug.getSelectedPanel();
            FBTest.progress("Panel Select complete: panel is "+panel.name)
            fireTest(win);
        });
    });
}

function fireTest(win)
{
    var panelDoc = FBTestFirebug.getPanelDocument();
    var otherThing = '"otherThing"';

    var lookForMemberRow = new MutationRecognizer(panelDoc.defaultView, 'tr',
        {"class": "memberRow"}, '"something"');
    lookForMemberRow.onRecognize(function sawLogRow(elt)
    {
        FBTest.progress("Matched something in a memberRow");

        var label = FW.FBL.getElementByClass(elt, "memberLabel");
        FBTest.sysout("got label "+label.textContent, label);
        FBTest.compare("topLevelVar", label.textContent, "The member label is 'topLevelVar'");

        var lookForInput = new MutationRecognizer(panelDoc.defaultView, 'input',
            {"class": "fixedWidthEditor"});
        lookForInput.onRecognize(function sawInput(elt)
        {
            FBTest.compare('"something"', elt.value, "The INPUT element value should be \"something\"");
            elt.value = otherThing;
            FBTest.progress("Click outside the edit box");
            FBTest.click(elt.parentNode);
            setTimeout(function allowRefocus()
            {
                var lookForOtherMemberRow = new MutationRecognizer(panelDoc.defaultView, 'tr',
                    {"class": "memberRow"}, otherThing);
                lookForOtherMemberRow.onRecognize(function sawOtherthing(elt)
                {
                    var foundOtherThing = (elt.textContent.indexOf(otherThing) != -1);
                    FBTest.ok(foundOtherThing, "The new value+"+otherThing+" should be set");
                    FBTestFirebug.testDone("1738 DONE");
                });
                FBTest.progress("Changed the value, now hit return key");
                FBTest.pressKey(13);
            });

        });

        setTimeout(function editSomething()
        {
            FBTest.progress("Double click the line to bring up the editor ");
            FBTest.sysout("FBTest ", FBTest);
            if (FBTest.dblclick(label))
                FBTest.progress("SUCCESS Double click the line to bring up the editor");
            else
                FBTest.progress("Double click was aborted by preventDefault");
        });
    });

    var panel = FBTestFirebug.getSelectedPanel();
    FBTestFirebug.reload();
}

function editSomething()
{
}
