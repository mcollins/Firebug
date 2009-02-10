var initialized = false;
function initialize()
{
	if (initialized)
		return;
    // ****************************************************************
    // Operations on Firebug
    FBTest.pressKey = function(keyCode)
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

    FBTest.pressToggleFirebug = function()
    {
        this.pressKey(123); // F12
    };
    
    FBTest.isFirebugOpen = function()
    {
    	//FBTrace.sysout("isFirebugOpen");
    	var browserDocument = FBTest.FirebugWindow.document;
    	//FBTrace.sysout("isFirebugOpen browserDocument", browserDocument);
    	var fbContentBox = browserDocument.getElementById('fbContentBox');
    	//FBTrace.sysout("isFirebugOpen fbContentBox", fbContentBox);
    	var collapsedFirebug = fbContentBox.getAttribute("collapsed");
    	 
    	return (collapsedFirebug?false:true);
    };
    // *******************************************************************

    // var fooTest = new FBTest.TestHandlers("TestFoo");
    FBTest.TestHandlers = function(testName)
    {
    	this.testName = testName;
    	this.progressElement = document.getElementById(testName);
    	if (!this.progressElement)
    		throw new Error("TestHanders object requires element "+testName+" in document "+document.title);
    };
    
    FBTest.TestHandlers.prototype = 
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
    	    	//FBTrace.sysout("fireOnNewPage onLoadURLInNewTab win.location: "+win.location);
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
window.addEventListener('load', initialize, true);
 
// ------------------------------------------------------------------------
// Individual sub tests
var testNumber = 0;
function openAndOpen()
{
    var openAndOpenURL = "http://getfirebug.com/";

    
    var openTest = new FBTest.TestHandlers("openAndOpen");
    
    // Actual test operations
    openTest.add( function onNewPage(event)
    {
    	FBTrace.sysout("onNewPage starts", event);
    	var isFirebugOpen = FBTest.isFirebugOpen();
    	FBTest.ok(!isFirebugOpen, "Firebug starts closed");
    	
    	FBTest.pressToggleFirebug();

    	var isFirebugOpen = FBTest.isFirebugOpen();
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

     
    openTest.fireOnNewPage("onNewPage", openAndOpenURL);
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

    initialize();
    // Auto run sequence
    openAndOpen();

     
}
