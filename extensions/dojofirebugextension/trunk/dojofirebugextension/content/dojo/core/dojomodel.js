/* Released under BSD license (see license.txt) */
/*
 * dojofirebugextension 
 * Copyright IBM Corporation 2010, 2010. All Rights Reserved. 
 * U.S. Government Users Restricted Rights -  Use, duplication or disclosure restricted by GSA ADP 
 * Schedule Contract with IBM Corp. 
 */


/**
 * dojo extension model.
 * @author preyna@ar.ibm.com
 * @author fergom@ar.ibm.com
 */

define([
        "firebug/lib/object",
        "firebug/lib/trace",
        "dojo/lib/collections",
        "dojo/lib/filtering",
        "dojo/lib/utils"
       ], function dojoModelFactory(Obj, FBTrace, Collections, DojoFilter, DojoUtils)
{
    
    var DojoModel = {};
        
    // ***************************************************************
    
     /**
     * @class EventListenerSupport
     */
     var EventListenerSupport = function(){};
     EventListenerSupport.prototype = {
         
        // The events
        _eventsListeners: null,
        
        _getEventListeners: function() {
             if(this._eventsListeners == null) {
                 this._eventsListeners = {};
             }
             return this._eventsListeners;                 
         },
        
        addListener: function(/*String*/event, /*Function*/handler){
            var listeners = this._getEventListeners()[event];
            if (!listeners) {
                listeners = this._getEventListeners()[event] = [];
            }
            listeners.push(handler);
        },
        
        removeListener: function(/*String*/event, /*Function*/handler){
            var listeners = this._getEventListeners()[event];
            if (listeners) {
                var handlerIndex = listeners.indexOf(handler);
                if (handlerIndex != -1){
                    listeners.splice(handlerIndex, 1);
                }
            }
        },
        
        removeAllListeners: function(){
            var i;
            for (i in this._getEventListeners()){
                this._getEventListeners()[i].splice(0, this._getEventListeners()[i].length);
            }
        },
        
        fireEvent: function(/*String*/event, /*Arguments*/args){
            var listeners = this._getEventListeners()[event];
            if (listeners) {
                var i;
                for (i = 0; i < listeners.length; i++) {
                    listeners[i].apply(this, args);
                }
            }
        }
         
     };
     
    // ***************************************************************
    /**
     * @class EventsRegistrator
     * This class provide support to add and remove a set of registered listeners.  
     */
     //FIXME rename it
    var EventsRegistrator = DojoModel.EventsRegistrator = function(/*EventListenerSupport*/ object, /*object*/listenersContext){
        // The object where the listeners will be register
        this.object = object;
        
        // Listeners.
        this.listeners = [];
        
        // The execution context for the listeners
        this.listenersContext = listenersContext || {};
        
        // Array to reference the delay handlers.
        this.timeOutFlags = [];
    };
    
    EventsRegistrator.prototype = {
            
        /**
         * This method set a property in the object that is used as execution context of the listeners.
         * @param property property name
         * @param value the value
         */
        setPropertyToListenersContext: function(/*String*/property, /*object*/value){
            this.listenersContext[property] = value;
        },
        
        /**
         * This method register a listener for an event.
         * @param event one or a list of events
         * @param listener the listener
         * @param timeout if the timeOut parameter is defined, the listener execution will be delayed this period of time, 
         * but in case that the same event is fire again before the execution is performed, the execution request is canceled
         * and a new one is created scheduled to be performed after the delay time were accomplished. 
         */
        registerListenerForEvent: function(/*String|Array<String>*/event, /*function*/listener, /*int*/timeOut){
            var events = (typeof(event) == 'string') ? [event] : event;
            var listenerFunc = this._attachListenerContext(listener, timeOut);
            var i;
            for (i = 0; i < events.length; i++) {
                this.listeners.push({event: events[i], listener: listenerFunc});
            }
        },
        
        /**
         * This method add all the registered listeners to the object.
         */
        addAllListeners: function(){
            var list = null;
            var i;
            for (i = 0; i < this.listeners.length; i++){
                list = this.listeners[i];
                this.object.addListener(list.event, list.listener);
            }
        },
        
        /**
         * This method remove all the registered listeners to the object.
         */
        removeAllListeners: function(){
            var list = null;
            var i;
            for (i = 0; i < this.listeners.length; i++){
                list = this.listeners[i];
                this.object.removeListener(list.event, list.listener);
            }
        },
        
        /**
         * This method add all the registered listeners to the object.
         * @param listener the listener
         * @param timeOut delay time execute the listener
         * @return a function that execute the listener with the listenersContext object
         * as executionContext.
         */
        _attachListenerContext: function(listener, timeOut){
            var executionContext = this.listenersContext;
            if (timeOut) {
                return this._wrappWithTimeOutFunction(listener, executionContext, timeOut);
            } else {
                return function(){
                    listener.apply(executionContext, arguments);
                };
            }
        },
        
        /**
         * This method generate and return a new function that execute the func with 
         * the executionContext once the timeOut is accomplished.
         */
        /*function*/ _wrappWithTimeOutFunction: function(func, executionContext, timeOut){
            var flagIndex = this.timeOutFlags.length;
            this.timeOutFlags.push({});
            var flags = this.timeOutFlags;
            return function(){
                clearTimeout(flags[flagIndex]);
                var args = arguments;
                flags[flagIndex] = setTimeout(function(){func.apply(executionContext, args);}, timeOut);
            };
        }
    };
    
    // ***************************************************************    

    /**
      * @class Connection API
      */
     var ConnectionsAPI = DojoModel.ConnectionsAPI = function(/*boolean*/ useHashCodeBasedDictionary){
         // Connections dictionary (keys will be "dojo connection's source objects").
         this._connections = (useHashCodeBasedDictionary) ? new Collections.ComposedDictionary() : new Collections.Dictionary();
         
         // Array of connections.
         this._connectionsArray = [];
         
         // Disconnections dictionary. (keys will be "dojo handles")
         this._disconnections = (useHashCodeBasedDictionary) ? new Collections.ComposedDictionary() : new Collections.Dictionary();
         
         // Subscriptions
         this._subscriptions = new Collections.StringMap();         
     };
     
     ConnectionsAPI.prototype = Obj.extend(EventListenerSupport.prototype, {

         /** Add a connection */
         addConnection: function(
                     /*Object|null*/ obj, 
                    /*String*/ event, 
                    /*Object|null*/ context, 
                    /*String|Function*/ method,
                    /*Boolean*/ dontFix,
                    /*dojo disconnect Handle*/ handle,
                    /*Object*/ callerInfo) {
             
                 if(FBTrace.DBG_DOJO_DBG) {                        
                    FBTrace.sysout("DOJO DEBUG: adding connection " + event, [obj, event, context, method, dontFix, handle, callerInfo]);
                }

                 //FIXME aca me salta un component is not available..(sera por las 5 conns?)
                 //con 5 args, me da este error
                 //con 4 args , me salta error de "lls[i] is null"
                 
                 var originalFunction = null;
                 try {
                    //originalFunction = ((obj[event]) ? obj[event].target : null);
                     originalFunction = ((obj[event]) ? obj[event]['target'] : null);
                 } catch (exc) {
                     //should not be here...
                     if(FBTrace.DBG_DOJO_DBG) {
                         FBTrace.sysout("DOJO DEBUG: error bypassed while adding connection", exc);
                     }
                 }
                 
               // Create the connection.
               var con = new Connection(obj, event, context, method, originalFunction, dontFix, handle[3], callerInfo);
               
               // Add connection to list.
               this._connectionsArray.push(con);
               
               // Register incoming connection
               this._getAndCreateIfRequiredObjectInfo(con.obj).addIncomingConnection(con);
               
               // Register outgoing connection
               this._getAndCreateIfRequiredObjectInfo(con.context).addOutgoingConnection(con);
               
               // Register the disconnect handle returned by dojo.connect.
               this._disconnections.put(handle, con);
               
               // Raised the onConnectionAdded event if there is registered handler.
               this.fireEvent(ConnectionsAPI.ON_CONNECTION_ADDED);
               
               return con;
         },
         
         /**
          * This function return (and create if it does not exist for the key) the objectInfo
          * for the object passed as parameter.          
          */ 
         /*ObjectInfo*/_getAndCreateIfRequiredObjectInfo: function(obj) {
                var objectInfo = this._connections.get(obj);
                if (!objectInfo){
                    objectInfo = new ObjectInfo(obj);
                    this._connections.put(obj, objectInfo);
                }
                return objectInfo;
         },
         
         /**
          * Remove a connection, given a dojo handle
          */
         removeConnection: function(/*Handle*/ handle) {
                var con = this._disconnections.get(handle);
                
                if(con){

                    if(FBTrace.DBG_DOJO_DBG) {                        
                        FBTrace.sysout("DOJO DEBUG: removing connection", [handle, con]);
                    }

                    
                    // Remove connection from list.
                   this._connectionsArray.splice(this._connectionsArray.indexOf(con), 1);
                    
                    // Remove incoming connection
                    var conObjInfo = this._connections.get(con.obj);
                    conObjInfo.removeIncomingConnection(con);
                    if (conObjInfo.isEmpty()) {
                        this._connections.remove(con.obj);
                    }
                    
                    // Remove outgoing connection
                    var conContextInfo = this._connections.get(con.context);
                    conContextInfo.removeOutgoingConnection(con);
                    if (conContextInfo.isEmpty()) {
                        this._connections.remove(con.context);
                    }
                    
                    // Remove from disconnections
                    this._disconnections.remove(handle);
                   
                    // Raised the onConnectionRemoved event if there is registered handler.
                   this.fireEvent(ConnectionsAPI.ON_CONNECTION_REMOVED);
                }
         },
         
         /**
          * Add a subscription
          */
         addSubscription: function(/*String*/ topic, /*Object|null*/ context, /*String|Function*/ method,
                    /*unsubscribe Handle*/ handle, callerInfo) {
             var subs = new Subscription(topic, context, method, callerInfo);
             var subsForTopic = this._subscriptions.get(topic);
             if (!subsForTopic) {
                 subsForTopic = [];
                 this._subscriptions.put(topic, subsForTopic);
             }
             subsForTopic.push(subs);
             
            // Register subscription
            this._getAndCreateIfRequiredObjectInfo(context).addSubscription(subs);
             
            // Register the disconnect handle returned by dojo.connect.
            this._disconnections.put(handle, subs);
            
            // Raised the onSubscriptionAdded event if there is registered handler.
            this.fireEvent(ConnectionsAPI.ON_SUBSCRIPTION_ADDED);
         },
         
         /**
          * Remove a Subscription, given a dojo handle
          */
         removeSubscription: function(/*Handle*/ handle) {
             var subs = this._disconnections.get(handle);
             
             if (handle && (handle.length==2)){
                 // Remove subscription
                 var topic = handle[0];
                 var subsForTopic = this._subscriptions.get(topic);
                 subsForTopic.splice(subsForTopic.indexOf(subs),1);
                 
                 // Remove subscription from ObjectInfo
                  var objContextInfo = this._connections.get(subs.context);
                  objContextInfo.removeSubscription(subs);
                  if (objContextInfo.isEmpty()) {
                      this._connections.remove(subs.context);
                  }
                 
                 // Remove from disconnections
                  this._disconnections.remove(handle);
                  
                  // Raised the onSubscriptionRemoved event if there is registered handler.
                 this.fireEvent(ConnectionsAPI.ON_SUBSCRIPTION_REMOVED);
             }
         },
         
         /**
          * Return an object that contain the connections for the parameter object.
          */
         /*ObjectInfo*/getConnection: function(/*Object: conn's source or context object*/obj) {
             return this._connections.get(obj);
         },
         
         /**
          * Return an object that contain the connections for the parameter object.
          */
         /*Connection*/getConnectionByHandle: function(/*dojo handle*/handle) {
             return this._disconnections.get(handle);
         },
         
         /**
          * Return an array with the objects with connections.
          */
         /*array<Object>*/getObjectsWithConnections: function() {
             return this._connections.getKeys();
         },
         
         /**
          * Return an array with all the registered connections.
          * @param priorityCriteriaArray an array with the index of the connection properties 
          *        sorted by priority to sort a connections array. This parameter could be null.
          * Connection properties indexes:
          * this.ConnectionArraySorter.OBJ = 0;
          * this.ConnectionArraySorter.EVENT = 1;
          * this.ConnectionArraySorter.CONTEXT = 2;
          * this.ConnectionArraySorter.METHOD = 3;
          */
         /*Array<Connection>*/ getConnections: function(/*Object?*/filterArgs, /*Object*/ formatters, /*Array<int>?*/ priorityCriteriaArray) {
             
             var f = filterArgs;
             var theArray = this._connectionsArray; 
                          
             if(f) {
                 //ok..user wants some filtering..
                 
                 /* query rules ("trying" to follow dojo's FileReadStore style):
                          no starting/ending braces allowed...
                          commas are ANDs
                          there are no ORs yet
                          e.g: obj:string, event:string,...
                          
                        obj: string , check by tostring regex match?
                        event: string, event name
                        context: string (check by tostnrg)
                        method: string , check by method name
                        
                    also: if the query is a simple string without a reference to obj, evet, context, method
                    then that query string will be compared against all those 4 properties
                    * you can set queryOptions too (like in dojo) 
                  */
                 if(f.query) {                     
                     theArray = DojoFilter.filter(f, theArray, formatters);
                 }
                 
                 //slice the resulting array if needed
                 var from = f.from || 0;
                 var count = (f.count && f.count <= theArray.length) ? f.count : theArray.length;  
                 if(from != 0 || count != theArray.length) {
                     var end = count;
                     //var end = (count + from <= theArray.length) ? count + from : theArray.length;
                     theArray = theArray.slice(from, end); 
                 }
             }
            
    
            if (priorityCriteriaArray) {
                //FIXME change this by a timestmp!
                var sorter = new ConnectionArraySorter(this.getObjectsWithConnections(), priorityCriteriaArray);
                 var cons = sorter.sortConnectionArray(theArray);
                 return cons;
             
             } else {
                 return theArray;
             }
         },
         
         /**
          * Return the subscriptions map.
          */
         /*StringMap*/ getSubscriptions: function() {
             return this._subscriptions;
         },
         
         /**
          * Return an array with all the registered subscriptions.
          * @return the list of existent subscriptions.
          */
         /*Array<Subscriptions>*/ getSubscriptionsList: function() {
             
             //xxxPERFORMANCE
             
             var subs = [];
             var subKeys = this.getSubscriptions().getKeys();
             var i;
             for (i = 0; i < subKeys.length; i++) {
                 subs = subs.concat(this.getSubscriptions().get(subKeys[i]));
             }
             return subs;
         },
         
         /**
          * Returns is a disconnect handle is still being tracked 
          * @param handle The dojo disconnect handle returned by dojo.connect
          */
         /*Boolean*/ isHandleBeingTracked: function(/*DojoDisconnectHandler*/handle) {
             //FIXME this method is only used from tests? is it needed at all ?
             return (this._disconnections.get(handle) == null);
         },
         
         /**
          * Return the topics list.
          */
         /*Array<String>*/ getTopics: function() {
             return this.getSubscriptions().getKeys();
         },
         
         /**
          * Return the subscriptions list for the topic passed as parameter.
          * @param topic The topic.
          */
         /*Array<Subscription>*/ subscriptionsForTopic: function(/*String*/topic) {
             return this.getSubscriptions().get(topic);
         },
         
         /*Subscription*/getSubscriptionByHandle: function(/*dojo handle*/ handle) {
             return this._disconnections.get(handle);
         },
         
         /**
          * Return true if there are any connection info registered for the object passed as parameter.
          * @param object The object.
          */
         /*boolean*/ areThereAnyConnectionsFor: function(/*object*/object) {
             var objInfo = this.getConnection(object);
             return objInfo &&
                     !objInfo.getConnectionsTracker().isEmpty();
         },
         
         /**
          * Return true if there are any subscription info registered for the object passed as parameter.
          * @param object The object.
          */
         /*boolean*/ areThereAnySubscriptionFor: function(/*object*/object) {
             var objInfo = this.getConnection(object);
             return objInfo &&
                     !objInfo.getSubscriptionsTracker().isEmpty();
         },
         
         /**
          * Destructor
          */
         destroy: function() {
             this._connections.destroy();
             delete this._connections;
             var i;
             for(i=0; i<this._connectionsArray.length ;i++){
                 this._connectionsArray[i].destroy();
             }
             this._connectionsArray.splice(0, this._connectionsArray.length);
             delete this._connectionsArray;
             
             this._disconnections.destroy();
             delete this._disconnections;
             
             this.removeAllListeners();
             
             delete this._subscriptions;
         }         
     }); //end of ConnectionsAPI
     
     
     // Public Events supported by ConnectionsAPI.
     ConnectionsAPI.ON_CONNECTION_ADDED = 'connection_added';
     ConnectionsAPI.ON_CONNECTION_REMOVED = 'connection_removed';
     ConnectionsAPI.ON_SUBSCRIPTION_ADDED = 'subscription_added';
     ConnectionsAPI.ON_SUBSCRIPTION_REMOVED = 'subscription_removed';
     
     
     // ***************************************************************     
     
     /**
      * @class Object Info
      */
     var ObjectInfo = function(object){
        // ConnectionsTracker 
        this._connectionsTracker = new ConnectionsTracker(object);
        
        // SubscriptionsTracker
        this._subscriptionsTracker = new SubscriptionsTracker(object);        
     };
     ObjectInfo.prototype = {

             // ***** Connection methods ******//
        
        /**
         * ConnectionsTracker getter
         */
        getConnectionsTracker: function(){
            return this._connectionsTracker;
        },
    
        /**
         * SubscriptionsTracker getter
         */
        getSubscriptionsTracker: function(){
            return this._subscriptionsTracker;
        },
        
        // Add new incoming connection.
        addIncomingConnection: function(con){
            this.getConnectionsTracker().addIncomingConnection(con);
        },
        
        // Add new outgoing connection.
        addOutgoingConnection:  function(con){
            this.getConnectionsTracker().addOutgoingConnection(con);
        },
        
        // Remove incoming connection.
        removeIncomingConnection: function(con){
            this.getConnectionsTracker().removeIncomingConnection(con);
        },
        
        // Remove outgoing connection.
        removeOutgoingConnection: function(con){
            this.getConnectionsTracker().removeOutgoingConnection(con);
        },
        
        // Return the events with connections associated.
        getIncommingConnectionsEvents: function(){
            return this.getConnectionsTracker().getIncommingConnectionsEvents();
        },
        
        // Return the connections associated to the event passed as parameter.
        /*array*/getIncommingConnectionsForEvent: function(event){
            return this.getConnectionsTracker().getIncommingConnectionsForEvent(event);
        },
        
        // Return the methods with connections associated.
        /*array*/getOutgoingConnectionsMethods: function(){
            return this.getConnectionsTracker().getOutgoingConnectionsMethods();
        },
        
        // Return the connections associated to the method passed as parameter.
        /*array*/getOutgoingConnectionsForMethod: function(method){
            return this.getConnectionsTracker().getOutgoingConnectionsForMethod(method);
        },
        
        
        // ***** Subscription methods ******//
        
        // Add new subscription.
        addSubscription: function(sub){
            this.getSubscriptionsTracker().addSubscription(sub);
        },
        
        // Remove subscription.
        removeSubscription: function(sub){
            this.getSubscriptionsTracker().removeSubscription(sub);
        },
        
        // Return the subscriptions for the object associated with this.object.
        getSubscriptions: function(){
            return this.getSubscriptionsTracker().getSubscriptions();
        },
            
        /**
          * Return true if there are no info registered.
          */
        /*boolean*/ isEmpty: function(){
            return (this.getConnectionsTracker().isEmpty() && this.getSubscriptionsTracker().isEmpty());
         }
     };
     
     // ***************************************************************
     
     /**
      * @class Connections Tracker
      */
     var ConnectionsTracker = DojoModel.ConnectionsTracker = function(object){
        // Object
        this.object = object;
         
        // Incoming connections (map<String, IncomingConnectionsForEvent>).
        this._incomingConnections = new Collections.StringMap();
        this._incomingConnectionsCount = 0;
        
        // Outgoing connections (Dictionary<(String|Function),Connection>).
        this._outgoingConnections = new Collections.ComposedDictionary(); //must be Dictionary
        this._outgoingConnectionsCount = 0;
     };
     ConnectionsTracker.prototype = 
     {

            // Add new incoming connection.
            addIncomingConnection: function(con){
                var incConnections = this._incomingConnections.get(con.event);
                if (!incConnections){
                    incConnections = [];
                    this._incomingConnections.put(con.event, incConnections);
                }
                incConnections.push(con);
                this._incomingConnectionsCount++;
            },
            
            // Add new outgoing connection.
            addOutgoingConnection: function(con){
                var outConnections = this._outgoingConnections.get(con.method);
                if (!outConnections){
                    outConnections = [];
                    this._outgoingConnections.put(con.method, outConnections);
                }
                outConnections.push(con);
                this._outgoingConnectionsCount++;
            },
            
            // Remove incoming connection.
            removeIncomingConnection: function(con){
                var cons = this._incomingConnections.get(con.event);
                cons.splice(cons.indexOf(con),1); //xxxPERFORMANCE
                // Remove event if it has no associated connections.
                if (cons.length == 0) {
                    this._incomingConnections.remove(con.event);
                }
                this._incomingConnectionsCount--;
            },
            
            // Remove outgoing connection.
            removeOutgoingConnection: function(con){
                var cons = this._outgoingConnections.get(con.method);
                cons.splice(cons.indexOf(con),1); //xxxPERFORMANCE
                // Remove method if it has no associated connections.
                if (cons.length == 0) {
                    this._outgoingConnections.remove(con.method);
                }
                this._outgoingConnectionsCount--;
            },
            
            /**
             * Return the events with connections associated.
             * @return an array with the events with connections associated.
             */
            /*array*/getIncommingConnectionsEvents: function(){
                return this._incomingConnections.getKeys();
            },
            
            /**
             * Return the connections associated to the event passed as parameter.
             * @param event the event
             * @return an array with the connections associated to the event passed as parameter.
             */
            /*array*/getIncommingConnectionsForEvent: function(event){
                var cons = this._incomingConnections.get(event);
                return cons || [];
            },
            
            /**
             * Return the methods with connections associated.
             * @return an array with the methods with connections associated.
             */
            /*array*/getOutgoingConnectionsMethods: function(){
                return this._outgoingConnections.getKeys();
            },
            
            /**
             * Return the connections associated to the method passed as parameter.
             * @param method the method
             * @return an array with the connections associated to the method passed as parameter.
             */
            /*array*/getOutgoingConnectionsForMethod: function(method){
                var cons = this._outgoingConnections.get(method);
                return cons || [];
            },
            
            /**
             * Return true if there are no registered connections.
             */
            /*boolean*/ isEmpty: function(){
             return (this.getIncommingConnectionsEvents().length == 0) &&
                     (this.getOutgoingConnectionsMethods().length == 0);
            },
            
            /*int*/getTotalCountOfIncommingConnections: function() {
                return this._incomingConnectionsCount;
            },

            /*int*/getTotalCountOfOutgoingConnections: function() {
                return this._outgoingConnectionsCount;
            }

     };
     
     
     // ***************************************************************
     
     /**
      * @class Subscriptions Tracker
      */
     var SubscriptionsTracker = DojoModel.SubscriptionsTracker = function(object){
         // Object
        this.object = object;
         
        // Subscriptions (Array<Connection>).
        this._subscriptions = [];        
     };
     SubscriptionsTracker.prototype = 
     {

        // Add new subscription.
        addSubscription: function(sub){
            this._subscriptions.push(sub);
        },
        
        // Remove subscription.
        removeSubscription: function(sub){
            //xxxPERFORMANCE
            this._subscriptions.splice(this._subscriptions.indexOf(sub),1);
        },
        
        /**
         * Return the subscriptions for the object associated with this.object.
         * @return an array with the subscriptions for the object associated with this.object.
         */
        /*array*/getSubscriptions: function(){
            return this._subscriptions;
        },
        
        /**
         * Return true if there are no registered subscriptions.
         */
        /*boolean*/ isEmpty: function(){
         return (this.getSubscriptions().length == 0);
        },

        /*int*/getTotalCountOfSubscriptions: function() {
            return this._subscriptions.length;
        }
     };
     
     
     // ***************************************************************
     
     
     /**
      * @class FunctionLinkResolver
      */
     var FunctionLinkResolver = DojoModel.FunctionLinkResolver = function(){};
     FunctionLinkResolver.prototype = 
     {
             /**
              * returns the listener fn object.
              */
             getListenerFunction : function() {
                 var fn = null;
                 if (typeof(this.method) == "function") {
                    fn = this.method;
                 } else if (this.context) {
                    fn = this.context[this.method];
                 }
                 
                 return this._getOriginalFunctionIfNeeded(fn);
             },

             _getOriginalFunctionIfNeeded : function(fn) {
                 return DojoUtils.getDojoProxiedFunctionIfNeeded(fn); 
             }    
     };
     
     // ***************************************************************
     
     /**
      * @class Connection
      */
     var Connection = DojoModel.Connection = function(obj, /*string*/event, context, method, originalFunction, dontFix, listenerMechanism, callerInfo){
         this.clazz = "Connection";  
         this.obj = obj;
         this.event = event;
         this.context = context;
         this.method = method;
         this.originalFunction = originalFunction;
         this.dontFix = dontFix;
         this.listenerMechanism = listenerMechanism;
         this.callerInfo = callerInfo;                
     };
     Connection.prototype = Obj.extend(FunctionLinkResolver.prototype, {

         /**
          * Destructor
          */
         destroy: function(){
             this.clazz = null;
             this.obj = null;
             this.event = null;
             this.context = null;
             this.method = null;
             this.originalFunction = null;
             this.dontFix = null;
             this.listenerMechanism = null;
             this.callerInfo = null;
         },
         
         getEventFunction: function() {
            return DojoUtils.getDojoProxiedFunctionIfNeeded(this.originalFunction);
         }         
     });
     
     // ***************************************************************
     
     /**
      * @class Subscription
      */
     var Subscription = DojoModel.Subscription = function(topic, context, method, callerInfo){
        this.clazz = "Subscription";
        this.topic = topic;
        this.context = context;
        this.method = method;
        this.callerInfo = callerInfo;
     };
     Subscription.prototype = Obj.extend(FunctionLinkResolver.prototype, {});
        
     
     // ***************************************************************
     
     /**
      * @class ConnectionArraySorter
      */
    //TODO: Add comment!
    var ConnectionArraySorter = DojoModel.ConnectionArraySorter = function (objectOrderArray, priorityCriteriaArray) {

        this.priorityCriteriaArray = priorityCriteriaArray;
        
        var criteriaObject = function(obj1, obj2){
            if (obj1 == obj2) {
                return 0;
            } else {
                return (objectOrderArray.indexOf(obj1) < objectOrderArray.indexOf(obj2)) ? -1 : 1;
            }
        };
        
        var criteriaTarget = function(a,b){
            return criteriaObject(a.obj, b.obj);
        };
        
        var criteriaEvent = function(a,b){
            if (a.event < b.event) {
                return -1;
            } else if (a.event > b.event) {
                return 1;
            } else {
                return 0;
            }
        };
        
        var criteriaViewer = function(a,b){
            return criteriaObject(a.context, b.context);
        };
        
        var criteriaMethod = function(a,b){
            var typeA = typeof(a.method);
            var typeB = typeof(b.method);
            if (typeA == typeB) {
                var valueA = (typeA == 'function') ? a.method.toString() : a.method;
                var valueB = (typeB == 'function') ? b.method.toString() : b.method;
                if (valueA < valueB) {
                    return -1;
                } else if (valueA > valueB) {
                    return 1;
                } else {
                    return 0;
                }
            } else {
                return (typeA == 'function') ? 1 : -1;
            }
        };
        
        this.criterias = [criteriaTarget, criteriaEvent, criteriaViewer, criteriaMethod];
        
        this.getPriorityCriteriaOrder = function(){
            var criteriaOrder = [];
            var i;
            for (i=0; i<this.priorityCriteriaArray.length; i++) {
                criteriaOrder[i] = this.criterias[this.priorityCriteriaArray[i]];
            }
            return criteriaOrder;
        };
        
        this.getSortFunctionForCriteriaArray = function(criterias){
            return function(a,b){
                var ret = 0;
                var i;
                for(i=0; i<criterias.length && ret==0; i++){
                    ret = criterias[i].call(null,a,b);
                }
                return ret;
            };
        };
        
        this.sortConnectionArray = function (connectionArray) {
            connectionArray.sort(this.getSortFunctionForCriteriaArray(this.getPriorityCriteriaOrder()));
            return connectionArray;
        };
    };
    
    
    DojoModel.ConnectionArraySorter.OBJ = 0;
    DojoModel.ConnectionArraySorter.EVENT = 1;
    DojoModel.ConnectionArraySorter.CONTEXT = 2;
    DojoModel.ConnectionArraySorter.METHOD = 3;

    // ***************************************************************

    // ***************************************************************
    // exported classes
    // ***************************************************************    

    DojoModel.EventsRegistrator = EventsRegistrator;
    
    DojoModel.ConnectionsAPI = ConnectionsAPI; 
    DojoModel.ConnectionsTracker = ConnectionsTracker;
    DojoModel.SubscriptionsTracker = SubscriptionsTracker;
    
    DojoModel.FunctionLinkResolver = FunctionLinkResolver;
    DojoModel.Connection = Connection;
    DojoModel.Subscription = Subscription;
    DojoModel.ConnectionArraySorter = ConnectionArraySorter;

    return DojoModel;
});