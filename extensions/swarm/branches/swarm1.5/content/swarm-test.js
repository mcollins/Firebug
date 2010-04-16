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

top.SwarmInstaller.SwarmTest =
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
                var keyServiceClass = Cc["@toolkit.mozilla.org/keyservice;1"];
                if (keyServiceClass)
                    this.keyService = keyServiceClass.getService(Ci.nsIKeyService);
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
            this.addHashes(SwarmInstaller.extensions.getInstallableExtensions());
            this.monitorStates(doc, this.progress);
            SwarmInstaller.workFlowMonitor.initializeUI(doc, this.progress);
        }
    },

    detachFromPage: function()
    {
        var browser = $("taskBrowser");
        var doc = browser.contentDocument;
        this.unmonitorStates(doc, this.progress);
    },

    addHashes: function(extensions)
    {
        for(var i = 0; i < extensions.length; i++)
        {
            if (extensions[i].hash)
                continue;

            var url = extensions[i].href;
            if (/https/.test(url))
            {
                let updateExtensionInfo = extensions[i];
                secureHashOverHTTPS(url, function updateHash(hashString)
                {
                    updateExtensionInfo.element.setAttribute('hash', hashString);
                    updateExtensionInfo.hash = hashString;
                });
            }
        }
    },

    monitorStates: function(doc)
    {
        var swarmWorkflows = doc.getElementById("swarmWorkflows");
        var testButtons = swarmWorkflows.getElementsByClassName("swarmRunAllTestsStep");
        for (var i = 0; i < testButtons.length; i++)
            testButtons[i].addEventListener('DOMAttrModified', this.monitorTestStep, true);
    },

    unmonitorStates: function(doc)
    {
        var swarmWorkflows = doc.getElementById("swarmWorkflows");
        var testButtons = swarmWorkflows.getElementsByClassName("swarmRunAllTestsStep");
        for (var i = 0; i < testButtons.length; i++)
            testButtons[i].removeEventListener('DOMAttrModified', this.monitorTestStep, true);
    },

    monitorTestStep: function(event)
    {
        if (event.attrName === "disabled")
        {
            var doc = event.target.ownerDocument;
            var swarmUIs = doc.getElementsByClassName("swarmSpecification");
            for (var i = 0; i < swarmUIs.length; i++)
                swarmUIs[i].style.display = (event.newValue === "disabled") ? "block" : "none" ;

            if (event.newValue === "disabled")
            {
                delete doc.getElementById('FBTest').style.height;
            }
            else
            {
                var height = doc.documentElement.clientHeight;  // height we have to work with
                doc.getElementById('FBTest').style.height = height +"px";
            }

        }
        FBTrace.sysout("monitorTestStep disabled "+event.attrChange+" for "+event.attrName+" to "+event.newValue, event);
    },

    showSwarmUI: function(doc, show)
    {

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
                observerService.removeObserver(SwarmInstaller.SwarmTest, "fbtest");
                SwarmInstaller.SwarmTest.detachFromPage();
            }
            else if (data == "restart")
            {
                var fbtest = subject;
                SwarmInstaller.SwarmTest.attachToPage();
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
                const nsIFilePicker = Ci.nsIFilePicker;

                var fp = Cc["@mozilla.org/filepicker;1"]
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
        var em = Cc["@mozilla.org/extensions/manager;1"].
                 getService(Ci.nsIExtensionManager);
        // the path may use forward slash ("/") as the delimiter
        // returns nsIFile for the extension's install.rdf
        var file = em.getInstallLocation(fbtest).getItemFile(fbtest, "components/");
        return file.path;
    },

    // nsIWindowMediatorListener ------------------------------------------------------------------
    onOpenWindow: function(xulWindow)
    {
        FBTrace.sysout("SwarmInstaller.SwarmTest onOpenWindow");
    },

    onCloseWindow: function(xulWindow)
    {
        FBTrace.sysout("SwarmInstaller.SwarmTest onCloseWindow");
    },

    onWindowTitleChange: function(xulWindow, newTitle)
    {
        FBTrace.sysout("SwarmInstaller.SwarmTest onWindowTitleChange");
        var docShell = xulWindow.docShell;
        if (docShell instanceof Ci.nsIInterfaceRequestor)
        {
            var win = docShell.getInterface(Ci.nsIDOMWindow);
            var location = safeGetWindowLocation(win);
            FBTrace.sysout("SwarmInstaller.SwarmTest onWindowTitleChange location: "+location);
            if (location === "chrome://fbtest/content/testConsole.xul")
            {
                FBTrace.sysout("SwarmInstaller.SwarmTest onWindowTitleChange FOUND at location "+location);
                SwarmInstaller.SwarmTest.addSigningButton(win.document);
            }
        }
    },


};

