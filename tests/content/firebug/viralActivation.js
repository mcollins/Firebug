


function viralActivation()
{
    var path = FBTest.getHTTPURLBase()+"firebug/";
    var viralActivationURL = path+"OpenFirebugOnThisPage.html";

    FBTestFirebug.openNewTab(viralActivationURL, function openFirebug(win)
    {
        FBTest.progress("opened tab for "+win.location);

        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(!isFirebugOpen, "Firebug starts closed");

        FBTestFirebug.openFirebug();

        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(isFirebugOpen, "Firebug now open");

        if (FBTest.FirebugWindow.FirebugContext)
        {
            var contextName = FBTest.FirebugWindow.FirebugContext.getName();
            FBTest.ok(true, "chromeWindow.FirebugContext "+contextName);
            FBTest.ok(contextName == viralActivationURL, "FirebugContext set to "+viralActivationURL);
        }
        else
            FBTest.ok(false, "no FirebugContext");

        var link = win.document.getElementById("sameTabOpen");
        var tabbrowser = FW.getBrowser();
        var browser = tabbrowser.getBrowserForTab(tabbrowser.selectedTab);
        browser.addEventListener("load", function loadedBrowser()
        {
            browser.removeEventListener("load", loadedBrowser, true);
            setTimeout(checkFBOpen);

        }, true);

        function checkFBOpen(event)
        {
            FBTest.progress("Entered checkFBOpen");
            var url = link.getAttribute("href");
            var doc = browser.contentWindow.document;
            FBTest.compare(path+url, doc.location.toString(), "The url of the link and the document that opened should match");
            var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
            FBTest.ok(isFirebugOpen, "Firebug is open on "+url);
            FBTestFirebug.testDone("viralActivation: 1/4 completed");
        }

        FBTest.progress("Click link "+link.getAttribute('id'));
        FBTest.click(link);

    });
}



//------------------------------------------------------------------------
// Auto-run test

function runTest()
{
    FBTest.sysout("Activation.started");
    FBTest.sysout("activation.js FBTest", FBTest);

    if (FBTest.FirebugWindow)
        FBTest.ok(true, "We have the Firebug Window: "+FBTest.FirebugWindow.location);
    else
        FBTest.ok(false, "No Firebug Window");

    // Auto run sequence
    viralActivation();
}
