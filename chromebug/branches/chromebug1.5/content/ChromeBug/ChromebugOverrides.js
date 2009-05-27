/* See license.txt for terms of usage */


FBL.ns(function chromebug() { with (FBL) {

const Ci = Components.interfaces;
const nsIDOMDocumentXBL = Ci.nsIDOMDocumentXBL;

var previousContext = {global: null};

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
            FBTrace.sysout("ChromebugOverride running multiContextLocator");
            var locatorDelegator =
            {
                    getObjectDescription: function(object)
                    {
                        // the selected panel may not be able to handle this because its in the wrong context
                        if (FBTrace.DBG_LOCATIONS)
                            FBTrace.sysout("MultiContextLocator getObjectDescription "+object, object);
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
            FBTrace.sysout("null node to getChildObject");
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
                 FBTrace.sysout("ChromeBugPanel.getChildObject for no prev yes contentDocument this.embeddedBrowserParents: ", this.embeddedBrowserParents);
                 FBTrace.sysout("ChromeBugPanel.getChildObject for no prev yes contentDocument node.parentNode: ", node.parentNode);
                 FBTrace.sysout("ChromeBugPanel.getChildObject for no prev yes contentDocument node: ", node);
                 FBTrace.sysout("ChromeBugPanel.getChildObject for no prev yes contentDocument node.contentDocument: ", node.contentDocument);
                 FBTrace.sysout("ChromeBugPanel.getChildObject for no prev yes contentDocument documentElement: ", result);
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
            var xulWindowInfo = Chromebug.XULWindowInfo;
            var context = (win ? Firebug.Chromebug.getContextByGlobal(win) : null);

            if (context && context.globalScope instanceof Chromebug.ContainedDocument)
            {
                if (context.window.Firebug)  // Don't debug, let Firebug do it.
                    return false;
            }

            if (FBTrace.DBG_LOCATIONS)
                FBTrace.sysout("ChromeBugPanel.supportsWindow win.location.href: "+((win && win.location) ? win.location.href:"null")+ " context:"+context+"\n");
            this.breakContext = context;
            return !!context;
        }
        catch (exc)
        {
            FBTrace.sysout("ChromebugPanel.supportsWindow FAILS", exc);
            return false;
        }
    },

    // Override debugger
    supportsGlobal: function(frameWin, frame)  // (set the breakContext and return true) or return false;
    {
        try {
            if (frame)
            {
                // To map this frame to a context, we want the outermost scope of the current frame.
                // This is unlike Firebug, where we want to be in a Window, not just any scope.
                var scope = frame.scope;
                if (scope)
                {
                    while(scope.jsParent) // walk to the oldest scope
                        scope = scope.jsParent;

                    var global = scope.getWrappedValue();

                    if (FBTrace.DBG_TOPLEVEL)
                        FBTrace.sysout("supportsGlobal found oldest scope: "+scope.jsClassName, global);
                }
                var context = null;

                if (global == previousContext.global)
                    context = previousContext;
                if (!context)
                    context = Firebug.Chromebug.getContextByGlobal(global);
                if (context)
                {
                    if (FBTrace.DBG_TOPLEVEL)
                        FBTrace.sysout("supportsGlobal "+normalizeURL(frame.script.fileName)+": frame.scope gave existing context "+context.getName());
                }
                else
                {
                    var jsContext = frame.executionContext;  // may be null, mapped to tag zero
                    context = Chromebug.XULWindowInfo.addJSContext(scope.jsClassName, global, jsContext);
                    if (FBTrace.DBG_TOPLEVEL)
                            FBTrace.sysout("supportsGlobal "+normalizeURL(frame.script.fileName)+": frame.scope+jsContext gave new context "+context.getName());
                }
            }
            this.breakContext = context;

            if (context)
                previousContext = context; // private to this function
            else
                previousContext = {global: null};

            return !!context;
        }
        catch (exc)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("supportsGlobal FAILS:"+exc, exc);
        }

    },

    showThisSourceFile: function(sourceFile)
    {
        if (sourceFile.isEval() && !this.showEvals)
               return false;

        if (sourceFile.isEvent() && !this.showEvents)
            return false;

        var description = Chromebug.parseURI(sourceFile.href);

        if (Chromebug.allFilesList.isWantedDescription(description))
            return true;
        else
            return false;
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
        top.Firebug.chrome.getLocationProvider = ChromeBugOverrides.getLocationProvider;

        top.Firebug.HTMLPanel.prototype.getParentObject = ChromeBugOverrides.getParentObject;
        top.Firebug.HTMLPanel.prototype.getChildObject = ChromeBugOverrides.getChildObject;
        top.Firebug.HTMLPanel.prototype.getAnonymousChildObject = ChromeBugOverrides.getAnonymousChildObject;
        top.Firebug.Debugger.supportsWindow = ChromeBugOverrides.supportsWindow;
        top.Firebug.Debugger.supportsGlobal = ChromeBugOverrides.supportsGlobal;
        top.Firebug.ScriptPanel.prototype.showThisSourceFile = ChromeBugOverrides.showThisSourceFile;

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

        window.dump("ChromebugPanel Overrides applied"+"\n");
    }
    catch(exc)
    {
        window.dump("ChromebugPanel override FAILS "+exc+"\n");
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


overrideFirebugFunctions();
}});