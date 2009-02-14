

function initialize()
{


    // ****************************************************************
    // Operations on Firebug
    FBTest.Firebug = {};
    FBTest.Firebug.pressKey = function(keyCode)
    {
        var doc = FBTest.FirebugWindow.document;
        var keyEvent = doc.createEvent("KeyboardEvent");
        keyEvent.initKeyEvent(
                "keypress",        //  in DOMString typeArg,
                true,             //  in boolean canBubbleArg,
                true,             //  in boolean cancelableArg,
                null,             //  in nsIDOMAbstractView viewArg,  Specifies UIEvent.view. This value may be null.
                false,            //  in boolean ctrlKeyArg,
                false,            //  in boolean altKeyArg,
                false,            //  in boolean shiftKeyArg,
                false,            //  in boolean metaKeyArg,
                 keyCode,               //  in unsigned long keyCodeArg,
                 0);              //  in unsigned long charCodeArg);

        doc.documentElement.dispatchEvent(keyEvent);
    };

    FBTest.Firebug.pressToggleFirebug = function()
    {
        FBTrace.sysout("pressToggleFirebug");
        FBTest.progress("pressToggleFirebug");
        this.pressKey(123); // F12
    };

    FBTest.Firebug.isFirebugOpen = function()
    {
        var browserDocument = FBTest.FirebugWindow.document;
        var fbContentBox = browserDocument.getElementById('fbContentBox');
        var collapsedFirebug = fbContentBox.getAttribute("collapsed");
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("isFirebugOpen collapsedFirebug "+ collapsedFirebug);
        return (collapsedFirebug=="true") ? false : true;
    };

    FBTest.Firebug.setToKnownState = function()
    {
        FBTest.FirebugWindow.Firebug.forceBarOff();  // pull Firebug down if it is up
    };
    // *******************************************************************

    // var fooTest = new FBTest.Firebug.TestHandlers("TestFoo");
    FBTest.Firebug.TestHandlers = function(testName)
    {
        this.testName = testName;
        this.progressElement = document.getElementById(testName);
        if (!this.progressElement)
            throw new Error("TestHanders object requires element "+testName+" in document "+document.title);
    };

    FBTest.Firebug.TestHandlers.prototype =
    {
        // fooTest.add("openFirebug", onOpenFirebug);
        add: function(handlerFunction)
        {
            var eventName = handlerFunction.name;
            this.progressElement.addEventListener(eventName, handlerFunction, true);
        },
        // function onOpenFirebug(event) { ...; fooTest.fire("enablePanels"); }
        fire: function(eventName)
        {
            var event = this.progressElement.ownerDocument.createEvent("Event");
            event.initEvent(eventName, true, false); // bubbles and not cancelable
            FBTest.progress(eventName);
            //FBTrace.sysout("fire this", this);
            //debugger;
            this.progressElement.dispatchEvent(event);
        },

        // fooTest.fireOnNewPage("openFirebug", "http://getfirebug.com");
        fireOnNewPage: function(eventName, url, extensionCallbacks)
        {
            var tabbrowser = FBTest.FirebugWindow.getBrowser();
            var testHandler = this;
            // Add tab, then make active (https://developer.mozilla.org/en/Code_snippets/Tabbed_browser)
            var newTab = tabbrowser.addTab(url);
            newTab.setAttribute("firebug", "test");
            tabbrowser.selectedTab = newTab;
            var browser = tabbrowser.getBrowserForTab(newTab);

            var onLoadURLInNewTab = function(event)
            {
                var win = event.target;   // actually  tab XUL elt
                FBTrace.sysout("fireOnNewPage onLoadURLInNewTab win.location: "+win.location);
                FBTest.FirebugWindow.getBrowser().selectedTab = win;
                //FBTrace.sysout("selectedTab ", FBTest.FirebugWindow.getBrowser().selectedTab);
                var selectedBrowser = tabbrowser.getBrowserForTab(tabbrowser.selectedTab);
                //FBTrace.sysout("selectedBrowser "+selectedBrowser.currentURI.spec);
                browser.removeEventListener('load', onLoadURLInNewTab, true);

                if (extensionCallbacks)
                {
                    FBTrace.sysout("fireOnNewPage register extensionCallbacks", extensionCallbacks);
                    FBTest.FirebugWindow.Firebug.registerExtension(extensionCallbacks);
                    browser.addEventListener("unload", function cleanUp()
                    {
                        FBTrace.sysout("window.unload, removing extensionCallbacks");
                        FBTest.FirebugWindow.Firebug.unregisterExtension(extensionCallbacks);
                    }, true);
                }

                testHandler.fire(eventName);
            }
            //FBTrace.sysout("fireOnNewPage "+FBTest.FirebugWindow, FBTest.FirebugWindow);

            browser.addEventListener("load", onLoadURLInNewTab, true);
        },

        cleanUpTestTabs: function()
        {
            var tabbrowser = FBTest.FirebugWindow.getBrowser();
            for (var i = 0; i < tabbrowser.mTabs.length; i++)
            {
                var tab = tabbrowser.mTabs[i];
                var firebugAttr = tab.getAttribute("firebug");
                if (firebugAttr == "test")
                    tabbrowser.removeTab(tab);
            }
        },

        // function onEnablePanels(event) {...; fooTest.done();}
        done: function()
        {
            FBTest.progress("clean up tabs");
            this.cleanUpTestTabs();
            FBTest.progress(this.testName +" done");
            FBTest.testDone();
        }
    };
}


