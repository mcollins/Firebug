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
     * Add UI button to sign then export the final certified document.
     * @param doc the HTML document to be signed and exported.
     */
    addSigningButton: function(doc)
    {
        FBTrace.sysout("addSigningButton to doc ", doc );
        this.doc = doc;
        var toolbar = doc.getElementById("consoleToolbar");
        var signingButton = doc.createElement('toolbarbutton');
        signingButton.setAttribute("id", "fbSwarmSigningButton");
        signingButton.setAttribute("label", "fbSwarm.cmd.signSwarm");
        signingButton.setAttribute("class", "toolbar-image-button");
        signingButton.setAttribute("tooltiptext","fbSwarm.signSwarm");
        var endOfButtons = doc.getElementById('FBTestButtons_end');
        toolbar.insertBefore(signingButton, endOfButtons);
        signingButton.addEventListener('click', boundDoSigning, true);
    },

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

    enableSigningButton: function(enable)
    {
        var button = document.getElementById("fbSwarmSigningButton");
        button.disabled = enable ? false : true;
    },

    doSigning: function(event)
    {
        FBTrace.sysout("FirebugSwarmTest doSigning ", event);
        debugger;
        var keyservice = this.getKeyService();
        FBTrace.sysout("FirebugSwarmTest doSigning keyservice: "+this.keyservice);
        if (!keyservice)
            return;
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
                FirebugSwarmTest.addSigningButton(document);
            }
            else if (data == "shutdown")
            {
                observerService.removeObserver(FirebugSwarmTest, "fbtest");
            }
            else if (data == "restart")
            {
                var fbtest = subject;
                FirebugSwarmTest.analyze();
            }

        }
        catch(exc)
        {
            FBTrace.sysout("observe FAILS "+exc, exc);
        }
    },

    // real work -------------------------------------------------------------------

    analyze: function()
    {
        var browser = $("consoleFrame");
        var doc = browser.contentDocument;
        if(doc.getElementsByClassName('swarm').length == 0)
        {
            this.progress("Not a swarm test document");
            this.enableSigningButton(false);
            return;
        }
        else
        {
            this.enableSigningButton(true);  // TODO may want to delay until install/test
            FBTestApp.extensions.prepareDeclaredExtensions(doc, this.progress);
        }
    },

    progress: function(msg)
    {
        document.getElementById("progressMessage").value = msg;
    },

    installKeyServiceInstructionsURL: "chrome://swarm/content/installKeyService.html",
    downloadAndInstallKeyService: function()
    {
        var componentsDir = this.getComponentsDirectory();
        var consoleFrame = $("consoleFrame");
        consoleFrame.addEventListener("load", function onInstructionsLoaded(event)
        {
            consoleFrame.removeEventListener("load",onInstructionsLoaded, true);

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
            {
                FBTrace.sysout("FirebugSwarmTest onWindowTitleChange FOUND at location "+location);
                FirebugSwarmTest.addSigningButton(win.document);
            }
        }
    },

};

function boundDoSigning(event)
{
    FirebugSwarmTest.doSigning(event);
}

observerService.addObserver(FirebugSwarmTest, "fbtest", false);

//************************************************************************************************
}});