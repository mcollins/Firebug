// Test entry point.
function runTest()
{
    FBTest.sysout("closeOpenOpenSwitchTabsTwice.START");

    FBTestFirebug.enableAllPanels();
    FBTestFirebug.closeFirebugOnAllTabs(); // use the existing tab as the "no Firebug tab"

    var tabbrowser = FW.getBrowser();
    var noFirebugTab = tabbrowser.selectedTab;

    FBTestFirebug.openNewTab(basePath + "firebug/NeverOpenFirebugOnThisPage.html", function(win)
    {
        FBTest.progress("Opened reference window that will not have Firebug");

        FBTestFirebug.openNewTab(basePath + "firebug/OpenFirebugOnThisPage.html", function(win)
                {
                    FBTest.progress("Open Firebug UI in this new tab");
                    FBTestFirebug.openFirebug();

                    var theFirebuggedTab = tabbrowser.selectedTab;

                    FBTest.progress("Switch back to the first tab.");
                    tabbrowser.selectedTab = noFirebugTab;

                    FBTest.ok(!FBTestFirebug.isFirebugOpen(), "Firebug UI must be closed.");

                    checkIconOff('console');
                    checkIconOff('script');
                    checkIconOff('net');

                    FBTest.progress("Switch again, to the Firebugged tab");

                    tabbrowser.selectedTab = theFirebuggedTab;
                    FBTest.ok(FBTestFirebug.isFirebugOpen(), "Firebug UI must be opened now.");

                    checkIconOn('console');
                    checkIconOn('script');
                    checkIconOn('net');

                    FBTestFirebug.testDone("closeOpenOpenSwitchTabsTwice.DONE");
                });
    });
}

function checkIconOff(panelName)
{
    var icon = FW.document.getElementById('fbStatusIcon').getAttribute(panelName);
    FBTest.ok(!icon || (icon != "on"), "The "+panelName+" should NOT be marked on the Firebug Statusbar Icon");
}

function checkIconOn(panelName)
{
    var icon = FW.document.getElementById('fbStatusIcon').getAttribute(panelName);
    FBTest.compare(icon+"", "on", "The "+panelName+" should be marked on the Firebug Statusbar Icon");}