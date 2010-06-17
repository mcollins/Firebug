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

// ************************************************************************************************
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
                var updateExtensionInfo = extensions[i];
                this.secureHashOverHTTPS(url, function updateHash(hashString)
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

// ************************************************************************************************

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

// ************************************************************************************************
// Registration

Swarm.workflowMonitor.registerWorkflowStep("swarmRunAllTestsStep", Swarm.Tester.swarmRunAllTestsStep);
Swarm.workflowMonitor.registerWorkflowStep("swarmStopTestsStep", Swarm.Tester.swarmStopTestsStep);
Swarm.workflowMonitor.registerWorkflowStep("swarmHaltFailTest", Swarm.Tester.swarmHaltFailTest);
Swarm.workflowMonitor.registerWorkflowStep("swarmNoTimeoutTest", Swarm.Tester.swarmNoTimeoutTest);

//************************************************************************************************
}});