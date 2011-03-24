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
var DojoModel = FBL.ns(function() { with (FBL) {

	 //FIXME I dont know if this method belongs here...
	 var isDojoExtProxy = this.isDojoExtProxy = function(fn) {
	 	return (typeof(fn) == "function") && 
				 	((fn.internalClass == "dojoext-added-code") ||
				 	((fn.target) && (fn.target.internalClass == "dojoext-added-code")));
	 };

 /* ****************************************************************************
  * ****************************************************************************
  * ****************************************************************************
  */	

	
	/**
	 * @class Entry
	 */
	var Entry = function(key, value){
		this.key = key; 
		this.value = value; 
	};

	/**
	 * @class Map 
	 */
	var Map = function(){};
	Map.prototype = {
		entrySet: function(){
			var entries = [];
			for (var i=0; i<this.getKeys().length; i++){
				var key = this.getKeys()[i];
				entries.push(new Entry(key, this.get(key)));
			}
			return entries;
		}
	};

	
	// ***************************************************************
	/**
	 * @class ArrayMap 
	 */
	 var ArrayMap = function() {		 

		 this._map = new Array();
		 
		 
	 };
	 ArrayMap.prototype = extend(Map.prototype, 
	 {
		// Associates the specified value with the specified key in this map
		put: function (key, value){
		 	if (typeof(key) != 'undefined') {
		 		this._map[key] = value;
		 	}
			return this;
		},
	
		// Returns the value to which this map maps the specified key
		get: function (key){
			var res = null; 
			if (typeof(key) != 'undefined') {
				res = this._map[key]; 
			}
			return res; 
		},
	
		// Removes the mapping for this key from this map if it is present
		remove: function (key) {
			if (typeof(key) != 'undefined') {
				this._map[key] = undefined;
			}			
		},
		
		// Keys getter.
		getKeys: function(){
			var keys = [];
			for (var i in this._map){
				if (this._map[i]) {
					keys.push(i);
				}
			}
			return keys;
		},
		
		// Values getter.
		getValues: function(){
			var values = [];
			for (var i in this._map){
				if (this._map[i]) {
					values.push(this._map[i]);
				}
			}
			return values;
		},
		
		// Destructor
		destroy: function(){
			this._map.splice(0, this._map.length);
			this._map = null;
			delete this._map;
		}		 
	 });
	 
	 
	// ***************************************************************
	
	/**
	 * @class Dictionary 
	 * @deprecated
	 */
	 var Dictionary = function() {		 
		// The keys.
		this._keys = [];

		// The values
		this._values = [];
	 };
	 Dictionary.prototype = extend(Map.prototype, 
	 {
		// Associates the specified value with the specified key in this map
		put: function (key, value){
			var index = this._keys.indexOf(key);
			if (index == -1){
				index = (this._keys.push(key) - 1);
			}
			this._values[index] = value;
			return this;
		},
	
		// Returns the value to which this map maps the specified key
		get: function (key){
			var index = this._keys.indexOf(key);
			return (index != -1) ? this._values[index] : null;
		},
	
		// Removes the mapping for this key from this map if it is present
		remove: function (key){
			var index = this._keys.indexOf(key);
			if (index != -1){
				this._keys.splice(index, 1);
				this._values.splice(index, 1);
			}
		},
		
		// Keys getter.
		getKeys: function(){
			return this._keys;
		},
		
		// Values getter.
		getValues: function(){
			return this._values;
		},
		
		// Destructor
		destroy: function(){
			this._keys.splice(0, this._keys.length);
			this._keys = null;
			this._values.splice(0, this._values.length);
			this._values = null;
		}		 
	 });
	 	
	// ***************************************************************
	 
	/**
	 * @class HashCodeBasedDictionary
	 */
	 var HashCodeBasedDictionary = function() {
		// Key id property name
		this.keyIdPropertyName = '_dojoExtHashCode';
		 
		// Next keys.
		this._nextKey = 1;
		
		// Deprecated keys. Those keys that were released.
		this._deprecatedKeys = [];

		// The keys
		this._keys = [];
		
		// The values
		this._values = [];
	 };
	 HashCodeBasedDictionary.prototype = extend(Map.prototype,{
			// Associates the specified value with the specified key in this map
			put: function (key, value){
				var realKey = key[this.keyIdPropertyName];
				if (!realKey) {
					realKey = key[this.keyIdPropertyName] =
						(this._deprecatedKeys.length > 0) ? this._deprecatedKeys.pop() : this._nextKey++;
				}
				this._keys[realKey] = key;
				this._values[realKey] = value;
				return this;
			},

			// Returns the value to which this map maps the specified key
			get: function (key){
				var realKey = (key) ? key[this.keyIdPropertyName] : null;
				return (realKey) ? this._values[realKey] : null;
			},

			// Removes the mapping for this key from this map if it is present
			remove: function (key){
				var realKey = key[this.keyIdPropertyName];
				if (realKey) {
					this._keys[realKey] = null;
					this._values[realKey] = null;
					this._deprecatedKeys.push(realKey);
				}
				delete key[this.keyIdPropertyName];
			},
			
			// Keys getter.
			getKeys: function(){
				var keys = [];
				for (var i = 0; i < this._keys.length; i++) {
					if (this._keys[i]) keys.push(this._keys[i]);
				}
				return keys;
			},
			
			// Values getter.
			getValues: function(){
				var values = [];
				for (var i = 0; i < this._values.length; i++) {
					if (this._values[i]) values.push(this._values[i]);
				}
				return values;
			},
			
			// Destructor
			destroy: function(){
				this._keys.splice(0, this._keys.length);
				this._values.splice(0, this._values.length);
				this._values = null;
			}		 
	 });
	 
	// ***************************************************************
	 
	 /**
	  * @class StringMap 
	  */
	 var StringMap = function() {
		// The map.
		this._map = {};
	 };
	 StringMap.prototype = extend(Map.prototype, 
		{
			// Associates the specified value with the specified key in this map
		 	put: function (key, value) {
				this._map[key] = value;
				return this;
			},

			// Returns the value to which this map maps the specified key
			get: function (key){
				return this._map[key];
			},

			// Removes the mapping for this key from this map if it is present
			remove: function (key){
				this._map[key] = null;
				delete this._map[key];
			},
			
			// Keys getter.
			getKeys: function(){
				var keys = [];
				for (var i in this._map){
					if (this._map[i]) {
						keys.push(i);
					}
				}
				return keys;
			},
			
			// Values getter.
			getValues: function(){
				var values = [];
				for (var i in this._map){
					if (this._map[i]) {
						values.push(this._map[i]);
					}
				}
				return values;
			},
			
			// Destructor
			destroy: function(){
				this._map = null;
			} 
	 });

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
			for (var i in this._getEventListeners()){
				this._getEventListeners()[i].splice(0, this._getEventListeners()[i].length);
			}
		},
		
		fireEvent: function(/*String*/event, /*Arguments*/args){
			var listeners = this._getEventListeners()[event];
			if (listeners) {
				for (var i = 0; i < listeners.length; i++) {
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
	var EventsRegistrator = this.EventsRegistrator = function(/*EventListenerSupport*/ object, /*object*/listenersContext){
		// The object where the listeners will be register
		this.object = object;
		
		// Listeners.
		this.listeners = [];
		
		// The execution context for the listeners
		this.listenersContext = (listenersContext) ? listenersContext : {};
		
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
			for (var i = 0; i < events.length; i++) {
				this.listeners.push({event: events[i], listener: listenerFunc});
			}
		},
		
		/**
		 * This method add all the registered listeners to the object.
		 */
		addAllListeners: function(){
			var list = null;
			for (var i = 0; i < this.listeners.length; i++){
				list = this.listeners[i];
				this.object.addListener(list.event, list.listener);
			}
		},
		
		/**
		 * This method remove all the registered listeners to the object.
		 */
		removeAllListeners: function(){
			var list = null;
			for (var i = 0; i < this.listeners.length; i++){
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
	 /**
	  * @class Connection API
	  */
	 var ConnectionsAPI = this.ConnectionsAPI = function(/*boolean*/ useHashCodeBasedDictionary){
		 // Connections dictionary.
		 this._connections = (useHashCodeBasedDictionary) ? new HashCodeBasedDictionary() : new ArrayMap(); //new Dictionary();
		 
		 // Array of connections.
		 this._connectionsArray = [];
		 
		 // Disconnections dictionary.
		 this._disconnections = (useHashCodeBasedDictionary) ? new HashCodeBasedDictionary() : new ArrayMap(); //new Dictionary();
		 
		 // Subscriptions
		 this._subscriptions = new StringMap();		 
	 };
	 
	 ConnectionsAPI.prototype = extend(EventListenerSupport.prototype, {

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
					//var originalFunction = ((obj[event]) ? obj[event].target : null);
			 		var originalFunction = ((obj[event]) ? obj[event]['target'] : null);
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
		 _getAndCreateIfRequiredObjectInfo: function(obj){
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
		 removeConnection: function(/*Handle*/ handle){
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
					/*unsubscribe Handle*/ handle, callerInfo){
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
		 removeSubscription: function(/*Handle*/ handle){
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
		 getConnection: function(obj){
			 return this._connections.get(obj);
		 },
		 
		 /**
		  * Return an array with the objects with connections.
		  */
		 getObjectsWithConnections: function() {
			 return this._connections.getKeys();
		 },
		 
		 /**
		  * Return an array with all the registered connections.
		  * @param priorityCriteriaArray an array with the index of the connection properties 
		  * 	   sorted by priority to sort a connections array. This parameter could be null.
		  * Connection properties indexes:
		  * this.ConnectionArraySorter.OBJ = 0;
		  * this.ConnectionArraySorter.EVENT = 1;
		  * this.ConnectionArraySorter.CONTEXT = 2;
		  * this.ConnectionArraySorter.METHOD = 3;
		  */
		 /*Array<Connection>*/ getConnections: function(/*null|Array<int>*/ priorityCriteriaArray){
			 if (priorityCriteriaArray) {
				 var sorter = new ConnectionArraySorter(this.getObjectsWithConnections(), priorityCriteriaArray);
				 var cons = sorter.sortConnectionArray(this._connectionsArray);
				 return cons;
			 } else {
				 return this._connectionsArray;
			 }
		 },
		 
		 /**
		  * Return the subscriptions map.
		  */
		 /*Object(Map)*/ getSubscriptions: function(){
			 return this._subscriptions;
		 },
		 
		 /**
		  * Return an array with all the registered subscriptions.
		  * @return the list of existent subscriptions.
		  */
		 /*Array<Subscriptions>*/ getSubscriptionsList: function(){
			 
			 //xxxPERFORMANCE
			 
			 var subs = [];
			 var subKeys = this.getSubscriptions().getKeys();
			 for (var i = 0; i < subKeys.length; i++) {
				 subs = subs.concat(this.getSubscriptions().get(subKeys[i]));
			 }
			 return subs;
		 },
		 
		 /**
		  * Returns is a disconnect handle is still being tracked 
		  * @param handle The dojo disconnect handle returned by dojo.connect
		  */
		 /*Boolean*/ isHandleBeingTracked: function(/*DojoDisconnectHandler*/handle){
			 //FIXME this method is only used from tests? is it needed at all ?
			 return (this._disconnections.get(handle) == null);
		 },
		 
		 /**
		  * Return the topics list.
		  */
		 /*Array<String>*/ getTopics: function(){
			 return this.getSubscriptions().getKeys();
		 },
		 
		 /**
		  * Return the subscriptions list for the topic passed as parameter.
		  * @param topic The topic.
		  */
		 /*Array<Subscription>*/ subscriptionsForTopic: function(/*String*/topic){
			 return this.getSubscriptions().get(topic);
		 },
		 
		 /**
		  * Return true if there are any connection info registered for the object passed as parameter.
		  * @param object The object.
		  */
		 /*boolean*/ areThereAnyConnectionsFor: function(/*object*/object){
			 var objInfo = this.getConnection(object);
			 return objInfo &&
				 	!objInfo.getConnectionsTracker().isEmpty();
		 },
		 
		 /**
		  * Return true if there are any subscription info registered for the object passed as parameter.
		  * @param object The object.
		  */
		 /*boolean*/ areThereAnySubscriptionFor: function(/*object*/object){
			 var objInfo = this.getConnection(object);
			 return objInfo &&
				 	!objInfo.getSubscriptionsTracker().isEmpty();
		 },
		 
		 /**
		  * Destructor
		  */
		 destroy: function(){
			 this._connections.destroy();
			 delete this._connections;
			 
			 for(var i=0; i<this._connectionsArray.length ;i++){
				 this._connectionsArray[i].destroy();
			 }
			 this._connectionsArray.splice(0, this._connectionsArray.length);
			 delete this._connectionsArray;
			 
			 this._disconnections.destroy();
			 delete this._disconnections;
			 
			 this.removeAllListeners();
			 
			 delete this._subscriptions;
		 }		 
	 });
	 
	 
	 // Public Events supported by ConnectionsAPI.
	 ConnectionsAPI.ON_CONNECTION_ADDED = 'connection_added';
	 ConnectionsAPI.ON_CONNECTION_REMOVED = 'connection_removed';
	 ConnectionsAPI.ON_SUBSCRIPTION_ADDED = 'subscription_added';
	 ConnectionsAPI.ON_SUBSCRIPTION_REMOVED = 'subscription_removed';
	 
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
		getIncommingConnectionsForEvent: function(event){
			return this.getConnectionsTracker().getIncommingConnectionsForEvent(event);
		},
		
		// Return the methods with connections associated.
		getOutgoingConnectionsMethods: function(){
			return this.getConnectionsTracker().getOutgoingConnectionsMethods();
		},
		
		// Return the connections associated to the method passed as parameter.
		getOutgoingConnectionsForMethod: function(method){
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
	 
	 
	 /**
	  * @class Connections Tracker
	  */
	 var ConnectionsTracker = this.ConnectionsTracker = function(object){
		// Object
		this.object = object;
		 
		// Incoming connections (map<String, IncomingConnectionsForEvent>).
		this._incomingConnections = new StringMap();
		
		// Outgoing connections (Dictionary<(String|Function),Connection>).
		this._outgoingConnections = new ArrayMap(); //new Dictionary();		
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
			},
			
			// Add new outgoing connection.
			addOutgoingConnection: function(con){
				var outConnections = this._outgoingConnections.get(con.method);
				if (!outConnections){
					outConnections = [];
					this._outgoingConnections.put(con.method, outConnections);
				}
				outConnections.push(con);
			},
			
			// Remove incoming connection.
			removeIncomingConnection: function(con){
				var cons = this._incomingConnections.get(con.event);
				cons.splice(cons.indexOf(con),1);
				// Remove event if it has no associated connections.
				if (cons.length == 0) {
					this._incomingConnections.remove(con.event);
				}
			},
			
			// Remove outgoing connection.
			removeOutgoingConnection: function(con){
				var cons = this._outgoingConnections.get(con.method);
				cons.splice(cons.indexOf(con),1);
				// Remove method if it has no associated connections.
				if (cons.length == 0) {
					this._outgoingConnections.remove(con.method);
				}
			},
			
			/**
			 * Return the events with connections associated.
			 * @return an array with the events with connections associated.
			 */
			getIncommingConnectionsEvents: function(){
				return this._incomingConnections.getKeys();
			},
			
			/**
			 * Return the connections associated to the event passed as parameter.
			 * @param event the event
			 * @return an array with the connections associated to the event passed as parameter.
			 */
			getIncommingConnectionsForEvent: function(event){
				var cons = this._incomingConnections.get(event);
				return (cons) ? cons : [];
			},
			
			/**
			 * Return the methods with connections associated.
			 * @return an array with the methods with connections associated.
			 */
			getOutgoingConnectionsMethods: function(){
				return this._outgoingConnections.getKeys();
			},
			
			/**
			 * Return the connections associated to the method passed as parameter.
			 * @param method the method
			 * @return an array with the connections associated to the method passed as parameter.
			 */
			getOutgoingConnectionsForMethod: function(method){
				var cons = this._outgoingConnections.get(method);
				return (cons) ? cons : [];
			},
			
			/**
			 * Return true if there are no registered connections.
			 */
			/*boolean*/ isEmpty: function(){
			 return (this.getIncommingConnectionsEvents().length == 0) &&
			 		(this.getOutgoingConnectionsMethods().length == 0);
			}
	 };
	 
	 
	 /**
	  * @class Subscriptions Tracker
	  */
	 var SubscriptionsTracker = this.SubscriptionsTracker = function(object){
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
			this._subscriptions.splice(this._subscriptions.indexOf(sub),1);
		},
		
		/**
		 * Return the subscriptions for the object associated with this.object.
		 * @return an array with the subscriptions for the object associated with this.object.
		 */
		getSubscriptions: function(){
			return this._subscriptions;
		},
		
		/**
		 * Return true if there are no registered subscriptions.
		 */
		/*boolean*/ isEmpty: function(){
		 return (this.getSubscriptions().length == 0);
		}			 
	 };
	 
	 /**
	  * @class FunctionLinkResolver
	  */
	 var FunctionLinkResolver = this.FunctionLinkResolver = function(){};
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
			 	// TODO: fn should not be undefined, but it happens. Alert this situation.
				return (fn && isDojoExtProxy(fn)) ? fn.proxiedFunction : fn;
			 }	
	 };
	 
	 /**
	  * @class Connection
	  */
	 var Connection = this.Connection = function(obj, /*string*/event, context, method, originalFunction, dontFix, listenerMechanism, callerInfo){
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
	 Connection.prototype = extend(FunctionLinkResolver.prototype, {

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
		 	return (isDojoExtProxy(this.originalFunction)) ? this.originalFunction.proxiedFunction : this.originalFunction;
		 }		 
	 });
	 
	 
	 /**
	  * @class Subscription
	  */
	 var Subscription = function(topic, context, method, callerInfo){
		this.clazz = "Subscription";
		this.topic = topic;
		this.context = context;
		this.method = method;
		this.callerInfo = callerInfo;
	 };
	 Subscription.prototype = extend(FunctionLinkResolver.prototype, {});
	
	 /**
	  * @class IncomingConnectionDescriptor
	  */
	 var IncomingConnectionDescriptor = this.IncomingConnectionDescriptor = function(obj, event, connections){
		 this.obj = obj;
		 this.event = event;
		 this.connections = connections;
	 };
	 //TODO chech whether we should be better extending from FunctionLinkResolver?  
	 IncomingConnectionDescriptor.prototype =
	 {
		 getEventFunction: function(){
				return (this.connections.length > 0) ? this.connections[0].getEventFunction() : null;
		 }			 
	 };
	 
	 /**
	  * @class OutgoingConnectionDescriptor
	  */
	 var OutgoingConnectionDescriptor = this.OutgoingConnectionDescriptor = function(context, method, connections){
		 this.context = context;
		 this.method = method;
		 this.connections = connections;
	 };
	 OutgoingConnectionDescriptor.prototype = extend(FunctionLinkResolver.prototype, {});
	 
	 /**
	  * @class ConnectionArraySorter
	  */
	//TODO: Add comment!
    var ConnectionArraySorter = this.ConnectionArraySorter = function (objectOrderArray, priorityCriteriaArray) {

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
    		for (var i=0; i<this.priorityCriteriaArray.length; i++) {
    			criteriaOrder[i] = this.criterias[this.priorityCriteriaArray[i]];
    		}
    		return criteriaOrder;
    	};
    	
    	this.getSortFunctionForCriteriaArray = function(criterias){
    		return function(a,b){
    			var ret = 0;
    			for(var i=0; i<criterias.length && ret==0; i++){
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
    this.ConnectionArraySorter.OBJ = 0;
    this.ConnectionArraySorter.EVENT = 1;
    this.ConnectionArraySorter.CONTEXT = 2;
    this.ConnectionArraySorter.METHOD = 3;
	 
}});