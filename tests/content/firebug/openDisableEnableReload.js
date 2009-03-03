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
    FBTestFirebug.openNewTab(basePath + "firebug/OpenFirebugOnThisPage.html", function(win)
    {
        FBTestFirebug.openFirebug();

        // All panels must be disabled.
        checkIsDisabled("script", FW.Firebug.Debugger);
        checkIsDisabled("net", FW.Firebug.NetMonitor);
        checkIsDisabled("console", FW.Firebug.Console);

        FBTest.progress("enableAndCheck");

        // Enable and verify.
        try
        {
            enableAndCheck("script", FW.Firebug.Debugger);
            enableAndCheck("net", FW.Firebug.NetMonitor);
            enableAndCheck("console", FW.Firebug.Console);
        }
        catch (err)
        {
            FBTest.sysout("exception", err);
        }

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
}

function enableAndCheck(panelName, module)
{
    var name = panelName.toUpperCase();
    FBTestFirebug.selectPanel(panelName);
    FBTestFirebug.updateModelState(module, null, true);
    checkIsEnabled(panelName, module);
}

function checkIsDisabled(panelName, module)
{
    var name = panelName.toUpperCase();
    var panel = FW.FirebugChrome.selectPanel(panelName);
    var enabled = module.isEnabled(FW.FirebugContext);
    FBTest.ok(!enabled, "The "+name+" panel should be disabled");
    var collapsed = null;
    if (module.disabledPanelPage.panelNode)
        collapsed = module.disabledPanelPage.panelNode.getAttribute("collapsed");  // 'true' means hidden == enabled
    FBTest.ok(collapsed!="true", "The "+name+" should have the disabled message");
    var icon = FW.document.getElementById('fbStatusIcon').getAttribute(panelName);
    FBTest.ok(!icon || (icon != "on"), "The "+name+" should NOT be marked on the Firebug Statusbar Icon");
}

function checkIsEnabled(panelName, module)
{
    var name = panelName.toUpperCase();
    var panel = FW.FirebugChrome.selectPanel(panelName);
    var enabled = module.isEnabled(FW.FirebugContext);
    FBTest.ok(enabled, "The "+name+" panel should be enabled");
    var collapsed = null;
    if (module.disabledPanelPage.panelNode)
        collapsed = module.disabledPanelPage.panelNode.getAttribute("collapsed");  // 'true' means hidden == enabled
    FBTest.compare(collapsed, "true", "The "+name+" should not have the disabled message");
    var icon = FW.document.getElementById('fbStatusIcon').getAttribute(panelName);
    FBTest.compare(icon+"", "on", "The "+name+" should be marked on the Firebug Statusbar Icon");
}
