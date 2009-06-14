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

    var lookForMemberRow = new MutationRecognizer(panelDoc.defaultView, 'tr', {class: "memberRow"}, '"something"');

    lookForMemberRow.onRecognize(function sawLogRow(elt)
    {
         FBTest.sysout("matched something", elt);
         setTimeout(function editSomething()
         {
             var label = FW.FBL.getElementByClass(elt, "memberLabel");
             var lookForInput = new MutationRecognizer(panelDoc.defaultView, 'input', {class: "fixedWidthEditor"});
             lookForInput.onRecognize(function sawInput(elt)
             {
                 FBTest.compare('"something"', elt.value, "The INPUT element value should be \"something\"");
                 elt.value = '"otherThing"';
                 FBTest.click(elt.parentNode);
                 setTimeout(function allowRefocus()
                 {
                     var lookForOtherMemberRow = new MutationRecognizer(panelDoc.defaultView, 'tr', {class: "memberRow"}, '"otherthing"');
                     lookForOtherMemberRow.onRecognize(function sawOtherthing(elt)
                     {
                         FBTest.compare('\"otherThing\"', elt.textContent, "The new value should be set");
                         FBTest.testDone("1738 DONE");
                     });
                     FBTest.progress("Changed the value, now hit return key");
                     FBTest.pressKey(13);
                 });

             });

             FBTest.dblclick(label);
         });
    });

    var panel = FBTestFirebug.getSelectedPanel();
    panel.rebuild();  // This is cheating, should push the buttons
}

function editSomething()
{
}