// ----------------------------------------------------------------------------------
// Handlers contributed to swarmInstaller
SwarmInstaller.SwarmTest.swarmRunAllTestsStep = extend(SwarmInstaller.WorkflowStep,
{
    onStep: function(event, progress)
    {
        // enable the stop button
        var browser = $("taskBrowser");
        var doc = browser.contentDocument;
        var stopButton = event.target.parentNode.getElementsByClassName("swarmStopTestsStep")[0];
        stopButton.removeAttribute("disabled");

        FBTestApp.TestConsole.onRunAll(function restoreButtonsAndGoToNextStep()
        {
            stopButton.setAttribute("disabled", "disabled");
            FBTestApp.TestSummary.dumpSummary();
        });
    },
});

SwarmInstaller.SwarmTest.swarmStopTestsStep = extend(SwarmInstaller.WorkflowStep,
{
    onStep: function(event, progress)
    {
        FBTestApp.TestConsole.onStop();
    },
});

SwarmInstaller.SwarmTest.swarmHaltFailTest = extend(SwarmInstaller.WorkflowStep,
{
    onStep: function(event, progress)
    {
        FBTestApp.TestWindowLoader.HaltOnFailedTest.onToggleHaltOnFailedTest();
    },
});

SwarmInstaller.SwarmTest.swarmHaltFailTest = extend(SwarmInstaller.WorkflowStep,
{
    onStep: function(event, progress)
    {
        FBTestApp.TestWindowLoader.HaltOnFailedTest.onToggleHaltOnFailedTest();
    },
});

SwarmInstaller.SwarmTest.swarmNoTimeoutTest = extend(SwarmInstaller.WorkflowStep,
{
    onStep: function(event, progress)
    {
        FBTestApp.TestConsole.onToggleNoTestTimeout();
    },
});

SwarmInstaller.SwarmTest.signPage = extend(SwarmInstaller.WorkflowStep,
{
    onStep: function(event, progress)
    {
        FBTrace.sysout("SwarmInstaller.SwarmTest signPage ", event);
        var keyservice = this.getKeyService();
        FBTrace.sysout("SwarmInstaller.SwarmTest doSigning keyservice: "+this.keyservice);
        if (!keyservice)
            return;
        debugger;
    },
});


// Secure download and hash calculation --------------------------------------------------------
// http://groups.google.com/group/mozilla.dev.platform/browse_thread/thread/9f1bdf8603b72384/74fcb44e8b701966?#74fcb44e8b701966

