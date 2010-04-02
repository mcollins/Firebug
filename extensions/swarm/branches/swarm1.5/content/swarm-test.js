/* See license.txt for terms of usage */

// This code runs in the FBTest Window.
FBTestApp.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

// ************************************************************************************************
// Monitors reloads in the FBTest window.
// When a swarm is detected, prepare for swarm testing and certification

var FirebugSwarmTest =
{
    // initialization -------------------------------------------------------------------

    /*
     * Obtain the Public Key Infrastructure service.
     * It may not be installed!
     */
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
    attachToPage: function()
    {
        var browser = $("taskBrowser");
        var doc = browser.contentDocument;
        if(doc.getElementsByClassName('swarm').length == 0)
        {
            this.progress("Not a swarm test document");
            return;
        }
        else
        {
            this.progress("Noticed a Swarm Test Document");
            SwarmInstaller.workFlowMonitor.initialize(doc, this.progress);
        }
    },

    // ----------------------------------------------------------------------------------
    // Handlers contributed to swarmInstaller

    signPage: function(event)
    {
        FBTrace.sysout("FirebugSwarmTest signPage ", event);
        var keyservice = this.getKeyService();
        FBTrace.sysout("FirebugSwarmTest doSigning keyservice: "+this.keyservice);
        if (!keyservice)
            return;
        debugger;
    },

    // sync with FBTest -------------------------------------------------------------------
    observe: function(subject, topic, data)
    {
        try
        {
            FBTrace.sysout("swarm-test observe topic "+topic+ "data "+data);
            if (data == "initialize")
            {
                FBTrace.sysout("swarm test initialize");
            }
            else if (data == "shutdown")
            {
                FirebugSwarmTest.detachFromPage();
                observerService.removeObserver(FirebugSwarmTest, "fbtest");
            }
            else if (data == "restart")
            {
                var fbtest = subject;
                FirebugSwarmTest.attachToPage();
            }

        }
        catch(exc)
        {
            FBTrace.sysout("observe FAILS "+exc, exc);
        }
    },

    // real work -------------------------------------------------------------------

    progress: function(msg)
    {
        document.getElementById("progressMessage").value = msg;
    },

    installKeyServiceInstructionsURL: "chrome://swarm/content/installKeyService.html",
    downloadAndInstallKeyService: function()
    {
        var componentsDir = this.getComponentsDirectory();
        var taskBrowser = $("taskBrowser");
        taskBrowser.addEventListener("load", function onInstructionsLoaded(event)
        {
            taskBrowser.removeEventListener("load",onInstructionsLoaded, true);

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
        taskBrowser.setAttribute("src", installKeyServiceInstructionsURL);
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
            {
                FBTrace.sysout("FirebugSwarmTest onWindowTitleChange FOUND at location "+location);
                FirebugSwarmTest.addSigningButton(win.document);
            }
        }
    },

};

observerService.addObserver(FirebugSwarmTest, "fbtest", false);

//************************************************************************************************
}});