var testWindow = null;
function runTest()
{
    FBTest.sysout("scriptWatch1.startTest");

    // Create channel (DOM Element) for communication with another window.
    channel = document.getElementById("channel");

    // Open another window with the test page. Part of the test is
    // a breakpoint, so we have to use another window to not stop the test.
    var href = window.location.href;
    var url = href.substr(0, href.length - 5) + "Win.html";
    testWindow = window.open(url, "FirebugTest-ScriptWatch1", 
        "width=550,height=700,menubar=yes,toolbar=yes,directories=yes");

    // Listen for callback messages.
    channel.addEventListener("FirebugTestCallback", function(event) 
    {
        enablePrivilege("UniversalXPConnect");
        FBTest.sysout("scriptWatch1.FirebugTestCallback (breakpoint active)", event);

        // Set flag so the state of the test-window isn't changed after the second reload.
        reloaded = true;

        // Wait till the test window reloads and breaks on the breakpoint.
        setTimeout(onStep1, 6000);
    }, true);
}

function onStep1()
{
    enablePrivilege("UniversalXPConnect");
    FBTrace.sysout("scriptWatch1.step1: check watch panel");

    checkBreakpoint();
    checkWatchPanel();

    // Continue debugger.
    testWindow.fireunit.key(testWindow.fireunit.chromeID("fbContinueButton"), 119);
    setTimeout(onStep2, 3000);
}

function onStep2()
{
    enablePrivilege("UniversalXPConnect");
    FBTrace.sysout("scriptWatch1.step2: check watch panel, remove breakpoint");

    checkWatchPanel();

    // Reset breakpoint 
    testWindow.setBreakpoint();
    checkWatchPanel();

    // Continue debugger.
    testWindow.fireunit.key(testWindow.fireunit.chromeID("fbContinueButton"), 119);
    setTimeout(onStep3, 3000);
}

function onStep3()
{
    enablePrivilege("UniversalXPConnect");
    FBTrace.sysout("scriptWatch1.step3: check watch panel, close test window");

    checkWatchPanel();
    testWindow.close();

    FBTrace.sysout("scriptWatch1.DONE");
    fireunit.testDone();
}

function checkBreakpoint()
{
    enablePrivilege("UniversalXPConnect");

    var scriptNode = testWindow.fireunit.panel("script");
    var sourceBox = FBL.getElementsByClass(scriptNode, "sourceBox")[1];
    var sourceViewport = FBL.getElementByClass(scriptNode, "sourceViewport");
    var sourceRow = sourceViewport.childNodes[1];

    // Check breakpoint
    fireunit.ok(sourceRow.getAttribute("breakpoint"), "Breakpoint must be set.");
}

function checkWatchPanel()
{
    enablePrivilege("UniversalXPConnect");

    var watchPanel = testWindow.FirebugContext.getPanel("watches", true);
    watchPanel.addWatch("window");
    var watchNode = watchPanel.panelNode;
    var value = FBL.getElementByClass(watchNode, "memberValueCell");
    fireunit.compare("Window scriptWatch1Win.html", value.textContent, 
        "window variable must have a value");

    FBTest.sysout("scriptWatch1.checkWatchPanel, value: ", value);
}