function secureHashOverHTTPS(urlString, fncTakesHashString)
{
    const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci["nsIIOService"]);
    try
    {
        if (urlString)
            var uri = ioService.newURI(urlString, null, null);
        else
            throw new Error("secureHashOverHTTPS FAILS: no URL given");
    }
    catch(exc)
    {
        throw new Error("secureHashOverHTTPS FAILS: could not create URI from the given URL: "+urlString+" because: "+exc);
    }

    if (!uri.schemeIs("https"))
        throw new Error("secureHashOverHTTPS FAILS: only https URL can be securely downloaded");

    try
    {
        let channel = ioService.newChannel(urlString, null, null);

        let hasher = Cc["@mozilla.org/security/hash;1"]
            .createInstance(Ci.nsICryptoHash);

        let listener =
        {
            onStartRequest: function(request, arg)
            {
                hasher.init(hasher.SHA1);
                FBTrace.sysout("onStartRequest "+channel.URI.spec);
            },
            onDataAvailable: function(request, arg, stream, offset, count)
            {
                FBTrace.sysout("onDataAvailable "+channel.URI.spec+" "+count);
                var problem = getSecurityProblem(request);
                if (!problem)
                    hasher.updateFromStream(stream, count);
                else
                    throw new Error("secureHashOverHTTPS FAILS: "+problem+" reading "+urlString);
            },
            onStopRequest: function(request, arg, statusCode)
            {
                FBTrace.sysout("onStopRequest "+channel.URI.spec+" "+statusCode);
                try
                {
                    var hash = hasher.finish(false);
                    // convert the binary hash data to a hex string.
                    var s = [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
                    fncTakesHashString("sha1:"+s);
                }
                catch(exc)
                {
                    throw new Error("secureHashOverHTTPS FAILS: "+exc);
                }

            }
        };

       channel.asyncOpen(listener, hasher);
    }
    catch (e)
    {
        var cascade =  new Error("secureHashOverHTTPS FAILS "+e);
        cascade.cause = e;
        throw cascade;
    }
}

function getSecurityProblem(channel)
{
    if (channel instanceof Ci.nsIHttpChannel)
    {
        var secInfo = channel.securityInfo;
        if (secInfo instanceof Ci.nsITransportSecurityInfo)
        {
            var iListener = Ci.nsIWebProgressListener;

            var secureBits = (iListener.STATE_IS_SECURE | iListener.STATE_SECURE_HIGH);
            if (secInfo.securityState & secureBits)
            {
                // https://developer.mozilla.org/En/How_to_check_the_security_state_of_an_XMLHTTPRequest_over_SSL
                if (secInfo instanceof Ci.nsISSLStatusProvider) // then the secInfo hasA cert
                {
                    if (secInfo.SSLStatus instanceof Ci.nsISSLStatus)
                    {
                        var cert = secInfo.SSLStatus.serverCert;
                        var certOverrideService = Cc["@mozilla.org/security/certoverride;1"]
                                   .getService(Ci.nsICertOverrideService);

                        var bits = {}, temp = {};

                        if (certOverrideService.hasMatchingOverride(channel.URI.host, channel.URI.port, cert, bits, temp))
                            return "user has overridden certificate checks";

                        return false;
                    }
                    return "channel securityInfo SSLStatus is not an nsISSLStatus";
                }
                return "channel securityInfo is not an nsISSLStatusProvider";
            }
            return "channel securityInfo is not in secure state";
        }
        return "channel securityInfo is not valid";
    }
    return "request has no channel for security checks";
}

// return the two-digit hexadecimal code for a byte
function toHexString(charCode)
{
    return ("0" + charCode.toString(16)).slice(-2);
}

observerService.addObserver(SwarmInstaller.SwarmTest, "fbtest", false);  // removed in observe: 'shutdown'
SwarmInstaller.workFlowMonitor.registerWorkflowStep("swarmRunAllTestsStep", SwarmInstaller.SwarmTest.swarmRunAllTestsStep);
SwarmInstaller.workFlowMonitor.registerWorkflowStep("swarmStopTestsStep", SwarmInstaller.SwarmTest.swarmStopTestsStep);
SwarmInstaller.workFlowMonitor.registerWorkflowStep("swarmHaltFailTest", SwarmInstaller.SwarmTest.swarmHaltFailTest);
SwarmInstaller.workFlowMonitor.registerWorkflowStep("swarmNoTimeoutTest", SwarmInstaller.SwarmTest.swarmNoTimeoutTest);

//************************************************************************************************
}});