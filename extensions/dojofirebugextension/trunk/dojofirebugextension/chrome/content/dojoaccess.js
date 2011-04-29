/* Released under BSD license (see license.txt) */
/*
 * dojofirebugextension 
 * Copyright IBM Corporation 2010, 2010. All Rights Reserved. 
 * U.S. Government Users Restricted Rights -  Use, duplication or disclosure restricted by GSA ADP 
 * Schedule Contract with IBM Corp. 
 */


/**
 * dojo access. In this file you can find all accesses to a web page's dojo.
 * @author preyna@ar.ibm.com
 * @author fergom@ar.ibm.com
 */
var DojoAccess = FBL.ns(function() { with (FBL) {

	//FIXME: This way of access objects is unsecure. Decouple communication with page and implement a secure mechanism.
    var _dojo = this._dojo = function(context) {
    	//UNSECURE
    	if(!context.window)
    		return null;
    	
    	return unwrapObject(context.window).dojo || null;    	
    };
    
    //FIXME: (idem _dojo) This way of access objects is unsecure. Decouple communication with page and implement a secure mechanism.
    var _dijit = function(context) {
    	//UNSECURE
    	if(!context.window)
    		return null;

    	return unwrapObject(context.window).dijit || null;    	
    };
 

/* ****************************************************************************
 * ****************************************************************************
 * ****************************************************************************
 */	

var API_DOC_URL_BASE = "http://dojotoolkit.org/api/";
var REFERENCE_GUIDE_URL = "http://dojotoolkit.org/reference-guide/";

DojoModel.DojoAccessor = function() {
};
DojoModel.DojoAccessor.prototype = 
{
		destroy: function() {
			//nothign to do
		},
		
		/**
		 * executes init logic on the given firebug context
		 * @param context
		 * @return boolean - true if the accessor was initialized (first time)
		 */
		initializeInContext: function(/*fbug context*/ context) {

			//nothing to do currently..			
		},
		
		/**
		 * NOT BEING USED CURRENTLY
		 * returns true if the "dojo.connect" function exists
		 * @param context a fbug context
		 * @return boolean
		 */
		isDojoConnectFunctionLoaded: function(/*fbug context*/context) {
			return _dojo(context) && _dojo(context).connect;
		},

		/**
		 * returns DojoInfo object about the current loaded dojo.
		 * @return { 'version': dojo.version, 'djConfig': djConfig };
		 */
		getDojoInfo: function(/*fbug context*/ context) {
			var dojo = _dojo(context);
			if(!dojo) {
				return;
			}
		
			var dojoInfo = { 
					'version': dojo.version, 
					'djConfig': this._getConfig(dojo),
					'modulePrefixes': this._readModulePrefixes(dojo)
					};
			return dojoInfo;	
		},
		
		/*obj*/_readModulePrefixes: function(dojo) {
			var result = {};
			var mod = dojo._modulePrefixes;
			for (var name in mod) {
				if(mod.hasOwnProperty(name) && mod[name].value) {
					result[name] = mod[name].value;
				}
			}
			return result;
		},
	
		_getConfig: function(/*obj*/dojo) {
			var config = dojo.config;
			if(!config) {
				config = unwrapObject(context.window).djConfig;
			}
			return config;
		},
		
		/**
		 * returns an int which is the stacktrace depth to use to find the caller 
		 * (in web page stack trace) of a "connect" invocation
		 * on this dojo version
		 * @param context
		 * @return int
		 */
		/*int*/getStackTraceDepthForConnect: function(/*fbug context*/context) {
			
			/* 
			 * Example valid for dojo > 1.4
			 * 'connect place' -> dojo.connect impl -> (_connect wrapper from _Widget) -> our proxy (2 frames in stack) -> dojo._connect impl
			 */
									
			//has the "_connect" fn been wrapped? If wrapped , we need to add one level to the depth
			var stackDepth = (_dojo(context)._connect._listeners) ? 2 : 1;
						
			//ok, now...has the "connect" fn also been wrapped?
			stackDepth += ((_dojo(context).connect._listeners)? 1 : 0);
			
			return stackDepth;
		},
		
		/**
		 * returns an int which is the stacktrace depth to use to find the caller 
		 * (in web page stack trace) of a "subscribe" invocation
		 * on this dojo version
		 * @param context
		 * @return int
		 */
		/*int*/getStackTraceDepthForSubscribe: function(/*fbug context*/context) {
			return (_dojo(context).subscribe._listeners) ? 1 : 0;
		},
		
		/*int*/getDijitRegistrySize: function(context) {
			var dijit = _dijit(context);
			if(!dijit) {
				return 0;
			}
			var reg = dijit.registry;
			if(!reg) {
				return 0;
			}
			
			//diff versions of dojo..
			return (reg.length) ? reg.length : reg._hash.length;
		},
		
		/**
		 * returns the dijit widgets available on the dijit registry
		 * @return array
		 */
		/*array*/getWidgets: function(/*fbug context*/ context) {
			//2nd impl : based on dijit.registry (this should include all widgets, and not only attached)
			var dijit = _dijit(context);
			if(!dijit) {
				return [];
			}
			var registry = dijit.registry; //UNSECURE
			if(!registry) {
				return [];
			}
			
			/*
			 * impl note (preyna): we need to clone the array to create the array in Fbug context and
			 * avoid the "(arr instanceof Array) is false" problem.
			 * See: http://bytes.com/topic/javascript/answers/91190-myarray-instanceof-array-fails-after-passing-different-page
			 */
			var ar = this._toArray(registry);
			return ar;
		},
		
		_toArray: function(/*WidgetSet*/ registry) {
			var ar = [];

			/*
			 //with this version, the widget is not highlighted when user does "inspect"
			 //but highlights are synch among All widgets, all conns, and all subs panels
			var adder = function(elem) {
				ar.push(elem);
			};
			DojoExtension._addMozillaExecutionGrants(adder);
			registry.forEach(adder);
			*/

			 //with this version, the widget is highlighted when user does "inspect"
			 //but highlights are not synched among All widgets, and both all conns, and all subs 
			//panels
			var hash = registry._hash;
			var ar = [];
			for(var id in hash){
				ar.push(hash[id]);
			}			
			return ar;
		},
		
		/**
		 * returns true if the given object extends from any dojo declared class.
		 * @param object
		 * @return boolean
		 */
		isDojoObject: function(object) {
	    	if(!object) {
	    		return false;
	    	}
			return this._getDeclaredClassName(object) != null;
		},
		
		/**
		 * returns true if the given object is a widget.
		 * @param object
		 * @return boolean
		 */
		isWidgetObject: function(object) {
			return this.isDojoObject(object) && object['postMixInProperties'];
		},
		
		/**
		 * returns the widget that contains the node, null if the node is no contained by any widget.
		 * @return Widget|null
		 */
		/*Widget*/getEnclosingWidget: function(/*fbug context*/ context, /*HTMLNode*/ node) {

			var dijit = _dijit(context);
			if(!dijit || !dijit.getEnclosingWidget) {
				return null;
			}

			var unwrappedNode = unwrapObject(node);
			return dijit.getEnclosingWidget(unwrappedNode);					
		},
		
		/**
		 * returns "high-level" specific widget properties.
		 * @param widget the widget
		 * @return an object with the specific widget properties.
		 */
		/*Object*/getSpecificWidgetProperties: function(widget, context) {
			var dojo = _dojo(context);			
			var tracker = context.connectionsAPI;
			var props = {};

			/* TODO
			 */
			
			if(widget.title) {
				props['title'] = widget.title;
			}
			if(widget.label) {
				props['label'] = widget.label;
			}
			
			if(widget.getParent) {
				//it's a "Contained" widget (Contained.js)
				props['parent'] = widget.getParent();
			} else {
				var parentNode = widget.domNode.parentNode;
				var enc = this.getEnclosingWidget(context, parentNode);
				if(enc) {
					props['enclosing widget'] = enc;
				}
			}
			
			/* Returns all the widgets contained by this, i.e., all widgets underneath 
			 * this.containerNode. Does not return nested widgets, nor widgets that are 
			 * part of this widget's template. */
			var children = widget.getChildren ? widget.getChildren() : widget.getDescendants();
			if(children.length > 0) {
				props['children'] = children;
			}
					
			if(tracker) {
				if(widget._connects) {
					var connects = [];
					widget._connects.forEach(function(array) {
						array.forEach(function(handle) {
							connects.push(tracker.getConnectionByHandle(handle));
						}
					)}, this);
					if(connects.length > 0) {
						props['connects'] = connects;
					}
				}
				
				if(widget._subscribes) {
					var subs = widget._subscribes.map(function(handle) {
						return tracker.getSubscriptionByHandle(handle);
					}, this);
					if(subs.length > 0) {
						props['subscribes'] = subs;
					}
				}
			}
			
			if(widget._started != undefined) {
				props['startup invoked'] = widget._started;
			}
			
			
			props['attributeMap'] = widget.attributeMap;
			
			/* Declared Class */
			props['declaredClass'] = widget['declaredClass'];
//			var declaredClassName = this._getDeclaredClassName(widget);
//			props['declaredClass'] = dojo.getObject(declaredClassName);
			
			/* Dom Node */
			props['domNode'] = widget.domNode;
			
			/* Container Node */
			props['containerNode'] = widget.containerNode;
			
			/* Widget event list */
			var events = props['events'] = [];
			for (var propName in widget) {
				//propName is string
				if (propName.substring(0,2) == 'on') {
					events.push(propName);
				}
			}
			events.sort();
			
			/* Widget dojoAttachPoint */
			if (widget._attachPoints && widget._attachPoints.length > 0) {
				var attachPoint = props['dojoAttachPoint'] = {};
				var ap = null;
				for (var i = 0; i < widget['_attachPoints'].length; i++){
					ap = widget['_attachPoints'][i];
					attachPoint[ap] = widget[ap];
				}
				
			} 
			
			return props;
		}, 
		
		_getDeclaredClassName: function(dojoObject) {
			return dojoObject['declaredClass'];
		},
		
		/**
		 * returns an url pointing to the closest match in documentation from
		 * http://api.dojotoolkit.org/
		 * @param object
		 * @return string
		 */
		/*string*/getDojoApiDocURL: function(object, context) {
			
			var declaredClassName = this._getDeclaredClassName(object);
			if(!declaredClassName) {
				return; //undefined
			}
			var version = this.getDojoInfo(context).version;
			var docVersion = this._findClosestApiDocVersion(version);
						
			var docUrl = API_DOC_URL_BASE + docVersion.toString() + "/" + declaredClassName.replace('.', '/', "g");
			
			return docUrl;
		},

		/*Version*/_findClosestApiDocVersion: function(/*dojo version obj*/version) {		
			
			var given = Version.prototype.fromDojoVersion(version);
			
			var current;
			
			for ( var i = 0; i < API_DOC_VERSIONS.length; i++) {				
				var current = API_DOC_VERSIONS[i];
				if(given.compare(current) <= 0) {
					break;
				}
				
			}
			return current;
		},
		
		/**
		 * returns the reference guide documentation url , most suitable for the given object.
		 * @param object
		 * @param context
		 * @return String
		 */
		/*string*/getReferenceGuideDocUrl: function(object, context) {
			var declaredClassName = this._getDeclaredClassName(object);
			if(!declaredClassName) {
				return; //undefined
			}
			
			return REFERENCE_GUIDE_URL + declaredClassName.replace('.', '/', "g") + ".html";
		}

};


/* 
 * ****************************************************************
 * INTERNAL HELPER CLASSES
 * ****************************************************************
 */
var Version = function() {
	this.major = 0;
	this.minor = 0;
	this.patch = 0;
};
Version.prototype = {
		//factory method
		fromVersionString: function(/*string*/ versionString) {
			var v = new Version();
		    // Adapt to version scheme.
		    versionString = versionString.replace('X', '', "g");
		    versionString = versionString.replace('a', '', "g");
		    versionString = versionString.replace('b', '', "g");
			
		    var values = versionString.split('.');	
			v.major = parseInt(values[0]) || 0;
			v.minor = parseInt(values[1]) || 0;
			v.patch = parseInt(values[2]);
			return v;
		},
		//factory method
		fromDojoVersion: function(/*dojo's version object*/ dojoVersion) {
			var v = new Version();
			v.major = dojoVersion.major;
			v.minor = dojoVersion.minor;
			v.patch = dojoVersion.patch;
			return v;
		},
		
		toString: function() {
			return "" + this.major + "." + this.minor + (this.patch ? "." + this.patch : "");	
		},

		/*int*/compare: function(/*Version*/ anotherVersion) {
			//double dispatching
			return -1 * anotherVersion._compareAgainstVersion(this);
		},
		
		/*int*/_compareAgainstVersion: function(/*Version*/ anotherVersion) {
			if(this.major != anotherVersion.major) {
				return this.major - anotherVersion.major;
			} else if(this.minor != anotherVersion.minor) {
				return this.minor - anotherVersion.minor;
//			} else if(this.patch != anotherVersion.patch) {
//				return this.patch - anotherVersion.patch;
			}
			return 0; //equals (we ignore patches for comparison!)
		}
		
};
var HeadVersion = function() {
	//call super constructor
	Version.apply(this);
	
	this.isHead = true;
};
HeadVersion.prototype = extend(Version.prototype, {
		toString: function() {
			return "HEAD";
		},
		
		/*int*/_compareAgainstVersion: function(/*Version*/ anotherVersion) {
			//we are equal if anotherVersion is also HEAD, otherwise I'm greater
			return (anotherVersion.isHead) ? 0 : 1;
		}
});

/*
 * FIXME this is a kind of hack! It's not good to have the available api doc versions hardcoded.
 * Find alternatives. For example:
 * - see if we can get available doc versions from the api site (for a given object).
 * - or, at least, move this hardcoded versions to a properties file...
 */
var API_DOC_VERSIONS = [ Version.prototype.fromVersionString("1.3"), 
                         Version.prototype.fromVersionString("1.4"), 
                         Version.prototype.fromVersionString("1.5"), 
                         Version.prototype.fromVersionString("1.6"),
                         new HeadVersion() ]; 

}});