var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

//
/*
 * bootstrap.js API
 * https://wiki.mozilla.org/Extension_Manager:Bootstrapped_Extensions
*/
function startup(aData, aReason)
{
    try
    {

        Components.utils.import("resource://gre/modules/Services.jsm");

        var state = getTestingPhase();

        Cu.reportError("swarm.bootstrap startup phase "+state);

        if (state ===  'opened') // then the install just began
        {
            return;
        }
        else if (state === 'restarting') // then we came back after the install, yay
        {
            Cu.reportError("ready to start testing");
            setTestingPhase("done");
            return;
        }
        else // then we are not testing, just using.
        {
            // no-op
        }
    }
    catch(exc)
    {
        var jsonString = JSON.stringify(exc);
         Cu.reportError("bootstrap ERROR "+jsonString);
    }
}

function shutdown(aData, aReason)
{
    var state = getTestingPhase();
    if (state ==  "installing") // then hopefully we are restarting to complete swarm install
    {
        setTestingPhase('restarting');
        Services.prefs.savePrefFile(null);
        return;
    }
}

function install(aData, aReason)
{
    try
    {
        Components.utils.import("resource://gre/modules/Services.jsm");
        doSwarmThing(aData, aReason);
    }
    catch(exc)
    {
         Cu.reportError("swarm.bootstrap ERROR "+exc);
         setTestingPhase(null);
    }
}

function doSwarmThing(aData)
{
    var swarms = getSwarmsDirectory(aData);
    if (swarms) // then we are set up to test a swarm
    {
        // Set flags for the startup phase
        setTestingPhase("opening");
        Cu.reportError("swarm.bootstrap install "+swarms.path);
        installSwarms(swarms);
    }
    else  // then we are set up to use a swarm
    {
        openSwarms();
    }
}

function uninstall(aData, aReason)
{
    setTestingPhase(null);
}

// ***************************************************************************************

function getSwarmsDirectory(aData)
{
    Cu.reportError("swarm bootstrap aData.installPath "+aData.installPath.path);
    var swarms = aData.installPath.clone();
    swarms.append("swarms");

    Cu.reportError("swarm.bootstrap swarms "+swarms.path);

    if (swarms.exists() && swarms.isDirectory())
    {
        Cu.reportError("swarm.bootstrap EXISTS");
        return swarms;
    }
}


function setPrefs(branch, preferenceKeyValues) {
    let branch = Services.prefs.getBranch(branch);
    if (preferenceKeyValues)
    {
        var jsonString = JSON.stringify(preferenceKeyValues);
        branch.setCharPref('json', jsonString);
    }
    else
    {
        branch.clearUserPref('json');
    }
}

function getPrefs(branch)
{
    var branch = Services.prefs.getBranch(branch);
    var type = branch.getPrefType('json');
    if (type == Ci.nsIPrefBranch.PREF_STRING)
    {
        var jsonString = branch.getCharPref('json');
        var jsObject = JSON.parse(jsonString);
        return jsObject;
    }
}

function setTestingPhase(phase)
{
    Cu.reportError("setTestingPhase "+phase+"\n");
    if (phase)
        setPrefs('extensions.firebugSwarm.', {testing: phase});
    else
        setPrefs('extensions.firebugSwarm.', null);
}

function getTestingPhase()
{
    var prefs = getPrefs('extensions.firebugSwarm.');
    if (prefs)
        return prefs.testing;
}

function hookXULWindows(onLoadXULWindow)
{
    var windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

    var ourJobIsDone = false;

    //Load into any existing windows
    var firefoxen = windowMediator.getEnumerator("navigator:browser");
    while (firefoxen.hasMoreElements() && !ourJobIsDone)
    {
      var win = firefoxen.getNext().QueryInterface(Ci.nsIDOMWindow);
      var url = win.location+"";
      if (url !== "chrome://browser/content/browser.xul")
          continue;

      ourJobIsDone = onLoadXULWindow(win);
    }

    if (ourJobIsDone)
        return;

    var listener =
    {
            onOpenWindow: function(aWindow)
            {
                // Wait for the XUL window's nsIDOMWindow to finish loading
                var domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal);
                domWindow.addEventListener("load", function()
                {
                    domWindow.removeEventListener("load", arguments.callee, false);
                    var url = domWindow.location+"";
                    if (url !== "chrome://browser/content/browser.xul")
                        return;

                    ourJobIsDone = onLoadXULWindow(domWindow);
                    if (ourJobIsDone)
                        windowMediator.removeListener(listener);
                }, false);
            },
            onCloseWindow: function(aWindow) { },
            onWindowTitleChange: function(aWindow, aTitle) { }
    };

    // Load into any new windows
    windowMediator.addListener(listener);
}

// Called when we are a user extension
function openSwarms()
{
    Cu.reportError("swarm.bootstrap open swarms hooking windows ");
    hookXULWindows(function openSwarmPage(win)
    {
        var url = win.location+"";
        if (url !== "chrome://browser/content/browser.xul")
            return;

        var url = "http://getfirebug.com/releases/swarms/index.html";

        openSwarmTab(url, win, function allowUserAction(document)
        {
            Cu.reportError("openSwarms ready "+url);
        });

        return true;
    });
}

// Called when we are a tester
function installSwarms(swarms)
{
    var chromeManifest = swarms.parent.clone();
    chromeManifest.append('chrome.manifest');

    var registrar = Components.manager;
    if (registrar instanceof Ci.nsIComponentRegistrar)
    {
        registrar.autoRegister(chromeManifest);
        Cu.reportError("registered "+chromeManifest.path);
    }

    hookXULWindows(openSwarmPageAndInstall);
}

function openSwarmTab(url, win, onSwarmTabReady)
{
    Cu.reportError("swarm.bootstrap opeSwarmTab "+url);
    var swarmTab = win.gBrowser.addTab(url);
    var browserElement = win.gBrowser.getBrowserForTab(swarmTab);

    browserElement.addEventListener("load", function onSwarmPageLoaded(event) {
        Cu.reportError("swarm load "+event.target.location+"\n");
        browserElement.removeEventListener('load', onSwarmPageLoaded, true);

        win.gBrowser.selectedTab = swarmTab;

        onSwarmTabReady(event.target);
    }, true);

}

// Called only when we are a tester

function openSwarmPageAndInstall(win)
{
    Cu.reportError("swarm.bootstrap win "+win+" isDOM "+(win instanceof Ci.nsIDOMWindow)+" win.location "+win.location);

    var chromeURI = "chrome://swarms/content/index.html";
    var url = convertToFile(chromeURI) + "?installAll=true";

    openSwarmTab(url, win, function installAll(document)
    {
        setTestingPhase("installing");
        Cu.reportError("swarm openSwarmTab installing ");
    });

    return true;
}


function dispatch(eventName, elt)
{
    if (eventName === 'click')
        return dispatchClick(elt);

     var ev = elt.ownerDocument.createEvent("Events");
     ev.initEvent(eventName, true, false);
     elt.dispatchEvent(ev);
}

function dispatchClick(elt)
{
    var doc = elt.ownerDocument;
    var event = doc.createEvent("MouseEvents");
    var win = doc.defaultView;
    event.initMouseEvent("click", true, true, win,
      0, 0, 0, 0, 0, false, false, false, false, 0, null);

    elt.dispatchEvent(event);
}

function convertToFile(chromeURL)
{
    var chromeURI = Services.io.newURI(chromeURL, "UTF-8", null);
    var chromeRegistry = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(Ci.nsIChromeRegistry);
    return chromeRegistry.convertChromeURL(chromeURI).spec;
}