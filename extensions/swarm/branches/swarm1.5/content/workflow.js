/* See license.txt for terms of usage */




// This code runs in the FBTest Window and Firefox Window
(function() { with (FBL) {


 // ************************************************************************************************
 // Constants

 const Cc = Components.classes;
 const Ci = Components.interfaces;

 const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
 const observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

 const Application = Components.classes["@mozilla.org/fuel/application;1"].getService(Components.interfaces.fuelIApplication);
 const versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                            .getService(Components.interfaces.nsIVersionComparator);

top.Swarm = {};

/*
 * Common base object for workflow steps, all called with 'this' being the registered object in registerWorkflowStep
 */
Swarm.WorkflowStep =
{
    /*
     * Called when the workflow system is loaded into the UI, on all steps
     * @param doc, the document containing the workflow UI
     * @param progress, a place to post progress messages for users
     */
    initialize: function(doc, progress) {},
    /*
     * Called just after the UI selects any workflow, on all steps
     * @param doc, the document containing the workflow UI
     * @param selectedWorkflow, the element selected
     */
    onWorkflowSelect: function(doc, selectedWorkflow) {},
    /*
     * Called just before the UI unselects any workflow, on all steps
     * @param doc, the document containing the workflow UI
     */
    onWorkflowUnselect: function(doc) {},

    /*
     * Called when a step is allowed to fire
     */
    onStepEnabled: function(doc, stepElement) {},
    /*
     * Called when a step is disallowed to fire
     */
    onStepDisabled: function(doc, stepElement) {},
    /*
     * Called just before any workflow step, on all steps in the selected workflow
     * @param doc, the document containing the workflow UI
     * @param step, the object implementing the step code,
     * @param element, the element with the stepping event
     */
    onStepStarts: function(doc, step, element) {},
    /*
     * Called to execute this workflow step
     */
    onStep: function(event, progress) {},
    /*
     * Called just after any workflow step, on all steps in the selected workflow

     * @param step, the object implementing the step code,
     * @param element, the element with the stepping event
     */
    onStepEnds: function(doc, step, element) {},
    /*
     * called when the workflow system is unloaded, on all steps
     * @param doc, the document containing the workflow UI
     */
    destroy: function(doc) {},

    //-------- Library Functions for workflowSteps ----------------------
    showSwarmTaskData: function(doc) // remaining arguments are ids to be shown; if zero show all
    {
        var swarmTaskDataElements = doc.getElementsByClassName("swarmTaskData");
        for (var i = 0; i < swarmTaskDataElements.length; i++)
        {
            if (arguments.length == 1)
                swarmTaskDataElements[i].classList.remove("swarmTaskDataNotNeeded");
            else
                swarmTaskDataElements[i].classList.add("swarmTaskDataNotNeeded");

            try
            {
            	var iframe = swarmTaskDataElements[i].getElementsByTagName("iframe")[0];
            	iframe.removeAttribute('style');
            }
            catch (exc)
            {
            	FBTrace.sysout("showSwarmTaskData FAILS to delete style.height for "+iframe+" "+exc, swarmTaskDataElements[i])
            }

        }

        var header = doc.getElementById("swarmWorkflowInsertion");
        var height = doc.documentElement.clientHeight - header.offsetHeight - header.offsetTop;  // height we have to work with
        var eachHeight = height/(arguments.length - 1); // todo use CSS3 flex

        var needed = 1;
        while (needed < arguments.length)
        {
            var neededFrame = doc.getElementById(arguments[needed]);
            if (!neededFrame)
                throw new Error("showSwarmTaskData did not find element "+needed+" with id "+arguments[needed]);

            var frameWrapper = neededFrame.parentNode;
            frameWrapper.classList.remove("swarmTaskDataNotNeeded");
            neededFrame.setAttribute('style',"height:"+ eachHeight +"px");

            needed++;
        }
    },
};

Swarm.workflowMonitor =
{
    initialize: function(doc, progress)
    {
        this.injectSwarmWorkflows(doc);
        this.progress = progress;
    },

    injectSwarmWorkflows: function(doc)
    {
        var webWarning = doc.getElementById("swarmWebPage");
        webWarning.style.visibility = "hidden";

        var swarmWorkflowInsertionPoint = doc.getElementById("swarmWorkflowInsertion");
        var swarmWorkflowInsertion = getResource("chrome://swarm/content/swarmWorkflow.htm");
        swarmWorkflowInsertionPoint.innerHTML = swarmWorkflowInsertion;
    },

    initializeUI: function(doc, progress)
    {
        var swarmWorkflows = doc.getElementById("swarmWorkflows");
        this.hookButtons(swarmWorkflows);
        swarmWorkflows.style.display = "block";
        this.dispatch("initialize", [doc, this.progress]);
    },

    detachFromPage: function()  // XXXjjb NOT BEING CALLED!
    {
        var doc = browser.contentDocument;
        var swarmWorkflows = doc.getElementById("swarmWorkflows");
        this.unHookButtons(swarmWorkflows);
    },

    hookButtons: function(workflowsElement)
    {
        this.buttonHook = bind(this.doWorkflowEvent, this);
        workflowsElement.addEventListener('click', this.buttonHook, true);

        var selectWorkflow = workflowsElement.ownerDocument.getElementById("selectWorkflow");
        selectWorkflow.addEventListener('click', this.unSelectWorkflow, true);
    },

    doWorkflowEvent: function(event)
    {
        if (event.target.tagName.toLowerCase() === 'button')
            this.doWorkflowStep(event);
        if (event.target.tagName.toLowerCase() === 'input')
            this.selectWorkflow(event);
        // TODO become a joehewitt some day.
    },

    shutdown: function(doc, progress)
    {
        this.dispatch("destroy", [doc, this.progress]);
    },

    unHookButtons: function(workflowsElement)
    {
        workflowsElement.removeEventListener('click',this.buttonHook ,true);

        var selectWorkflow = workflowsElement.ownerDocument.getElementById("selectWorkflow");
        selectWorkflow.addEventListener('click', this.unSelectWorkflow, true);
    },

    // ------------------------------------------------------------------------------------------
    selectWorkflow: function(event)
    {
        var doc = event.target.ownerDocument;
        this.unSelectSelectedWorkflow(doc);

        // select the new workflow
        var selectedWorkflowSelector = event.target;
        var parent = selectedWorkflowSelector;
        while(parent = parent.parentNode)
        {
            if (parent.classList && parent.classList.contains("swarmWorkflowSelection"))
            {
                parent.classList.add("swarmWorkflowSelected");
                var input = parent.getElementsByTagName('input')[0];
                input.checked = true;
                break;
            }
        }

        // return the task data to default on
        Swarm.WorkflowStep.showSwarmTaskData(doc);

        // enable some buttons in this workflow
        var selectedWorkflow = parent.getElementsByClassName("swarmWorkflow")[0];

        var buttons = selectedWorkflow.getElementsByTagName('button');
        for (var j = 0; j < buttons.length; j++)
        {
            button = buttons[j];
            if ( button.classList.contains("swarmWorkflowStep") || button.classList.contains("swarmWorkflowEnd") )
            {
                this.dispatchToStepByButton(button, "onStepDisabled", [doc, button]);
            }
            else
            {
                button.removeAttribute("disabled");
                this.dispatchToStepByButton(button, "onStepEnabled", [doc, button])
            }
        }

        // mark the selector closed
        var swarmWorkflows = doc.getElementById("swarmWorkflows");
        swarmWorkflows.classList.add("swarmWorkflowIsSelected");

        // initialize the newly selected workflow
        this.dispatch("onWorkflowSelect", [doc, selectedWorkflow]);
        return true;
    },

    unSelectSelectedWorkflow: function(doc)
    {
        this.dispatch("onWorkflowUnselect", [doc])
        // unselect the previously selected workflow
        var workFlowSelectors = doc.body.getElementsByClassName("swarmWorkflowSelection");
        for (var i = 0; i < workFlowSelectors.length; i++)
            workFlowSelectors[i].classList.remove("swarmWorkflowSelected");

        // disable all of the buttons in all of the workflows
        var workFlows = doc.getElementById("swarmWorkflows");
        var buttons = workFlows.getElementsByTagName('button');
        for (var j = 0; j < buttons.length; j++)
        {
            buttons[j].setAttribute("disabled", "disabled");
            this.dispatchToStepByButton(buttons[j], "onStepDisabled", [doc, buttons[j]]);
        }

        var inputs = workFlows.getElementsByTagName("input");
        for (var j = 0; j < inputs.length; j++)
             inputs[j].checked = false;
    },

    unSelectWorkflow: function(event)
    {
        var doc = event.target.ownerDocument;
        var swarmWorkflowIsSelected = doc.getElementsByClassName("swarmWorkflowIsSelected");
        for (var i = 0; i < swarmWorkflowIsSelected.length; i++)
            swarmWorkflowIsSelected[i].classList.remove("swarmWorkflowIsSelected");

        Swarm.workflowMonitor.unSelectSelectedWorkflow(doc);
    },

    doWorkflowStep: function(event)
    {
        if (event.target.tagName.toLowerCase() !== 'button')
            return;

        try
        {
            var button = event.target;
            var doc = button.ownerDocument;

            button.classList.add("swarmWorkflowing");

            var step = this.getStepFromButton(button);
            if (!step)
                return this.progress("ERROR: Swarm.WorkFlowMonitor.getStepFromButton no handler registered for "+button.getAttribute("class"));

            this.dispatch("onStepStarts", [doc, step])
            this.dispatchToStepByButton(button, "onStep", [event, this.progress]);
            this.dispatch("onStepEnds", [doc, step])

            button.classList.remove("swarmWorkflowing");
            event.stopPropagation();
            event.preventDefault();
        }
        catch(exc)
        {
            FBTrace.sysout("Swarm workflow step FAILS "+exc, exc);
            this.progress(exc);
        }

    },

    dispatchToStepByButton: function(button, event, args)
    {
        var step = this.getStepFromButton(button);
        if (!step)
            return this.progress("ERROR: Swarm.WorkFlowMonitor.getStepFromButton no handler registered for "+button.getAttribute("class"));

        var handler = this.registeredWorkflowSteps[step];
        if (!handler)
            return this.progress("no workflow step registered at "+step);

        if (!handler[event])
            return this.progress("no function "+event+" for workflow step "+step);

        handler[event].apply(handler, args);
    },

    getStepFromButton: function(button)
    {
        for(var i = 0; i < button.classList.length; i++)
        {
            if (button.classList[i] in this.registeredWorkflowSteps)
                return button.classList[i];
        }
    },

    stepWorkflows: function(doc, stepClassName)
    {
        var elts = doc.getElementsByClassName(stepClassName);
        for (var i = 0; i < elts.length; i++)
        {
            if (elts[i].classList.contains("swarmWorkflowEnd"))
                elts[i].classList.add("swarmWorkflowComplete");
            else
            {
                var nextStep = this.getNextStep(elts[i]);
                if (nextStep)
                {
                    elts[i].setAttribute('disabled', 'disabled');
                    this.dispatchToStepByButton(elts[i], "onStepDisabled", [doc, elts[i]]);
                    nextStep.removeAttribute('disabled');
                    this.dispatchToStepByButton(nextStep, "onStepEnabled", [doc, nextStep]);
                }
            }
        }
    },

    getNextStep: function(elt)
    {
        while(elt = elt.nextSibling)
        {
            if (!elt.classList)  // eg TextNode
                continue;

            if (elt.classList.contains('swarmWorkflowStep'))
                return elt;
            else if (elt.classList.contains('swarmWorkflowEnd'))
                return elt;
        }
    },

    //----------------------------------------------------------------------------------

    registeredWorkflowSteps: {}, // key CSS class name, value obj shaped as Swarm.WorkflowStep

    registerWorkflowStep: function(key, obj)
    {
        this.registeredWorkflowSteps[key] = obj;
    },

    dispatch: function(eventName, args)
    {
        FBTrace.sysout("swarm dispatch "+eventName, args);

        for(var p in this.registeredWorkflowSteps)
        {
            if (this.registeredWorkflowSteps.hasOwnProperty(p))
            {
                var listener = this.registeredWorkflowSteps[p];
                try
                {
                    listener[eventName].apply(listener, args);
                }
                catch(exc)
                {
                    FBTrace.sysout("swarm.dispatch FAILS for "+p+"["+eventName+"] because "+exc, { exc: exc, listener: listener});
                }
            }
        }
    },

};


// The interface between the swarm code and fbtest window
Swarm.embedder = {

        progress: function(msg)
        {
            var elt = document.getElementById("progressMessage");
            elt.value = msg;
            if (/ERROR/i.test(msg))
                elt.style.color = "red";
            else
                delete elt.style.color;
            FBTrace.sysout("Swarm.progress "+msg);
        },

        attachToPage: function()
        {
            var browser = $("taskBrowser");
            var doc = browser.contentDocument;
            if(!doc.getElementById('swarmDefinition'))
            {
                this.progress("Not a swarm document");
                return;
            }
            else
            {
                this.progress("Noticed a Swarm Test Document");
                Swarm.workflowMonitor.initialize(doc, this.progress);
                Swarm.workflowMonitor.initializeUI(doc, this.progress);
            }
        },

        detachFromPage: function()
        {
            var browser = $("taskBrowser");
            var doc = browser.contentDocument;
            FBTrace.sysout("detachFromPage ", Swarm);
            Swarm.workflowMonitor.shutdown(doc, this.progress);
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
                    observerService.removeObserver(Swarm.embedder, "fbtest");
                    Swarm.embedder.detachFromPage();
                }
                else if (data == "restart")
                {
                    var fbtest = subject;
                    Swarm.embedder.attachToPage();
                }

            }
            catch(exc)
            {
                FBTrace.sysout("observe FAILS "+exc, exc);
            }
        },
};

observerService.addObserver(Swarm.embedder, "fbtest", false);  // removed in observe: 'shutdown'

}}());
