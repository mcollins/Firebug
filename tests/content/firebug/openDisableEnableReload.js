
function checkIsDisabled(panelName, module)
{
    var panel = FW.FirebugChrome.selectPanel(panelName);
    var enabled = module.isHostEnabled(FW.FirebugContext);
    FBTest.ok(!enabled, "The "+panelName+" panel should be disabled");
    var collapsed = FW.Firebug.ModuleManagerPage.box.getAttribute("collapsed");  // 'true' means hidden == enabled
    FBTest.ok(collapsed!="true", "The "+panelName+" should have the disabled message");
}

function checkIsEnabled(panelName, module)
{
    var panel = FW.FirebugChrome.selectPanel(panelName);
    var enabled = module.isHostEnabled(FW.FirebugContext);
    FBTest.ok(enabled, "The "+panelName+" panel should be enabled");
    var collapsed = FW.Firebug.ModuleManagerPage.box.getAttribute("collapsed");  // 'true' means hidden == enabled
    FBTest.compare(collapsed, "true", "The "+panelName+" should not have the disabled message");
}

function openDisableEnableReload()
{
    var openDisableEnableReloadURL = FBTest.getHTTPURLBase()+"firebug/OpenFirebugOnThisPage.html";

    var openDisableEnableReload = new FBTest.Firebug.TestHandlers("openDisableEnableReload");

    // Actual test operations
    openDisableEnableReload.add( function onNewPage(event)
    {
        FBTrace.sysout("onNewPage starts", event);
        disableAllPanels();  // also opens firebug

        checkIsDisabled("console", FW.Firebug.Console);
        checkIsDisabled("net", FW.Firebug.NetMonitor);
        checkIsDisabled("script", FW.Firebug.Debugger);

        enableScriptPanel();
        enableNetPanel();
        enableConsolePanel();

        checkIsEnabled("console", FW.Firebug.Console);
        checkIsEnabled("net", FW.Firebug.NetMonitor);
        checkIsEnabled("script", FW.Firebug.Debugger);

        reload(function (){openDisableEnableReload.fire("reloaded");});
    });

    openDisableEnableReload.add( function reloaded()
    {
        // todo check content
        checkIsEnabled("console", FW.Firebug.Console);
        checkIsEnabled("net", FW.Firebug.NetMonitor);
        checkIsEnabled("script", FW.Firebug.Debugger);
        openDisableEnableReload.done();
    });

    openDisableEnableReload.fireOnNewPage("onNewPage", openDisableEnableReloadURL, null);
}



//------------------------------------------------------------------------
// Auto-run test

function runTest()
{
    FBTest.sysout("Activation.started");
    FBTrace.sysout("activation.js FBTest", FBTest);

    if (FBTest.FirebugWindow)
        FBTest.ok(true, "We have the Firebug Window: "+FBTest.FirebugWindow.location);
    else
        FBTest.ok(false, "No Firebug Window");

    // Auto run sequence
    openDisableEnableReload();
}
