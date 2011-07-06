/* Released under BSD license (see license.txt) */

/**
 * @author preyna@ar.ibm.com
 * @author fergom@ar.ibm.com
 */
define([
        "firebug/lib/object",
        "firebug/lib/trace",
        "firebug/lib/wrapper",
        "dojo/core/dojoaccess",
        "dojo/lib/utils"
       ], function dojoProxiesFactory(Obj, FBTrace, Wrapper, DojoAccess, DojoUtils)
{

    var DojoProxies = {};
    
    /**
     * @abstract
     * @class ObjectMethodProxier Class to easily create and set proxies to objects.
     */
    var ObjectMethodProxier = DojoProxies.ObjectMethodProxier = function() {};
    ObjectMethodProxier.prototype = {
        /**
         * This method create proxy around a function.
         * @param context
         * @param obj the object that own the method to be proxied
         * @param method the name of the method to be proxied
         * @param funcPreInvocation the Function object to be called before the original method invocation
         * @param funcPostInvocation the Function object to be called after the original method invocation
         * @return the proxied function
         */
        getProxiedFunction : function (context, obj, method, funcPreInvocation, funcPostInvocation) {
            var functionToProxy = obj[method]; //web page's function
            var theProxy = function() {
                
                if(FBTrace.DBG_DOJO_DBG) {                    
                    var a = arguments;                    
                    FBTrace.sysout("DOJO DEBUG: executing proxy for fn:" + method + ", args: ", a);
                }
                
                var funcPreInvParams = (funcPreInvocation != null) ? funcPreInvocation.apply(obj, arguments) : null;
                var returnValue = functionToProxy.apply(obj, arguments);
                var postInvocationReturnValue = (funcPostInvocation != null) ? funcPostInvocation.call(obj, returnValue, arguments, funcPreInvParams) : null;
                
                if(FBTrace.DBG_DOJO_DBG) {
                    if(method == "_connect" || method == "connect") {
                        FBTrace.sysout("DOJO the proxy: returnValue[0].wrappedJSObject: " + returnValue[0].wrappedJSObject, returnValue);
                        FBTrace.sysout("DOJO the proxy: postInvocationReturnValue[0].wrappedJSObject: " + postInvocationReturnValue[0].wrappedJSObject, postInvocationReturnValue);
                    }
                }
                
                return postInvocationReturnValue || returnValue;
            };
            theProxy.internalClass = "dojoext-added-code";
            theProxy.proxiedFunction = functionToProxy;
            theProxy.internaldesc = "dojoext-innerproxy";
            return theProxy;
        },
        
        /**
         * @abstract
         * This method replace an object method with a proxy that include the invocation of 
         * the functions passed as parameter.
         * @param context
         * @param obj the object that own the method to be proxied
         * @param objClientName full name in web page of obj
         * @param expectedArgs number of expected args in web page. This is needed to generate web page script that can run in unprivileged context
         * @param functionToProxy the name of the method to be proxied
         * @param funcPreInvocation the Function obj to be called before the original method invocation
         * @param funcPostInvocation the Function obj to be called after the original method invocation
         */
        proxyFunction : function(context, obj, objClientName, expectedArgs, functionToProxy, funcPreInvocation, funcPostInvocation){
            throw("proxyFunction is an abstract method in ObjectMethodProxier");
        }
    };
    
    /**
     * @class ObjectMethodProxierDirectAccessBased
     */
    var ObjectMethodProxierDirectAccessBased = DojoProxies.ObjectMethodProxierDirectAccessBased = function() {};
    ObjectMethodProxierDirectAccessBased.prototype = Obj.extend(ObjectMethodProxier.prototype, 
    {
        /**
         * This method wrap the function passed as parameter and return a new one that handle any exception
         * raised and log the error in the console. 
         * @param func the proxy function
         */
        _protectProxyFromExceptions : function(context, func) {
            //NOTE: the following function is executed by the client web page,
            //and it's executed as privileged code
            var protectedFunction = function() {


                if(FBTrace.DBG_DOJO_DBG) {                    
                    var a = arguments;                    
                    FBTrace.sysout("DOJO DEBUG: executing _protectProxyFromExceptions proxy. Args: ", a);
                }
                                
                try {
                    
                    var res = func.apply(this, arguments);
                    
                    return res;

                } catch (e) {
                    if(FBTrace.DBG_DOJO) {
                        FBTrace.sysout("DOJO ERROR: An error at Dojo Firebug extension have occurred while executing _protectProxyFromExceptions. Exc: ", e);
                    }

                }
            };
            protectedFunction.internalClass = "dojoext-added-code";
            protectedFunction.internaldesc = "dojoext-exceptionProtectProxy";
            return protectedFunction;
        },
        
        /**
         * @override
         */
        proxyFunction : function(context, obj, objClientName, expectedArgs, functionToProxy, funcPreInvocation, funcPostInvocation){
                        
            
            if (!isDojoExtProxy(obj[functionToProxy]) && !obj[functionToProxy]._listeners) {

                var trackerProxy = this.getProxiedFunction(context, obj, functionToProxy, funcPreInvocation, funcPostInvocation);
                
                var excProxy = this._protectProxyFromExceptions(context, trackerProxy);
                DojoUtils._addMozillaExecutionGrants(excProxy);

                obj[functionToProxy] = excProxy; 
                            
            } else {
                
                var msg = "Dojo Firebug Extension: A proxied function is attempted to be reproxied: " + functionToProxy +
                          ". Please report the bug.";
                if(FBTrace.DBG_DOJO) {
                    FBTrace.sysout("DOJO ERROR: " + msg + ". Arguments: ", arguments);
                }

            }
        },
    
        /**
         * Destructor
         */ 
        destroy : function(){
           
        }
    });
    
    
    /**
     * @class ObjectMethodProxierEventBased
     */
    var ObjectMethodProxierEventBased = DojoProxies.ObjectMethodProxierEventBased = function(context) {
        // FB context
        this.context = context;
        
        // Registered events
        this.registeredEvents = {};
        
        /**
         * Verify if an event was registered.
         * @param event the event
         */
        this.isEventAlreadyRegistered = function (event){
            return this.registeredEvents[event];
        };
        
        /**
         * Record listener registering for event.
         * @param event the event
         * @param listener the listener
         */
        this.recordListenerRegistering = function (event, listener){
            this.registeredEvents[event] = listener;
        };
        
        /**
         * Retrieve the list of listeners registered for event.
         */
        this.getListenersList = function (event, listener){
            var reg = [];
            var i;
            for (i in this.registeredEvents) {
                reg.push({event: i, listener: this.registeredEvents[i]});
            }
            return reg;
        };
    };
    
    
    ObjectMethodProxierEventBased.prototype = Obj.extend(ObjectMethodProxierDirectAccessBased.prototype,
    {
        /**
         * This method replace an object method with a proxy that include the invocation of 
         * the functions passed as parameter.
         * @param evtKey the object that own the method to be proxied
         * @param func the method to be proxied
         * @param funcPreInvocation the function to be called before the original method invocation
         */
        eventFireFunctionWrapper : function(evtKey, func){
              var context = this.context;              
              var docPage = Wrapper.unwrapObject(context.window).document;
              if (!this.isEventAlreadyRegistered(evtKey)){
                  var listener = function(e) {  
                        //var args = e.target['args'];
                        // FIXME[issue target property]: the arguments are set to the document. 
                        // This is a patch, the arguments should be setted to the event.target, but
                        // it is not working, if you inspect in FB the e.target you will be able to see 
                        // the property setted, but when you try access it via code it return undefined.
                        // Probably this problem occurs due to security issues.
                          
                          // Get parameters
                                 /*****************************************/
                        var argKey = e.target.getAttribute("argKey");
                        var args = docPage.dojoArguments[argKey];
                        delete docPage.dojoArguments[argKey];
                        /*****************************************/
                        
                        func.apply(this, args);
                  };

                  docPage.addEventListener(evtKey, listener, false, true);
                  this.recordListenerRegistering(evtKey, listener);
               }
               
               return function(){
                   var element = docPage.createElement("DojoExtensionDataElement");  
                   
                   // Configure parameters
                      /*****************************************/
                   element['args'] = arguments;
                      // FIXME: [issue target property] (Hack)
                      var dojoArgs = docPage['dojoArguments'];
                      if (!dojoArgs) {
                          dojoArgs = docPage['dojoArguments'] = {};
                          dojoArgs.counter = 0;
                      }
                      var argKey = "args-" + dojoArgs.counter++;
                      element.setAttribute("argKey", argKey);
                      dojoArgs[argKey] = arguments;
                      /*****************************************/
                   
                   docPage.documentElement.appendChild(element); 
                   
                   var evt = docPage.createEvent("Events");  
                   evt.initEvent(evtKey, true, false);
                   element.dispatchEvent(evt);
                   
                   docPage.documentElement.removeChild(element);
               };
        },
        
       /**
        * @override
        */
       proxyFunction : function(context, obj, objClientName, expectedArgs, functionToProxy, funcPreInvocation, funcPostInvocation){
            var eventKey = "DojoExtensionEventPre" + functionToProxy;
            var newFuncPreInvocation = (funcPreInvocation) ? this.eventFireFunctionWrapper(eventKey, funcPreInvocation) : null;
            
            eventKey = "DojoExtensionEventPos" + functionToProxy;
            var newFuncPostInvocation = (funcPostInvocation) ? this.eventFireFunctionWrapper(eventKey, funcPostInvocation) : null;
            
            ObjectMethodProxierDirectAccessBased.prototype.proxyFunction.call(this, context, obj, objClientName, expectedArgs, functionToProxy, newFuncPreInvocation, newFuncPostInvocation);
       },
        
        /**
         * Destructor
         */ 
        destroy : function(){         
           var docPage = Wrapper.unwrapObject(this.context.window).document;
            var list = this.getListenersList();
            var i;
            for (i = 0; i < list.length; i++){
                docPage.removeEventListener(list[i].event, list[i].listener, false);
                this.registeredEvents[list[i].event] = null;
                delete this.registeredEvents[list[i].event];
            }
            this.registeredEvents = null;
            ObjectMethodProxierDirectAccessBased.prototype.destroy();
        }
    
    });
    
    // FIXME[BugTicket#91]: Replace this hack fix for a communication mechanism based on events.
    /**
     * This function is a hack that wrap the proxies to avoid errors happen when the 
     * property __parent__ are invoked for the functions.
     * @param context
     * @param fnNames remaining args are assumed to be function names
     */
    DojoProxies.protectProxy = function(context){
        var dojo = DojoAccess._dojo(context);

        var f = function(){};
        f.internalClass = 'dojoext-added-code';
        f.internaldesc = 'dojoext-protectProxt__parent__';
        DojoUtils._addMozillaExecutionGrants(f);
        var i;
        for (i = 1; i < arguments.length; i++) {
            dojo.connect(dojo, arguments[i], f);
        }
    };

    var isDojoExtProxy = DojoProxies.isDojoExtProxy = function(fn) {
        return (typeof(fn) == "function") && 
                ((fn.internalClass == "dojoext-added-code") ||
                ((fn.target) && (fn.target.internalClass == "dojoext-added-code")));
    };

    var getDojoProxiedFunctionIfNeeded = DojoProxies.getDojoProxiedFunctionIfNeeded = function(fn) {
        if(!fn || !isDojoExtProxy(fn)) {
            return fn;
        }
        
        //was proxied...get the original fn...
        while(fn && isDojoExtProxy(fn)) {             
            fn = fn.proxiedFunction;             
        }         
        return fn;        
   };    

    
    return DojoProxies; 
});