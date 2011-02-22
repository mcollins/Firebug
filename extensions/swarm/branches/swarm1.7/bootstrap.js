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
        Cu.reportError("swarm.bootstrap startup ");

        Components.utils.import("resource://gre/modules/Services.jsm");
        doSwarmThing(aData);
    }
    catch(exc)
    {
         Cu.reportError("bootstrap ERROR "+exc);
    }
}

function shutdown(aData, aReason)
{

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
    }
}

function doSwarmThing(aData)
{
    var swarms = getSwarmsDirectory(aData);
    if (swarms) // then we are set up to test a swarm
    {
        // Set flags for the startup phase
        setDefaultPrefs('extensions.firebugSwarm', {testAll: true});
        Cu.reportError("swarm.bootstrap setPref, now install "+swarms.path);
        installSwarms(swarms);
    }
    else  // then we are set up to use a swarm
    {
        openSwarms();
    }
}

function uninstall(aData, aReason)
{
    setDefaultPrefs('extensions.firebugSwarm', {testAll: false});
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


//http://starkravingfinkle.org/blog/2011/01/restartless-add-ons-%e2%80%93-default-preferences/
// retrieved Feb 21, 2011
// setDefaultPrefs("extensions.firebug.", {anInt: 1, aString: "some"}

function setDefaultPrefs(branch, preferenceKeyValues) {
  let branch = Services.prefs.getDefaultBranch(branch);
  for (let [key, val] in Iterator(preferenceKeyValues)) {
    switch (typeof val) {
      case "boolean":
        branch.setBoolPref(key, val);
        break;
      case "number":
        branch.setIntPref(key, val);
        break;
      case "string":
        branch.setCharPref(key, val);
        break;
    }
  }
}

function hookXULWindows(onLoadXULWindow)
{
    var windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

    var ourJobIsDone = false;

    //Load into any existing windows
    var firefoxen = windowMediator.getEnumerator("navigator:browser");
    while (firefoxen.hasMoreElements()) {
      var win = firefoxen.getNext().QueryInterface(Ci.nsIDOMWindow);
      ourJobIsDone = onLoadXULWindow(win);
    }

    if (ourJobIsDone)
        return;

    var listener =
    {
            onOpenWindow: function(aWindow)
            {
                // Wait for the window to finish loading
                var domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal);
                domWindow.addEventListener("load", function()
                {
                    domWindow.removeEventListener("load", arguments.callee, false);
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
        win.gBrowser.selectedTab = win.gBrowser.addTab("http://getfirebug.com/releases/swarms");
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

    hookXULWindows(function openSwarmPageAndInstall(win)
    {
        var url = win.location+"";
        if (url !== "chrome://browser/content/browser.xul")
            return;

        Cu.reportError("swarm.bootstrap win "+win+" isDOM "+(win instanceof Ci.nsIDOMWindow)+" win.location "+win.location);

        var tab = win.gBrowser.getBrowserForTab(win.gBrowser.addTab("chrome://swarms/content/index.html"));

        tab.addEventListener("load", function onSwarmPageLoaded(event) {
            dump("------------------ Wow -------------------------------\n");
        }, true);

        return true;
    });
}
