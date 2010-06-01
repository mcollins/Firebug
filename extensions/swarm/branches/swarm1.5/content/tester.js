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

top.Swarm.Tester =
{
};

// ----------------------------------------------------------------------------------
// Handlers contributed to Swarm
Swarm.Tester.swarmRunAllTestsStep = extend(Swarm.WorkflowStep,
{
    initializeUI: function(doc)
    {
        this.addHashes(Swarm.extensions.getInstallableExtensions());
        this.monitorStates(doc, this.progress);
    },

    onStepEnabled: function(doc, elt)
    {
    	delete this.testResults;
    	delete this.testedSwarmDefinition;
        this.showSwarmTaskData(doc, "FBTest");
    },

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

            Swarm.Tester.testResults = FBTestApp.TestConsole.getErrorSummaryText();
            Swarm.Tester.testedSwarmDefinition = getElementHTML(doc.getElementById("swarmDefinition").contentDocument.documentElement);
            Swarm.Tester.testedSwarmDefinitionURL = doc.getElementById("swarmDefinition").contentDocument.location +"";

        	Swarm.workflowMonitor.stepWorkflows(doc, "swarmRunAllTestsStep");
        });
    },

    onStepEnds: function(doc, step, element)
    {
        if (step !== "swarmRunAllTestsStep")
            return;
        // the tests are async somehow
    },

    getDataURLForContent: function(content, mimetype, params)
    {
        // data:text/javascript;fileName=x%2Cy.js;baseLineNumber=10,<the-url-encoded-data>
        var uri = "data:"+mimetype+";";
        if (params)
        {
        	for (var p in params)
        		uri += p +"="+encodeURIComponent(params[p])+",";
        }
        uri += encodeURIComponent(content);
        return uri;
    },

    destroy: function(doc)
    {
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

});

Swarm.Tester.swarmStopTestsStep = extend(Swarm.WorkflowStep,
{
    onStep: function(event, progress)
    {
        FBTestApp.TestConsole.onStop();
    },
});

Swarm.Tester.swarmHaltFailTest = extend(Swarm.WorkflowStep,
{
    onStep: function(event, progress)
    {
        FBTestApp.TestWindowLoader.HaltOnFailedTest.onToggleHaltOnFailedTest();
    },
});

Swarm.Tester.swarmHaltFailTest = extend(Swarm.WorkflowStep,
{
    onStep: function(event, progress)
    {
        FBTestApp.TestWindowLoader.HaltOnFailedTest.onToggleHaltOnFailedTest();
    },
});

Swarm.Tester.swarmNoTimeoutTest = extend(Swarm.WorkflowStep,
{
    onStep: function(event, progress)
    {
        FBTestApp.TestConsole.onToggleNoTestTimeout();
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


Swarm.workflowMonitor.registerWorkflowStep("swarmRunAllTestsStep", Swarm.Tester.swarmRunAllTestsStep);
Swarm.workflowMonitor.registerWorkflowStep("swarmStopTestsStep", Swarm.Tester.swarmStopTestsStep);
Swarm.workflowMonitor.registerWorkflowStep("swarmHaltFailTest", Swarm.Tester.swarmHaltFailTest);
Swarm.workflowMonitor.registerWorkflowStep("swarmNoTimeoutTest", Swarm.Tester.swarmNoTimeoutTest);

//************************************************************************************************
}});