/* Released under BSD license (see license.txt) */
/*
 * Copyright IBM Corporation 2010, 2010. All Rights Reserved. 
 * U.S. Government Users Restricted Rights -  Use, duplication or disclosure restricted by GSA ADP 
 * Schedule Contract with IBM Corp. 
 */


/**
 * Firebug dojo extension main file.
 * @author preyna@ar.ibm.com
 * @author fergom@ar.ibm.com
 */
define([
        "firebug/firebug",
        "firebug/lib/dom",
        "firebug/lib/object",
        "firebug/lib/trace",
        "firebug/lib/wrapper",
        "dojo/core/dojoaccess",
        "dojo/core/dojodebugger",
        "dojo/core/dojomodel",
        "dojo/core/prefs",
        "dojo/core/proxies",        
        "dojo/lib/utils",
        "dojo/ui/dojoreps"
       ], function dojoModuleFactory(Firebug, Dom, Obj, FBTrace, Wrapper, DojoAccess, DojoDebug, DojoModel, DojoPrefs, DojoProxies, DojoUtils, DojoReps)
{

// ****************************************************************
// GLOBAL FUNCTIONS IN THIS NAMESPACE
// ****************************************************************
    
    
    var DojoExtension = {};
    
    var VERSION = "1.1a1";
    
    /**
     * returns the DojoAccessor service.
     */
    var getDojoAccessor = DojoExtension.getDojoAccessor = function(context) {
        var service = context.dojo.dojoAccessor;
        return service;
    };
    
    /**
     * returns the DojoDebugger service.
     */
    var getDojoDebugger = DojoExtension.getDojoDebugger = function(context) {
        var service = context.dojo.dojoDebugger;
        return service;
    };

    /**
     * returns the current context.
     */
    /*context*/var safeGetContext = DojoExtension.safeGetContext = function(panel) {
        var ctx = panel.context;
        if(!ctx) {
            ctx = Firebug.currentContext;
        }
        return ctx;
    };

    var setNeedsReload = DojoExtension.setNeedsReload = function(context, flag) {
        context.needReload = flag;
    };
    
    var needsReload = DojoExtension.needsReload = function(context) {
        return context.needReload;
    };
    
    /**
     * returns a boolean to define if the connection should or should not be registered
     *             considering the objects in it.
     */
    var _filterConnection = function(obj, event, context, method){
        var dojoAccessor = getDojoAccessor(safeGetContext(this));
        return dojoAccessor.isDojoAnimation(obj) && dojoAccessor.isDojoAnimation(context);
    };
    



//****************************************************************
// DOJO MODULE
//****************************************************************
/**
 * @module Dojo Firebug extension module.
 */
DojoExtension.dojofirebugextensionModel = Obj.extend(Firebug.ActivableModule,
{
    extensionLoaded: false, //if the extension has already registered its stuff.
    
    _getDojoPanel: function(context) {
        //FIXME invalid . Module shouldn't access the panel directly. This won't work in remote versions
        return context.getPanel("dojofirebugextension");
    },
        
    initialize: function() {
        Firebug.ActivableModule.initialize.apply(this, arguments);

        
        if (this.isExtensionEnabled() && Firebug.Debugger) {
            Firebug.Debugger.addListener(this);
        }
        
        this._registerContextMenuListener();
    },
    
    _registerContextMenuListener: function() {
        var contextMenu = document.getElementById("contentAreaContextMenu");
        if (contextMenu) {
            contextMenu.addEventListener("popupshowing", this._onContentAreaContextMenuShowing, false);
        }
    },
    
    _onContentAreaContextMenuShowing: function(event) {
        var inspectItem = document.getElementById("menu_dojofirebugextension_inspect");

        var elt = document.popupNode;
        var context = Firebug.TabWatcher.getContextByWindow(elt.ownerDocument.defaultView);
        var dojo = DojoAccess._dojo(context);
        var disabledValue = false;
        if(!dojo) {
            inspectItem.hidden = true;
        } else {
            var isElemSupported = DojoExtension.dojofirebugextensionModel._getDojoPanel(context).supportsObject(elt);
            inspectItem.hidden = !isElemSupported;
        }    
    },

    /**
     * inspector related method
     */
    inspectFromContextMenu: function(elt) {
        var panel, inspectingPanelName;
        var context = Firebug.TabWatcher.getContextByWindow(elt.ownerDocument.defaultView);

        inspectingPanelName = "dojofirebugextension";

        Firebug.toggleBar(true, inspectingPanelName);
        Firebug.chrome.select(elt, inspectingPanelName);

        panel = Firebug.chrome.selectPanel(inspectingPanelName);
        panel.panelNode.focus();
    },
    
    shutdown: function() {
        Firebug.ActivableModule.shutdown.apply(this, arguments);
        if (Firebug.Debugger) {
            Firebug.Debugger.removeListener(this);
        }
    },
    
    initContext: function(context, persistedState) {
        Firebug.ActivableModule.initContext.apply(this, arguments);
        var dojoAccessor = new DojoAccess.DojoAccessor();

        // Save extension's initial preferences values.
        context.initialConfig = {
                hashCodeBasedDictionaryImplementationEnabled: DojoPrefs._isHashCodeBasedDictionaryImplementationEnabled(),
                breakPointPlaceSupportEnabled: !DojoPrefs._isBreakPointPlaceSupportDisabled(),
                useEventBasedProxy: DojoPrefs._isUseEventBasedProxyEnabled()
        };
        
        context.objectMethodProxier = (DojoPrefs._isUseEventBasedProxyEnabled()) ?
                                        new DojoProxies.ObjectMethodProxierEventBased(context) : 
                                        new DojoProxies.ObjectMethodProxierDirectAccessBased();

        context.dojo = {            
                dojoAccessor: dojoAccessor,
                dojoDebugger: new DojoDebug.DojoDebugger(dojoAccessor)
        };

        context.connectionsAPI = new DojoModel.ConnectionsAPI(DojoPrefs._isHashCodeBasedDictionaryImplementationEnabled());
        
        
        // FIXME: HACK to find out if the page need to be reloaded due to data inconsistencies issues.
        var dojo = DojoAccess._dojo(context);
        setNeedsReload(context, (dojo && dojo["subscribe"]));
        
        //TODO this invocation could be in a better place. Here it will be only evaluated when reloading a page. 
        this._checkPanelActivationPrerequisites(context);
    },

    /**
     * Called after a context's page gets DOMContentLoaded
     */
    loadedContext: function(context) {
        if(context.showInitialViewCall) {
            //dojo.ready was registered. We don't need to do this.
            return;
        }
        
        var panel = this._getDojoPanel(context);
        
        if (panel) {
            // Show the initial view.
            panel.showInitialView(context);
        }
        
    },
    
    _checkPanelActivationPrerequisites: function(context) {
        var console = Firebug.PanelActivation.isPanelEnabled(Firebug.getPanelType("console"));
        var script = Firebug.PanelActivation.isPanelEnabled(Firebug.getPanelType("script"));
        if(!console || !script) {
            context.dojoPanelReqsNotMet = true;
        }
    },
    
    destroyContext: function(context, persistedState) {
        Firebug.ActivableModule.destroyContext.apply(this, arguments);
  
        //destroy what we created on initContext
        context.dojo.dojoDebugger.destroy();
        context.dojo.dojoAccessor.destroy();
        context.connectionsAPI.destroy();
        context.objectMethodProxier.destroy();
        
        delete context.dojo.dojoDebugger;
        delete context.dojo.dojoAccessor;
        delete context.connectionsAPI;
    },
            
    /**
     * invoked whenever the user selects a tab.
     */
    showPanel: function(browser, panel) {
        //TODO is this code right (to be here)?
        
        // this test on name is a sign that this code belongs in panel.show()
        var isdojofirebugextensionPanel = panel && panel.name == "dojofirebugextension";
        if(!browser || !browser.chrome) {
            return;
        }
        
        var dojofirebugextensionButtons = browser.chrome.$("fbdojofirebugextensionButtons");
        if(dojofirebugextensionButtons) {
            Dom.collapse(dojofirebugextensionButtons, !isdojofirebugextensionPanel);
        }
    },

    /**
     * show the about message
     */
    onAboutButton: function(/*fbug context*/context) {
        this._getDojoPanel(context).showAbout();
    },

    /**
     * display all connections
     */
    onShowConnectionsInTableButton: function(/*fbug context*/context) {
        this._getDojoPanel(context).showConnectionsInTable(context);
    },

    /**
     * display all widgets from dijit registry
     */
    onShowWidgetsButton: function(/*fbug context*/context) {
        this._getDojoPanel(context).showWidgets(context);
    },
    
    /**
     * display all subscriptions
     */
    onShowSubscriptionsButton: function(/*fbug context*/context) {
        this._getDojoPanel(context).showSubscriptions(context);
    },
    
    /**
     * called on each dojo file loaded (actually for every file).
     * This way, we can detect when dojo.js is loaded and take action. 
     */
    onSourceFileCreated : function (context, sourceFile) {
        var panelIsEnable = this.isExtensionEnabled();
        
        if (panelIsEnable) {
              
           var href = sourceFile.href;
          
           if(FBTrace.DBG_DOJO_DBG) {
               FBTrace.sysout("onSourceFileCreated: " + href);
           }
           
           
           var dojo = DojoAccess._dojo(context);
           if (!context.connectHooked && dojo && dojo.connect) {
               context.connectHooked = true;
           
               context.objectMethodProxier.proxyFunction(context, dojo, "dojo", 5, "_connect", null, this._proxyConnect(context));
               context.objectMethodProxier.proxyFunction(context, dojo, "dojo", 1, "disconnect", this._proxyDisconnect(context), null);
               context.objectMethodProxier.proxyFunction(context, dojo, "dojo", 3, "subscribe", null, this._proxySubscribe(context));
               context.objectMethodProxier.proxyFunction(context, dojo, "dojo", 1, "unsubscribe", this._proxyUnsubscribe(context), null);
               
               // FIXME[BugTicket#91]: Replace this hack fix for a communication mechanism based on events.
               DojoProxies.protectProxy(context, '_connect', 'disconnect', 'subscribe', 'unsubscribe');
           }
           
           // Check if the _connect function was overwritten.
           if (context.connectHooked && (!context.connectREHOOKED) && !DojoProxies.isDojoExtProxy(dojo._connect) && !dojo._connect._listeners) {
               context.connectREHOOKED = true;
               
               context.objectMethodProxier.proxyFunction(context, dojo, "dojo", 5, "_connect", null, this._proxyConnect(context));
                
               // FIXME[BugTicket#91]: Replace this hack fix for a communication mechanism based on events.
               DojoProxies.protectProxy(context, "_connect");
           }
           
           //register a dojo.ready callback
           if(!context.showInitialViewCall && dojo && (dojo.ready || dojo.addOnLoad)) {
               var showInitialViewCall = context.showInitialViewCall = function showInitialView() {
                   var panel = DojoExtension.dojofirebugextensionModel._getDojoPanel(context);                    
                   if (panel) {
                       // Show the initial view.
                       panel.showInitialView(context);
                   }
                   };
               DojoUtils._addMozillaExecutionGrants(showInitialViewCall);               
               //dojo.addOnLoad
               var dojoReadyFn = dojo.ready || dojo.addOnLoad;
               dojoReadyFn.call(dojo, showInitialViewCall);
           }
                               
       }
    },
    
    _proxyConnect : function(context){
        var dojo = DojoAccess._dojo(context);  

        var dojoDebugger = getDojoDebugger(context);
        
        return (function(ret, args) {
                   
                   // FIXME[BugTicket#91]: Defensive code to avoid registering a connection made as part of a hack solution.
                   //TODO check if we can replace this by invocaton to DojoProxies.isDojoExtProxy
                   if (args[3] && args[3].internalClass == 'dojoext-added-code') {
                       return ret; 
                   }
            
                   var obj =  Wrapper.unwrapObject(args[0] || dojo.global);            
                   var event = Wrapper.unwrapObject(args[1]);                   

                   /* The context parameter could be null, in that case it will be determined according to the dojo.hitch implementation.
                    * See the dojo.hitch comment at [dojo directory]/dojo/_base/lang.js and 
                    * dojo.connect comment at [dojo directory]/dojo/_base/connect.js
                    */
                   var handlerContext = args[2];
                   if (!handlerContext) {
                      if (typeof(args[3]) == 'function') {
                           handlerContext = obj;
                      } else {
                           handlerContext = dojo.global;
                      }                   
                   }
                   handlerContext = Wrapper.unwrapObject(handlerContext);
                  
                   var method = Wrapper.unwrapObject(args[3]);
                   var dontFix = Wrapper.unwrapObject((args.length >= 5 && args[4]) ? args[4] : null);

                   var callerInfo = (context.initialConfig.breakPointPlaceSupportEnabled) ? dojoDebugger.getDebugInfoAboutConnectCaller(context) : null;
                           
                   // Verify if the connection should be filtered.
                   if (DojoPrefs._isDojoAnimationsFilterEnabled() && 
                        _filterConnection(obj, event, handlerContext, method)) { 
                       return ret; 
                   }
                   
                   context.connectionsAPI.addConnection(obj, event, handlerContext, method, dontFix, ret, callerInfo);
                   return ret;
                });
   },
   
   
   _proxyDisconnect : function(context){
       var dojo = DojoAccess._dojo(context);
       return (function(handle){
                       context.connectionsAPI.removeConnection(Wrapper.unwrapObject(handle));
                    });
   },

   _proxySubscribe : function(context){
       var dojo = DojoAccess._dojo(context);
       var dojoDebugger = getDojoDebugger(context);
       return (function(ret, args){
                       var callerInfo = (context.initialConfig.breakPointPlaceSupportEnabled) ? dojoDebugger.getDebugInfoAboutSubscribeCaller(context) : null;
                       var method = Wrapper.unwrapObject(args[2] || args[1]);
                       var scope = Wrapper.unwrapObject(args[1] || null);
                       if (!scope) {
                           scope = (typeof(method) == 'string') ? dojo.global : dojo;
                       }
                       
                       var topic = Wrapper.unwrapObject(args[0]);
                       context.connectionsAPI.addSubscription(topic, scope, method, ret, callerInfo);
                       return ret;
                  });
   },
  
   _proxyUnsubscribe : function(context){
       var dojo = DojoAccess._dojo(context);
       return (function(handle){
                       context.connectionsAPI.removeSubscription(Wrapper.unwrapObject(handle));
                  });
   },
   
   // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   // Activation logic
   
   onObserverChange: function(observer) {
       Firebug.ActivableModule.onObserverChange.apply(this, arguments);
       
       if(!this.hasObservers()) {
           this.disableExtension();
       } else {
           this.enableExtension();
       }
   },
   
   isExtensionEnabled: function() {
       return DojoPrefs.isExtensionEnabled();
   },
   
   enableExtension: function() {
       //TODO probably will need to fire event and execute this on UI side
       if(this.extensionLoaded) {
           return;
       }
       
       //FIXME remove this dependency!       
       DojoReps.registerReps();

       //last step
       this.extensionLoaded = true;
   },
   
   disableExtension: function() {
     //TODO probably will need to fire event and execute this on UI side
       if(!this.extensionLoaded) {
           return;
       }

       //FIXME remove this dependency!
       DojoReps.unregisterReps();
       
       //last step
       this.extensionLoaded = false;
   },
   
   // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   // FBTest

   // Expose our test list to the FBTest console for automated testing.
   onGetTestList: function(testLists) {
       testLists.push({
           extension: "dojofirebugextension",
           //testListURL: "chrome://dojofirebugextension/content/fbtest/testlists/testList.html"
           testListURL: "http://dojofirebugextension/chrome/content/fbtest/testlists/testList.html"
           //testListURL: "http://fbug.googlecode.com/svn/extensions/dojofirebugextension/trunk/dojofirebugextension/chrome/content/fbtest/testlists/testList.html"
       });
   }
   
   
});

/***********************************************************************************************************************/

Firebug.registerActivableModule(DojoExtension.dojofirebugextensionModel);

return DojoExtension;


});
