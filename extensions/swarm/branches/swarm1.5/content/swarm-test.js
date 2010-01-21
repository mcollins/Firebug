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

var FirebugSwarmTest =
{
    // initialization -------------------------------------------------------------------

    addSigningButton: function(doc)
    {
        FBTrace.sysout("addSigningButton to doc ", doc );
        this.doc = doc;
        var toolbar = doc.getElementById("consoleToolbar");
        var signingButton = doc.createElement('toolbarbutton');
        signingButton.setAttribute("label", "fbSwarm.cmd.signSwarm");
        signingButton.setAttribute("class", "toolbar-image-button");
        signingButton.setAttribute("tooltiptext","fbSwarm.signSwarm");
        var endOfButtons = doc.getElementById('FBTestButtons_end');
        toolbar.insertBefore(signingButton, endOfButtons);
        signingButton.addEventListener('click', boundDoSigning, true);
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
            return;
        }
        else
        {
            this.installDeclaredExtensions(doc);
        }
    },

    installDeclaredExtensions: function(doc)
    {
        this.progress("Swarm Tester checking your extensions");
        var declaredExtensions = this.getDeclaredExtensions(doc);
        this.progress("Swarm document declares "+declaredExtensions.length+" extensions");
        var installedExtensions = this.getInstalledExtensions();
        this.progress("Profile has "+installedExtensions.length+" installed");
    },

    getDeclaredExtensions: function(doc)
    {
        var extensionElts = doc.getElementsByClassName("extensionURL");
        var extensions = [];
        for (var i = 0; i < extensionElts.length; i++)
        {
            var elt = extensionElts[i];

            extensions.push({name: elt.innerHTML, href: elt.getAttribute('href'), hash: elt.getAttribute('hash') });
        }
        return extensions;
    },

    getInstalledExtensions: function()
    {
        return FBTestApp.extensions.getInstalledExtensions();
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