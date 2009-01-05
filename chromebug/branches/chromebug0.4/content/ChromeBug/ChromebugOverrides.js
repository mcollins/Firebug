/* See license.txt for terms of usage */


FBL.ns(function chromebug() { with (FBL) {
	
const Ci = Components.interfaces;	
const nsIDOMDocumentXBL = Ci.nsIDOMDocumentXBL;	
	
var ChromeBugWindowInfo = Firebug.Chromebug.xulWindowInfo;

var ChromeBugOverrides = {

    //****************************************************************************************
    // Overrides

    // Override FirebugChrome.syncTitle
    syncTitle: function()
    {
        window.document.title = "ChromeBug";
        if (window.Application)
            window.document.title += " in " + Application.name + " " +Application.version;
        FBTrace.sysout("Chromebug syncTitle"+window.document.title+"\n");
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
    supportsGlobal: function(global, frame)
    {
        try {
            var rootDOMWindow = getRootWindow(global);
            if (rootDOMWindow.location.toString().indexOf("chrome://chromebug") != -1)
                return false;  // ignore self
            
            var context = null;  // our goal is to set this.
            
        	var description = Firebug.Chromebug.parseURI(frame.script.fileName);
        	if (description && description.path)
        	{
        		var pkg = Firebug.Chromebug.PackageList.getPackageByName(description.path);
        		if (pkg)
        		{
        			pkg.eachContext(function findMatchingContext(pkgContext)
        			{
        				if (pkgContext.window == rootDOMWindow)
        					context = pkgContext;
        			});
        			if (!context)
        			{
        				// we know the script being run is part of a package, but no context in the package supports the window.
        				context = pkg.createContextInPackage(rootDOMWindow) 
        			}
        			if (FBTrace.DBG_LOCATIONS)
                    	FBTrace.sysout("debugger.supportsGlobal set context via pkg "+description.path+" to "+context.getName());
        		}
        		else
        		{
        			var str = "";
        			Firebug.Chromebug.PackageList.eachPackage(function appendNames(pkg)
        			{
        				str += pkg.name+" ";
        			});
        			if (FBTrace.DBG_LOCATIONS)
        				FBTrace.sysout("no package named "+description.path + " in "+str);
        		}
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

overrideFirebugFunctions();
}});