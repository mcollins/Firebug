function runTest()
{
    FBTestFirebug.openNewTab(basePath + "script/breakpoints/testPage.html", function(win)
    {
        FBTest.sysout("breakpoints.breakSimple.START");

        // Open Firebug UI, enable Script panel and reload.
        FBTestFirebug.openFirebug();
        FBTestFirebug.clearCache();
        FBTestFirebug.enableScriptPanel(function(win)
        {
            // Execute a method with debuggger; keyword in it. This is done
            // asynchronously since it stops the execution context.
            win.wrappedJSObject.setTimeout(win.wrappedJSObject.breakSimple, 1);

            // Asynchronously check the breakpoint.
            window.setTimeout(function() 
            {
                var panel = FBTestFirebug.selectPanel("script");
                var sourceBox = panel.getSourceBoxByURL(panel.location.href);
                var sourceViewport = FW.FBL.getChildByClass(sourceBox, "sourceViewport");
                var rows = sourceViewport.childNodes;

                var row = null;
                for (var i=0; i<rows.length; i++)
                {
                    var source = FW.FBL.getChildByClass(rows[i], "sourceRowText");
                    if (source.textContent.indexOf("@breakSimpleRow") > 0) 
                    {
                        row = rows[i];
                        break;
                    }
                }

                FBTest.ok(row, "There must be a row with execution context");
                if (!row)
                    return FBTestFirebug.testDone();

                var exeline = row.getAttribute("exeline");
                FBTest.compare(exeline, "true", "The row must be marked as the execution line.");

                var sourceLine = FW.FBL.getChildByClass(row, "sourceLine");
                FBTest.compare(sourceLine.textContent, panel.executionLineNo, "The execution line mus the correct");

                FBTestFirebug.testDone("breakpoints.breakSimple.DONE");
            }, 300);
        });
    })
}

function onPanelNavigate(object, panel)
{
}
