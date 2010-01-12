/* See license.txt for terms of usage */
FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);

Components.utils.import("resource://swarm/XULApplication.js");

// ************************************************************************************************

// This code runs in the FBTest Window.

var FirebugSwarmTest =
{
    // initialization -------------------------------------------------------------------

    initialize: function()
    {
        this.addSigningButton();
    },

    addSigningButton: function()
    {
        FBTrace.sysout("addSigningButton goes here");
        var toolbar = $("consoleToolbar");
        var signingButton = document.createElement('toolbarbutton');
        signingButton.setAttribute("label", "fbSwarm.cmd.signSwarm");
        signingButton.setAttribute("class", "toolbar-image-button");
        signingButton.setAttribute("tooltiptext","fbSwarm.signSwarm");
        toolbar.insertBefore(signingButton, $('FBTestButtons_end'));
        signingButton.addEventListener('click', bind(this, this.doSigning), true);
    },

    getKeyService: function()
    {
        if (!this.keyService)
        {
            try
            {
                var keyServiceClass = Components.classes["@toolkit.mozilla.org/keyservice;1"];
                if (keyServiceClass)
                    this.keyService = keyServiceClass.getService(Components.interfaces.nsIKeyService);
                else
                    this.downloadAndInstallKeyService();  // maybe we have to restart
            }
            catch(exc)
            {
                throw new Error("Failed to get nsIKeyService "+exc);
            }
        }

        FBTrace.sysout("getKeyService "+this.keyService);

        return this.keyService;
    },

    // User interface -------------------------------------------------------------------

    enableSigningButton: function(enable)
    {

    },

    doSigning: function(event)
    {
        FBTrace.sysout("FirebugSwarmTest doSigning ", event);
        var keyservice = this.getKeyService();
        FBTrace.sysout("FirebugSwarmTest doSigning keyservice: "+this.keyservice);
        if (!keyservice)
            return;
    },

    // real work -------------------------------------------------------------------

    installKeyServiceInstructionsURL: "chrome://swarm/content/installKeyService.html",
    downloadAndInstallKeyService: function()
    {
        var componentsDir = this.getComponentsDirectory();
        var consoleFrame = $("consoleFrame");
        consoleFrame.addEventListener("load", function onInstructionsLoaded(event)
        {
            var doc = event.target;
            var elt = doc.getElementById("openFBTestComponentDirectory");
            elt.addEventListener("click", function onClickDirectory(event)
            {
                const nsIFilePicker = Components.interfaces.nsIFilePicker;

                var fp = Components.classes["@mozilla.org/filepicker;1"]
                               .createInstance(nsIFilePicker);
                fp.init(window, "Dialog Title", nsIFilePicker.modeGetFolder);
                fp.defaultString = componentsDir;
                fp.appendFilters(nsIFilePicker.filterAll);

                var rv = fp.show();

            }, true);
        }, true);
        consoleFrame.setAttribute("src", installKeyServiceInstructionsURL);
    },

    getComponentsDirectory: function()
    {
        var fbtest = "fbtest@mozilla.com"; // the extension's id from install.rdf
        var em = Components.classes["@mozilla.org/extensions/manager;1"].
                 getService(Components.interfaces.nsIExtensionManager);
        // the path may use forward slash ("/") as the delimiter
        // returns nsIFile for the extension's install.rdf
        var file = em.getInstallLocation(fbtest).getItemFile(fbtest, "components/");
        return file.path;
    },
    // nsIWindowMediatorListener ------------------------------------------------------------------
    onOpenWindow: function(xulWindow)
    {
        FBTrace.sysout("FirebugSwarmTest onOpenWindow");
    },

    onCloseWindow: function(xulWindow)
    {
        FBTrace.sysout("FirebugSwarmTest onCloseWindow");
    },

    onWindowTitleChange: function(xulWindow, newTitle)
    {
        FBTrace.sysout("FirebugSwarmTest onWindowTitleChange");
        var docShell = xulWindow.docShell;
        if (docShell instanceof Ci.nsIInterfaceRequestor)
        {
            var win = docShell.getInterface(Ci.nsIDOMWindow);
            var location = safeGetWindowLocation(win);
            FBTrace.sysout("FirebugSwarmTest onWindowTitleChange location: "+location);
            if (location === "chrome://fbtest/content/testConsole.xul")
                FBTrace.sysout("FirebugSwarmTest onWindowTitleChange FOUND");
        }
    },

};

window.addEventListener('load',function registerForWindow()
{
    var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1']
        .getService(Components.interfaces.nsIWindowMediator);
    windowManager.addListener(FirebugSwarmTest);
    window.removeEventListener('load', registerForWindow, true);
} , true);



//************************************************************************************************
}});