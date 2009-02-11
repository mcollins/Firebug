

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
        this.pressKey(123); // F12
    };

    FBTest.Firebug.isFirebugOpen = function()
    {
        FBTrace.sysout("isFirebugOpen");
        var browserDocument = FBTest.FirebugWindow.document;
        FBTrace.sysout("isFirebugOpen browserDocument", browserDocument);
        var fbContentBox = browserDocument.getElementById('fbContentBox');
        FBTrace.sysout("isFirebugOpen fbContentBox", fbContentBox);
        var collapsedFirebug = fbContentBox.getAttribute("collapsed");
        FBTrace.sysout("isFirebugOpen collapsedFirebug"+ collapsedFirebug);
        return (collapsedFirebug=="true") ? false : true;
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
            this.progressElement.innerHTML = eventName;
            //window.dump("activation.js fire "+eventName+" FBTest "+FBTest+"\n");
            //window.dump("activation.js fire  "+eventName+" FBTrace "+FBTrace+"\n");
            //window.dump('activaiton.js fire window '+window.location+"\n");
            FBTest.progress(eventName);
            //FBTrace.sysout("fire this", this);
            this.progressElement.dispatchEvent(event);
        },
        // fooTest.fireOnNewPage("openFirebug", "http://getfirebug.com");
        fireOnNewPage: function(eventName, url)
        {
            var tabbrowser = FBTest.FirebugWindow.getBrowser();
            var testHandler = this;
            var newTab = tabbrowser.addTab(url);
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
                testHandler.fire(eventName);
            }
            //FBTrace.sysout("fireOnNewPage "+FBTest.FirebugWindow, FBTest.FirebugWindow);
            // Add tab, then make active (https://developer.mozilla.org/en/Code_snippets/Tabbed_browser)

            browser.addEventListener("load", onLoadURLInNewTab, true);
            //FBTrace.sysout("tabbrowser is ", tabbrowser);
        },
        // function onEnablePanels(event) {...; fooTest.done();}
        done: function()
        {
            this.progressElement.innerHTML = this.testName +" done";
            FBTest.testDone();
        }
    };
}


// ------------------------------------------------------------------------
// Individual sub tests
var testNumber = 0;
function openAndOpen()
{
    var openAndOpenURL = "http://getfirebug.com/";


    var openTest = new FBTest.Firebug.TestHandlers("openAndOpen");

    // Actual test operations
    openTest.add( function onNewPage(event)
    {
        FBTrace.sysout("onNewPage starts", event);
        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(!isFirebugOpen, "Firebug starts closed");

        FBTest.Firebug.pressToggleFirebug();
    });

    openTest.add( function onShowUI()
    {
        var isFirebugOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.ok(isFirebugOpen, "Firebug now open");

        if (FBTest.FirebugWindow.FirebugContext)
        {
            var contextName = FBTest.FirebugWindow.FirebugContext.getName();
            FBTest.ok(true, "chromeWindow.FirebugContext "+contextName);
            FBTest.ok(contextName == openAndOpenURL, "FirebugContext set to "+openAndOpenURL);
        }
        else
            FBTest.ok(false, "no FirebugContext");

        openTest.done();
    });

    var uiListener =
    {
            showUI: function(browser, context) // called when the Firebug UI comes up in browser or detached
            {
                openTest.fire("onShowUI");
            },

            hideUI: function(brower, context)  // called when the Firebug UI comes down
            {
            },
    };
    FBTest.FirebugWindow.Firebug.registerExtension(uiListener);
    window.addEventListener("unload", function cleanUp()
    {
        FBTrace.sysout("window.unload");
        FBTest.FirebugWindow.Firebug.unregisterExtension(uiListener);
    }, true);

    openTest.fireOnNewPage("onNewPage", openAndOpenURL);
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
    openAndOpen();
}
