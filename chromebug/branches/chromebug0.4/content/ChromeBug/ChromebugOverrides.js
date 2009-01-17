/* See license.txt for terms of usage */


FBL.ns(function chromebug() { with (FBL) {
	
const Ci = Components.interfaces;	
const nsIDOMDocumentXBL = Ci.nsIDOMDocumentXBL;	
	
var ChromeBugWindowInfo = Firebug.Chromebug.xulWindowInfo;

var ChromeBugOverrides = {

    //****************************************************************************************
    // Overrides

    // Override FirebugChrome
    syncTitle: function()
    {
        window.document.title = "ChromeBug";
        if (window.Application)
            window.document.title += " in " + Application.name + " " +Application.version;
        FBTrace.sysout("Chromebug syncTitle"+window.document.title+"\n");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Location interface provider for binding.xml panelFileList

    getLocationProvider: function()
    {
        // a function that returns an object with .getObjectDescription() and .getLocationList()
        return function multiContextLocator() 
        {
            var locatorDelegator = 
            {
                    getObjectDescription: function(object)
                    {
                        // the selected panel may not be able to handle this because its in the wrong context
                        FBTrace.sysout("MultiContextLocator getObjectDescription"+object, object);
                        return FirebugContext.chrome.getSelectedPanel().getObjectDescription(object);
                    },
                    getLocationList: function()
                    {
                        // The select panel is in charge.
                        return FirebugContext.chrome.getSelectedPanel().getLocationList();
                    },
            }
            return locatorDelegator;
        }
     },
     
     select: function(object, panelName, sidePanelName, forceUpdate)
     {
         //if (FBTrace.DBG_PANELS)                                                                                                                       /*@explore*/
             FBTrace.sysout("ChromebugOverrides.select object:"+object+" panelName:"+panelName+" sidePanelName:"+sidePanelName+" forceUpdate:"+forceUpdate, object);  /*@explore*/
         if (!panelName)
             panelName = FirebugContext.panelName;
         
         var bestPanelName = getBestPanelName(object, panelName);  // type testing.
         
         // Type testing  has found a panel name. Now we ask each context to check if it has the object
         var context = Firebug.Chromebug.ContextList.eachContext(function findObject(context)
         {
             var panel = context.getPanel(bestPanelName);
             FBTrace.sysout("ChromebugOverrides select panel "+bestPanelName, panel);
             if (panel && panel.hasObject(object))
                 return context;
             else
            	 return false;
         });
         FBTrace.sysout("ChromebugOverrides select found context "+context+" for bestPanelName "+bestPanelName);
         
         if (context)  // else don't move
             Firebug.Chromebug.ContextList.setCurrentLocation(context);
         
         var panel = FirebugChrome.selectPanel(bestPanelName, sidePanelName, true);
         if (panel)
             panel.select(object, forceUpdate);
     },
    
    // Override Firebug.HTMLPanel.prototype
    getParentObject: function(node)
    {
        if (node instanceof SourceText)
            return node.owner;

        var parentNode = node ? node.parentNode : null;
        if (FBTrace.DBG_HTML) FBTrace.sysout("ChromeBugPanel.getParentObject for "+node.localName+" parentNode:"+(parentNode?parentNode.localName:"null-or-false")+"\n");

        if (parentNode)
        {
            if (!parentNode.localName)
            {
                if (FBTrace.DBG_HTML) FBTrace.sysout("ChromeBugPanel.getParentObject null localName must be window\n");
                return null;
            }
            if (FBTrace.DBG_HTML) FBTrace.sysout("ChromeBugPanel.getParentObject if(parentNode):"+(parentNode?parentNode.localName:"null-or-false")+"\n");
            if (parentNode.nodeType == 9) // then parentNode is Document element
            {
                if (this.embeddedBrowserParents)
                {
                    var skipParent = this.embeddedBrowserParents[node];  // better be HTML element, could be iframe
                    if (FBTrace.DBG_HTML) FBTrace.sysout("ChromeBugPanel.getParentObject skipParent:"+(skipParent?skipParent.localName:"none")+"\n");                  /*@explore*/
                    if (skipParent)
                        return skipParent;
                }
                if (parentNode.defaultView)
                {
                    if (FBTrace.DBG_HTML) FBTrace.sysout("ChromeBugPanel.getParentObject parentNode.nodeType 9, frameElement:"+parentNode.defaultView.frameElement+"\n");                  /*@explore*/
                    return parentNode.defaultView.frameElement;
                }
                else // parent is document element, but no window at defaultView.
                    return null;
            }
            else
                return parentNode;
        }
        else  // Documents have no parent node;Attr, Document, DocumentFragment, Entity, and Notation. top level windows have no parentNode
        {
            if (node && node.nodeType == 9) // document type
            {
                if (node.defaultView) // generally a reference to the window object for the document, however that is not defined in the specification
                {
                    var embeddingFrame = node.defaultView.frameElement;
                    if (embeddingFrame)
                        return embeddingFrame.parentNode;
                }
                else // a Document object without a parentNode or window
                    return null;  // top level has no parent
            }
        }
    },

    getChildObject: function(node, index, previousSibling)
    {
        if (!node)
        {
            FBTrace.dumpStack("null node to getChildObject");
            return;
        }
var header = "ChromeBugPanel.getChildObject, node:"+node.localName+" index="+index+" prev="+(previousSibling?previousSibling.tagName:"null")+" result:";
        // We assume that the first call will have index = 0 and previousSibling = null;
        var result = null;
        if (this.isSourceElement(node))
        {
            if (index == 0)
                return this.getElementSourceText(node);
        }
        else if (previousSibling)  // then we are walking, anonymous or not
        {
            return echo(header,  this.findNextSibling(previousSibling) );
        }
        else // we need to start an iteration
        {
            var doc = node.ownerDocument;
            if (doc instanceof nsIDOMDocumentXBL)
            {
                var anonymousChildren = doc.getAnonymousNodes(node);
                if (anonymousChildren)
                {
                    if (node.__walkingAnonymousChildren) // then we are done walking anonymous
                    {
                        FBTrace.sysout("ChromeBugPanel.getChildObject done anonymous \n");
                        delete node.__walkingAnonymousChildren;
                    }
                    else
                    {
                        FBTrace.sysout("ChromeBugPanel.getChildObject starting on anonymous "+anonymousChildren.length+"\n");
                        node.__walkingAnonymousChildren = true;
                        return echo(header, anonymousChildren[0]);
                    }
                }
            }
            // Not a DocumentXBL or no anonymousChildren or we walked all of them.
            // On to regular nodes

            if (node.contentDocument)
            {
                if (!this.embeddedBrowserParents)
                    this.embeddedBrowserParents = {};
                var skipChild = node.contentDocument.documentElement; // unwrap
                this.embeddedBrowserParents[skipChild] = node;

                 result = node.contentDocument.documentElement;  // (the node's).(type 9 document).(HTMLElement)
                 /*
                 FBTrace.dumpProperties("ChromeBugPanel.getChildObject for no prev yes contentDocument this.embeddedBrowserParents: ", this.embeddedBrowserParents);
                 FBTrace.dumpProperties("ChromeBugPanel.getChildObject for no prev yes contentDocument node.parentNode: ", node.parentNode);
                 FBTrace.dumpProperties("ChromeBugPanel.getChildObject for no prev yes contentDocument node: ", node);
                 FBTrace.dumpProperties("ChromeBugPanel.getChildObject for no prev yes contentDocument node.contentDocument: ", node.contentDocument);
                 FBTrace.dumpProperties("ChromeBugPanel.getChildObject for no prev yes contentDocument documentElement: ", result);
                 */
            }
            else if (Firebug.showWhitespaceNodes)
                result = node.childNodes[index];
            else
            {
                var childIndex = 0;
                for (var child = node.firstChild; child; child = child.nextSibling)
                {
                    if (!this.isWhitespaceText(child) && childIndex++ == index)
                        result = child;
                }
            }
        }

        return echo(header ,result);
    },

    getAnonymousChildObject: function(node, document)
    {
        if (FBTrace.DBG_HTML)
                FBTrace.sysout("ChromeBugPanel.getAnonymousChildObject for "+node.localName+" children: ");

        var anonymousChildren = document.getAnonymousNodes(node);
        if (anonymousChildren)
        {
            if(node.__walkingAnonymousChildren)  // second time we ran out of siblings
            {
                if (FBTrace.DBG_HTML)
                    FBTrace.sysout("DONE \n");
                delete node.__walkingAnonymousChildren
                return null;
            }
            else // first time
            {
                FBTrace.sysout(anonymousChildren.length+" \n");
                node.__walkingAnonymousChildren = true;
                return anonymousChildren[0];  // this will start us on another loop using previousSibling
            }
        }
        if (FBTrace.DBG_HTML)
            FBTrace.sysout(" none\n");
    },

    // Override debugger
    supportsWindow: function(win)
    {
        try {
            var xulWindowInfo = ChromeBugWindowInfo;
            var context = (win ? Firebug.Chromebug.getContextByDOMWindow(win, true) : null);

            if (context && context.globalScope instanceof ContainedDocument)
            {
                if (context.window.Firebug)  // Don't debug, let Firebug do it.
                    return false;
            }

            if (FBTrace.DBG_LOCATIONS) FBTrace.sysout("ChromeBugPanel.supportsWindow win.location.href: "+((win && win.location) ? win.location.href:"null")+ " context:"+context+"\n");
            this.breakContext = context;
            return !!context;
        }
        catch (exc)
        {
            FBTrace.dumpProperties("ChromebugPanel.supportsWindow FAILS", exc);
            return false;
        }
    },

    // Override debugger
    supportsGlobal: function(global, frame)  // (set the breakContext and return true) or return false;  
    {
    	if (FBTrace.DBG_FBS_FINDDEBUGGER)
    	{
    		var fileName = normalizeURL(frame.script.fileName);
    		FBTrace.sysout("ChromebugOverrides supportsGlobal "+fileName);
    	}
        try {
        	if (global)
        	{
        		var rootDOMWindow = getRootWindow(global);
        		if (rootDOMWindow && rootDOMWindow.location && rootDOMWindow.location.toString().indexOf("chrome://chromebug") != -1)
        			return false;  // ignore self
        	}
            
            var context = null;  // our goal is to set this.
            var fileName = normalizeURL(frame.script.fileName);
        	var description = Firebug.Chromebug.parseURI(fileName);
        	if (description && description.path)
        	{
        		var pkg = Firebug.Chromebug.ContextList.getOrCreate(description.path);
        		pkg.eachContext(function findMatchingContext(pkgContext)
        		{
        			if (pkgContext.window == rootDOMWindow)
        				context = pkgContext;
        			return context; // if null, look at another context.
        		});

        		if (!context)
    			{
    				// we know the script being run is part of a package, but no context in the package supports the window.
        			if (global)
        				context = pkg.createContextInPackage(rootDOMWindow);
        			else
        			{
        				// The jscontext for these are out reach currently...
        				var context = Firebug.Chromebug.createContext();  
        				pkg.appendContext(context);
        			}
    			}
    			if (FBTrace.DBG_LOCATIONS)
                	FBTrace.sysout("debugger.supportsGlobal set context via pkg "+description.path+" to "+context.getName()+" during "+frame.script.fileName);
        	}
        	
        	if (!context)
        	{
        		context = Firebug.Chromebug.getContextByGlobal(global);  // eg browser.xul
    			if (FBTrace.DBG_LOCATIONS)
                	FBTrace.sysout("debugger.supportsGlobal saw pkg: "+(description?description.path:"null")+" set context via ChromeBugWindowInfo to "+context.getName());
        	}
        	
            if (!context)
            {
                if (global.location)  // then we have a window, it will be an nsIDOMWindow, right?
                {
                    context = ChromeBugWindowInfo.addFrameGlobal(global);

        			if (FBTrace.DBG_LOCATIONS)
                    	FBTrace.sysout("debugger.supportsGlobal created frameGlobal "+context.getName());
                }
            }

            if (!context)
            {
       			if (FBTrace.DBG_LOCATIONS)
                   FBTrace.sysout("ChromeBugPanel.supportsGlobal but no context and no location");
            }
            
            this.breakContext = context;
            return !!context;
        }
        catch (exc)
        {
           FBTrace.dumpProperties("supportsGlobal FAILS:", exc);
        }

    },

    // Override
    // Override FBL

    skipSpy: function(win)
    {
        var uri = win.location.href; // don't attach spy to chromebug
        if (uri &&  uri.indexOf("chrome://chromebug") == 0)
                return true;
    },

    isHostEnabled: function(context)
    {
        return true; // Chromebug is always enabled for now
    },
    
    isAlwaysEnabled: function(context)
    {
        return true; // Chromebug is always enabled for now
    },

    suspendFirebug: function()
    {
        // TODO if possible.
        FBTrace.sysout("ChromebugPanel.suspendFirebug\n");
    },

    resumeFirebug: function()
    {
        // TODO if possible.
        FBTrace.sysout("ChromebugPanel.resumeFirebug\n");
    },
    
    
};

ChromeBugOverrides.commandLine = {
		
		isAttached: function(context)
	    {
	FBTrace.sysout("ChromebugOverride isAttached for "+context.window, context.window);
	    	return context && context.window && context.window._FirebugCommandLine;
	    },
	    
		evaluate: function(expr, context, thisValue, targetWindow, successConsoleFunction, exceptionFunction)
		{
			FBTrace.sysout('ChromebugOverrides.commandLine context.window '+context.window.location+" targetWindow "+targetWindow);
			
			var halter = context.window.document.getElementById("chromebugHalter");
			if (halter)
				context.window.document.removeElement(halter);
			
			halter = addScript(context.window.document, "chromebugHalter", "debugger;");
			/*
			Firebug.Debugger.halt(function evaluateInAFrame(frame)
			{
				context.currentFrame = frame;
				FBTrace.sysout("ChromebugOverrides.commandLine halted", frame);
				
				Firebug.CommandLine.evaluateInDebugFrame(expr, context, thisValue, targetWindow, successConsoleFunction, exceptionFunction);
			});
			*/
		},
		onCommandLineFocus: function(event)
		{
				if (FBTrace.DBG_CONSOLE)
					FBTrace.sysout("onCBCommandLineFocus", event);
				// do nothing.
				event.stopPropagation();   
		},
}
//**************************************************************************
function overrideFirebugFunctions()
{
    try {
        // Apply overrides
        top.Firebug.prefDomain = "extensions.chromebug";
        top.FirebugChrome.getLocationProvider = ChromeBugOverrides.getLocationProvider;
        //top.FirebugChrome.select = ChromeBugOverrides.select;
         
        top.Firebug.HTMLPanel.prototype.getParentObject = ChromeBugOverrides.getParentObject;
        top.Firebug.HTMLPanel.prototype.getChildObject = ChromeBugOverrides.getChildObject;
        top.Firebug.HTMLPanel.prototype.getAnonymousChildObject = ChromeBugOverrides.getAnonymousChildObject;
        top.Firebug.Debugger.supportsWindow = ChromeBugOverrides.supportsWindow;
        top.Firebug.Debugger.supportsGlobal = ChromeBugOverrides.supportsGlobal;
        top.Firebug.showBar = function() {
            if (FBTrace.DBG_CHROMEBUG)
                FBTrace.sysout("ChromeBugPanel.showBar NOOP\n");
        }

        Firebug.Spy.skipSpy = ChromeBugOverrides.skipSpy;
        Firebug.ActivableModule.isHostEnabled = ChromeBugOverrides.isHostEnabled;
        Firebug.ActivableModule.isAlwaysEnabled = ChromeBugOverrides.isAlwaysEnabled;
        Firebug.suspendFirebug = ChromeBugOverrides.suspendFirebug;
        Firebug.resumeFirebug = ChromeBugOverrides.resumeFirebug;
        
        //Firebug.CommandLine.evaluate = ChromeBugOverrides.commandLine.evaluate;
        //Firebug.CommandLine.onCommandLineFocus = ChromeBugOverrides.commandLine.onCommandLineFocus;
        Firebug.CommandLine.isAttached = ChromeBugOverrides.commandLine.isAttached;
        // Trace message coming from Firebug should be displayed in Chromebug's panel
        //
        Firebug.setPref("extensions.firebug", "enableTraceConsole", "panel");

        dump("ChromebugPanel Overrides applied"+"\n");
    }
    catch(exc)
    {
        dump("ChromebugPanel override FAILS "+exc+"\n");
    }
}

function echo(header, elt)
{
    if (FBTrace.DBG_HTML && elt)
        FBTrace.sysout(header + (elt ? elt.localName:"null")+"\n");
    return elt;
}
// TODO make this FBL or chrome . functions
function panelSupportsObject(panelType, object)
{
    if (panelType)
    {
        try {
            // This tends to throw exceptions often because some objects are weird
            return panelType.prototype.supportsObject(object)
        } catch (exc) {}
    }

    return 0;
}

function getBestPanelName(object, panelName)
{

    // Check if the suggested panel name supports the object, and if so, go with it
    if (panelName)
    {
        panelType = Firebug.getPanelType(panelName);
        if (panelSupportsObject(panelType, object))
            return panelType.prototype.name;
    }

    // The suggested name didn't pan out, so search for the panel type with the
    // most specific level of support

    var bestLevel = 0;
    var bestPanel = null;

    for (var i = 0; i < Firebug.panelTypes.length; ++i)
    {
        var panelType = Firebug.panelTypes[i];
        if (!panelType.prototype.parentPanel)
        {
            var level = panelSupportsObject(panelType, object);
            if (!bestLevel || (level && (level > bestLevel) ))
            {
                bestLevel = level;
                bestPanel = panelType;
            }
            if (FBTrace.DBG_PANELS)                                                                                                                      /*@explore*/
                FBTrace.sysout("chrome.getBestPanelName panelType: "+panelType.prototype.name+" level: "+level+" bestPanel: "+ (bestPanel ? bestPanel.prototype.name : "null")+" bestLevel: "+bestLevel+"\n"); /*@explore*/
        }
    }

    return bestPanel ? bestPanel.prototype.name : null;
}
overrideFirebugFunctions();
}});