/* See license.txt for terms of usage */

/**
 * UI control of debug Logging for Firebug internals
 */
FBL.ns(function() { with (FBL) {

// ***********************************************************************************
// Shorcuts and Services

const Cc = Components.classes;
const Ci = Components.interfaces;

const traceService = Cc["@joehewitt.com/firebug-trace-service;1"].getService(Ci.nsIObserverService);

// ***********************************************************************************
// TraceConsole Module


Firebug.Chromebug.TraceConsoleModule = extend(Firebug.Module,
{
    initialize: function(prefDomain, prefNames)  // the prefDomain is from the app, eg chromebug
    {
        if (FBTrace.DBG_CB_CONSOLE)
            FBTrace.sysout("cb.TraceConsoleModule.initialize, prefDomain (ignored): " + prefDomain);

        traceService.addObserver(this, "firebug-trace-on-message", false);
    },

    shutdown: function()
    {
        if (FBTrace.DBG_CB_CONSOLE)
            FBTrace.sysout("cb.TraceConsoleModule.shutdown, prefDomain: " + prefDomain);

        traceService.removeObserver(this, "firebug-trace-on-message");
    },

    loadedContext: function(context)
    { 
    	if (this.tracePanel)  // one per app
    		context.setPanel(this.tracePanel.name, this.tracePanel);
    	else
    		this.tracePanel = this.createTracePanel(context);
    },
    
    createTracePanel: function(context)
    {
    	var panel = context.getPanel("trace", false); // create if need be.
    	return panel;
    },

    onLoadConsole: function(win, rootNode)  // NOT CALLED
    { 
    	try {
    		// Initilize basic content. Notice that this tracing-console is intended
    		// for firebug logs so, this is why the pref-domain is hardcoded.
    		this.logs = Firebug.TraceModule.CommonBaseUI.initializeContent(rootNode, "extensions.firebug");
    		 
    		Firebug.TraceModule.onLoadConsole(win, rootNode);
    	}
    	catch(exc) 
    	{ 
    		window.dump("tracePanel onLoadConsole FAILS "+exc+"\n"); // FBTrace does not work here 
    	}
    },

    // nsIObserver
    observe: function(subject, topic, data)
    {
        if (topic == "firebug-trace-on-message")
        {
            // Display messages only with "extensions.firebug" type.
            var messageInfo = subject.wrappedJSObject;
            // type is controlled by FBTrace.prefDomain in the XULWindow that sent the trace message
            if (messageInfo.type != "extensions.firebug")  // TODO selectable 
                return;

            if (this.tracePanel)
            {
            	this.tracePanel.dump(new Firebug.TraceModule.TraceMessage(
            			messageInfo.type, data, messageInfo.obj));
            	return false;
            }
            return false;
        }
    },

    clearPanel: function(context)
    {
    	var tracePanel = context.getPanel("trace");
    	FBTrace.sysout("clearPanel ", tracePanel);
    	if (tracePanel)
    		tracePanel.clear();
    },
});


// ************************************************************************************************
// Trace Panel

Firebug.Chromebug.TraceConsolePanel = function() {}

Firebug.Chromebug.TraceConsolePanel.prototype = extend(Firebug.Panel,
{
    name: "trace",
    title: "Trace",
    searchable: true,
    editable: false,

    initializeNode: function(myPanelNode)
    {
		this.controller = new Firebug.TraceOptionsController("extensions.firebug", this.onPrefChange);
		this.logs = Firebug.TraceModule.MessageTemplate.createTable(myPanelNode);
		Firebug.TraceModule.onLoadConsole(window, myPanelNode);
		this.unwrapper = bind(this.unWrapMessage, this);
    },

    destroyNode: function()
    {
    },

    show: function(state)
    {
        if (FBTrace.DBG_CB_CONSOLE)
            FBTrace.sysout("cb.TraceConsolePanel.show", state);

        this.showToolbarButtons("cbTraceButtons", true);
        this.showToolbarButtons("fbConsoleButtons", false); // this fails!

        var consoleButtons = this.context.browser.chrome.$("fbConsoleButtons");
        collapse(consoleButtons, true);
        
        if (FBTrace.DBG_OPTIONS)
            FBTrace.sysout("TraceFirebug.panel show consoleButtons", consoleButtons);
        
        if (this.lastScrollTop && this.logs)
        	this.logs.scrollTop = this.lastScrollTop; 
    },

    hide: function()
    {
        this.showToolbarButtons("cbTraceButtons", false);

        if (FBTrace.DBG_OPTIONS)
            FBTrace.sysout("TraceFirebug.panel hide", this);

        if (this.context && this.context.browser)
        {
            var consoleButtons = this.context.browser.chrome.$("fbConsoleButtons");
            collapse(consoleButtons, false);
        }
        
        this.lastScrollTop = this.logs.scrollTop;
    },
    
    clear: function()
    {
        if (FBTrace.DBG_CB_CONSOLE)
            FBTrace.sysout("cb.TraceConsolePanel.clear");

        if (this.panelNode)
            clearNode(this.panelNode);
        
        this.logs = Firebug.TraceModule.MessageTemplate.createTable(this.panelNode);
    },

    getOptionsMenuItems: function()
    { 
    	 var items = this.controller.getOptionsMenuItems();
    	 items.push(this.getAllOffOptionMenuItem());
    	 return items;
    },
    
    getAllOffOptionMenuItem: function()
    {
    	var self = this;
        return {label: "AllOptionsOff",  nol10n: true, type: "checkbox", checked: false,
            command: function allOff()
        {
        	FBTrace.sysout("getAllOffOptionMenuItem ", self.controller)
        	self.controller.clearOptions();
        }};
    },
    
    onPrefChange: function(optionName, optionValue)
    {
    	FBTrace.sysout("tracePanel.onPrefChange: "+optionName+"="+optionValue);
    },
    
    search: function(text)
    {
        if (!text)
            return;

        // Make previously visible nodes invisible again
        if (this.matchSet)
        {
            for (var i in this.matchSet)
                removeClass(this.matchSet[i], "matched");
        }

        this.matchSet = [];
        
        var a_row = getElementByClass(this.logs, "messageRow");
        if (!a_row)
        	return false; // too early
        
        var rows = a_row.parentNode;

        function findRow(node) {var mr = getAncestorByClass(node, "messageRow"); FBTrace.sysout("findRow ",mr);return mr;}
        var search = new TextSearch(rows, findRow);
FBTrace.sysout("tracePanel search #nodes"+rows.childNodes.length, search );
        var logRow = search.find(text);
        if (!logRow)
            return false;
        
        for (; logRow; logRow = search.findNext())
        {
            setClass(logRow, "matched");
            FBTrace.sysout("tracePanel search FOUND:\'"+text+"\'", logRow);
            FBTrace.sysout("tracePanel search #nodes"+rows.childNodes.length, search );
            this.matchSet.push(logRow);
        }

        return true;
    },
    // ********************************************************************************************
    // Message dump
    dump: function(message)
    {
        // Notify listeners
        Firebug.TraceModule.onDump(message);

        if (!this.logs)
            return;

        var index = message.text.indexOf("ERROR");
        if (index != -1)
            message.type = "DBG_ERROR";

        index = message.text.indexOf("EXCEPTION");
        if (index != -1)
            message.type = "DBG_ERROR";

        // The wrapper could a domplate but then the domplate expansion would be in the domplate and confuse me.
        var wrapper = this.logs.ownerDocument.createElement("tr");
        wrapper.className = "messageRow";
        
        var wrapperNumberCell =  this.logs.ownerDocument.createElement("td");
        wrapperNumberCell.className = "messageNameCol messageCol";
        
        var wrapperNumber =  this.logs.ownerDocument.createElement("div");
        message.wrapperIndex = this.logs.firstChild.childNodes.length + 1;
        wrapperNumber.innerHTML = message.wrapperIndex +"";
        wrapperNumber.className = "messageNameLabel messageLabel";
        wrapperNumberCell.appendChild(wrapperNumber);
        
        var wrapperData = this.logs.ownerDocument.createElement("td");
        wrapperData.innerHTML = message.getLabel(-1);
        wrapperData.className = "messageCol messageLabel";
        
        wrapper.message = message;
        wrapper.addEventListener('click', this.unwrapper, true);
        
        wrapper.appendChild(wrapperNumberCell);
        wrapper.appendChild(wrapperData);
        this.logs.firstChild.appendChild(wrapper);
    },
    
    unWrapMessage: function(event) 
    {
    	var wrapper  = event.currentTarget;
    	wrapper.removeEventListener('click', this.unwrapper, true);
    	var message = wrapper.message;
    	var index = message.wrapperIndex - 1; // somewhere in the domplate expansion a one is added.
    	
    	// expand the domplate into the end of parent
    	 
    	var result = Firebug.TraceModule.MessageTemplate.dump(message, wrapper.parentNode, index);

    	// move the new row over the wrapper
    	
    	try 
    	{
    		var theUnwrapped = message.row;
    		var old = wrapper.parentNode.replaceChild(theUnwrapped, wrapper);
    	}
    	catch (exc)
    	{
    		FBTrace.sysout("tracePanel.unWrapMessage replaceChild", exc);
    	}
    	Firebug.TraceModule.MessageTemplate.toggleRow(theUnwrapped);
    },
});

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.Chromebug.TraceConsoleModule);
Firebug.registerPanel(Firebug.Chromebug.TraceConsolePanel);

// ************************************************************************************************

}});