// ------------------------------------------------------------------------
// Individual sub tests
var testNumber = 0;
function openOpenCloseClose()
{
    var openOpenCloseCloseURL = "http://localhost:7080/firebug/OpenFirebugOnThisPage.html";


    var openOpenCloseClose = new FBTest.Firebug.TestHandlers("openOpenCloseClose");

    // Actual test operations
    openOpenCloseClose.add( function onNewPage(event)
    {
        FBTrace.sysout("onNewPage starts", event);
        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(!isFirebugOpen, "Firebug starts closed");

        this.next = "onShowUI";
        FBTest.Firebug.pressToggleFirebug();

    });

    openOpenCloseClose.add( function onShowUI()
    {
        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(isFirebugOpen, "Firebug now open");

        FBTest.ok(this.next == "onShowUI", "showUI followed toggleFirebug");

        if (FBTest.FirebugWindow.FirebugContext)
        {
            var contextName = FBTest.FirebugWindow.FirebugContext.getName();
            FBTest.ok(true, "chromeWindow.FirebugContext "+contextName);
            FBTest.ok(contextName == openOpenCloseCloseURL, "FirebugContext set to "+openOpenCloseCloseURL);
        }
        else
            FBTest.ok(false, "no FirebugContext");
        // now close it
        this.next = "onHideUI";
        FBTest.Firebug.pressToggleFirebug();

    });

    openOpenCloseClose.add( function onHideUI()
    {
        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(!isFirebugOpen, "Firebug now closed");

        FBTest.ok(this.next == "onHideUI", "hideUI followed toggleFirebug");
        openOpenCloseClose.done();
    });

    var uiListener =
    {
            showUI: function(browser, context) // called when the Firebug UI comes up in browser or detached
            {
                openOpenCloseClose.fire("onShowUI");
            },

            hideUI: function(brower, context)  // called when the Firebug UI comes down
            {
                openOpenCloseClose.fire("onHideUI");
            },
    };

    // Now start the test.
    FBTest.Firebug.setToKnownState();
    openOpenCloseClose.fireOnNewPage("onNewPage", openOpenCloseCloseURL, uiListener);
}

//------------------------------------------------------------------------
// Auto-run test

function runTest()
{
    FBTest.sysout("Activation.started");
    initialize();
    FBTrace.sysout("activation.js FBTest", FBTest);

    if (FBTest.FirebugWindow)
        FBTest.ok(true, "We have the Firebug Window: "+FBTest.FirebugWindow.location);
    else
        FBTest.ok(false, "No Firebug Window");

    // Auto run sequence
    openOpenCloseClose();
}
