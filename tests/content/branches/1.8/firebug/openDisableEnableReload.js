/**
 * 1) Disable all panels
 * 2) Open a new tab and Firebug UI on it.
 * 3) Step by step enable alls panels and verify they are enabled.
 * 4) Reload page and check all panels again (must be still enabled).
 */
function runTest()
{
    FBTest.sysout("openDisableEnebleReload.START");
    FBTestFirebug.disableAllPanels();

    FBTestFirebug.setPref("activateSameOrigin", false);
    FBTest.progress("The Activate Same Origin Option is false for this test");

    FBTestFirebug.openNewTab(basePath + "firebug/OpenFirebugOnThisPage.html", function(win)
    {
        FBTest.progress("opened tab for "+win.location);
        FBTestFirebug.openFirebug();

        setTimeout(function delayChecks()
        {
            FBTest.progress("All panels should be disabled: check them");
            // All panels must be disabled.
            checkIsDisabled("console", FW.Firebug.Console);  // console must be disabled first
            checkIsDisabled("script", FW.Firebug.Debugger);
            checkIsDisabled("net", FW.Firebug.NetMonitor);

            FBTest.progress("Enable all panels and check them");

            // Enable and verify.
            try
            {
                enableAndCheck("net", FW.Firebug.NetMonitor);
                enableAndCheck("console", FW.Firebug.Console);
                enableOnly("script", FW.Firebug.Debugger);
            }
            catch (err)
            {
                FBTest.sysout("exception", err);
            }

            setTimeout(function () {
                checkIsEnabled("script", FW.Firebug.Debugger);

                FBTestFirebug.reload(function ()
                {
                    FBTest.progress("reloaded, check isEnabled");
                    // All panels must be still enabled.
                    checkIsEnabled("script", FW.Firebug.Debugger);
                    checkIsEnabled("net", FW.Firebug.NetMonitor);
                    checkIsEnabled("console", FW.Firebug.Console);

                    FBTestFirebug.testDone("openDisableEnebleReload.DONE");
                });
            });
        });
    });
}

function enableOnly(panelName, module)
{
    FBTestFirebug.selectPanelTab(panelName);
    FBTestFirebug.setPanelState(module, panelName, null, true);
}

function enableAndCheck(panelName, module)
{
    enableOnly(panelName, module);
    checkIsEnabled(panelName, module);
}

function checkIsDisabled(panelName, module)
{
    FBTestFirebug.selectPanelTab(panelName);

    FBTest.compare("true", FBTestFirebug.isPanelTabDisabled(panelName), "The "+panelName+" panel's module should be disabled");
    var selectedPanel = FBTestFirebug.getSelectedPanel();

    FBTest.ok(!selectedPanel, "The selected panel should be null");

    var icon = FW.top.document.getElementById('fbStatusIcon').getAttribute(panelName);
    FBTest.ok(!icon || (icon != "on"), "The "+panelName+" should NOT be marked on the Firebug Statusbar Icon");
}

function checkIsEnabled(panelName, module)
{
    FBTestFirebug.selectPanelTab(panelName);

    FBTest.compare("false", FBTestFirebug.isPanelTabDisabled(panelName), "The "+panelName+" panel should be enabled");

    var selectedPanel = FBTestFirebug.getSelectedPanel();
    FBTest.compare(panelName, selectedPanel.name, "The selected panel should be "+panelName);
    if (selectedPanel.disabledBox)
        FBTest.compare("true", selectedPanel.disabledBox.getAttribute('collapsed'), "The "+panelName+" should not have the disabled message");

    var icon = FW.top.document.getElementById('fbStatusIcon').getAttribute(panelName);
    FBTest.compare("on", icon+"", "The "+panelName+" should be marked on the Firebug Statusbar Icon");
}
