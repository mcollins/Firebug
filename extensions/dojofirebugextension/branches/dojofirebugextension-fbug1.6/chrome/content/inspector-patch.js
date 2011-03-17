/* Released under BSD license (see license.txt) */
FBL.ns(function() { with (FBL) {

if (checkFirebugVersion("1.7.0a8") >= 0) {
	// The current version is Firebug 1.7.0a8+
	
	//so , no need to install this patch..
	return;
}

/*
 * monkey patch fbug 1.6.1 Inspector to allow other panels to participate
 * in Inspection
 */

	const inspectDelay = 100;

	var objToChange = Firebug.Inspector; 

	objToChange.inspectingPanel = null;
	

	objToChange.startInspecting = function(context) {
        if (this.inspecting || !context || !context.loaded)
            return;

        this.inspecting = true;
        this.inspectingContext = context;

        Firebug.chrome.setGlobalAttribute("cmd_toggleInspecting", "checked", "true");
        this.attachInspectListeners(context);

        
        var inspectingPanelName = this._resolveInspectingPanelName(context);
    	this.inspectingPanel = Firebug.chrome.switchToPanel(context, inspectingPanelName);

        
        if (Firebug.isDetached())
            context.window.focus();
        else if (Firebug.isMinimized())
            Firebug.showBar(true);

        this.inspectingPanel.panelNode.focus();
        this.inspectingPanel.startInspecting();

        if (context.stopped)
            Firebug.Debugger.thaw(context);

        if (context.hoverNode)
            this.inspectNode(context.hoverNode);
    };

    
    objToChange.inspectNode = function(node) {
        if (node && node.nodeType != 1)
            node = node.parentNode;

        if(node && unwrapObject(node).firebugIgnore && !node.fbProxyFor)
                return;

        var context = this.inspectingContext;

        if (this.inspectTimeout)
        {
            context.clearTimeout(this.inspectTimeout);
            delete this.inspectTimeout;
        }

        if(node && node.fbProxyFor)
            node = node.fbProxyFor;

        this.highlightObject(node, context, "frame");

        this.inspectingNode = node;

        if (node)
        {
        	var panel = this.inspectingPanel; //added code
            this.inspectTimeout = context.setTimeout(function()
            {
            	//added code
            	if(panel.inspectOnlySupportedObjects && !panel.supportsObject(node, typeof node)) {
            		return;
            	}
                
            	Firebug.chrome.select(node);
                
            }, inspectDelay);
            dispatch(this.fbListeners, "onInspectNode", [context, node] );
        }
    };


    objToChange.stopInspecting = function(cancelled, waitForClick) {
        if (!this.inspecting)
            return;

        var context = this.inspectingContext;

        if (context.stopped)
            Firebug.Debugger.freeze(context);

        if (this.inspectTimeout)
        {
            context.clearTimeout(this.inspectTimeout);
            delete this.inspectTimeout;
        }

        this.detachInspectListeners(context);
        if (!waitForClick)
            this.detachClickInspectListeners(context.window);

        Firebug.chrome.setGlobalAttribute("cmd_toggleInspecting", "checked", "false");

        this.inspecting = false;

        var panel = Firebug.chrome.unswitchToPanel(context, this.inspectingPanel.name, cancelled);

        panel.stopInspecting(panel.selection, cancelled); //should be same as this.inspectingPanel

        dispatch(this.fbListeners, "onStopInspecting", [context] );

        this.inspectNode(null);
    };

    /*string*/objToChange._resolveInspectingPanelName = function(context) {
        var requestingPanel = context.getPanel(context.panelName);
        var name;
        if(requestingPanel && requestingPanel.inspectable) {
        	name = context.panelName;
        } else {
        	name = "html";
        } 
    	return name;
    };
    
    objToChange.inspectFromContextMenu = function(elt) {
        var context, panel;

        Firebug.toggleBar(true);
        context = this.inspectingContext || TabWatcher.getContextByWindow(elt.ownerDocument.defaultView);
        var inspectingPanelName = this._resolveInspectingPanelName(context);
        Firebug.chrome.select(elt, inspectingPanelName);
        panel = Firebug.chrome.selectPanel(inspectingPanelName);
        panel.panelNode.focus();       
    };



}});
