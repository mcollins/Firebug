/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

const Cc = Components.classes;
const Ci = Components.interfaces;

// Snap preferences.
const prefNames =
[
];

// ************************************************************************************************

Firebug.registerStringBundle("chrome://snap/locale/snap.properties");

// ************************************************************************************************
// Module implementation

/**
 * @module Represents Snap model responsible for standard initialization such as
 * internationalization of respective UI.
 */
Firebug.Snap = extend(Firebug.Module,
/** @lends Firebug.Snap */
{
    initialize: function(prefDomain, prefNames)
    {
        // Registers tracing listener for trace logs customization.
        if (Firebug.TraceModule)
            Firebug.TraceModule.addListener(this.TraceListener);

        Firebug.Module.initialize.apply(this, arguments);

        // Initialize Snap preferences in Firebug global object.
        for (var i=0; i<prefNames.length; i++)
            Firebug[prefNames[i]] = Firebug.getPref(prefDomain, prefNames[i]);

        if (FBTrace.DBG_SNAP)
            FBTrace.sysout("snap.initialized " + prefDomain, prefNames);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        if (FBTrace.DBG_SNAP)
            FBTrace.sysout("snap.shutdown");

        if (Firebug.TraceModule)
            Firebug.TraceModule.removeListener(this.TraceListener);
    },

    internationalizeUI: function(doc)
    {
        if (FBTrace.DBG_SNAP)
            FBTrace.sysout("snap.internationalizeUI");

        var elements = ["fbSnapAppend"];
        for (var i=0; i<elements.length; i++)
        {
            var element = $(elements[i], doc);
            FBL.internationalize(element, "label");
            FBL.internationalize(element, "tooltiptext");
        }
    },

    refresh: function(context)
    {
        var panel = context.getPanel("snap");
        panel.refresh();
    },

    createShot: function(context)
    {
    	if (!context.snapshots)
    		context.snapshots = [];

    	context.snapshots.push( new Firebug.Snap.Shot(context) );
    },
});

/*
 * A Snap.Shot is a record of the document, DOM, event listeners, and ? that can be replace the page
 */
Firebug.Snap.Shot = function(context)
{
	this.context = context;
	this.snap();
}

Firebug.Snap.Shot.prototype =
{
	snap: function()
	{
		this.freezePage();
		this.snapDOM();
		this.snapHTML();
		this.snapEventListeners();
		this.thawPage();
	},

	restore: function()
	{
		this.freezePage();
		this.restoreDOM();
		this.restoreHTML();
		this.restoreEventListeners();
		this.thawPage();
	},

	//****************************************************
	freezePage: function()
	{
		// TODO, for now only allow snapshots from breakpoints
	},

	thawPage: function()
	{

	},
	//****************************************************
	snapDOM: function()
	{
		this.DOM = this.cloneObjectDeep({}, this.context.window);
	},
	/*
	 * clone one object deep. See jquery.extend in jquery core.js
	 * @param clone: object receiving cloned properties
	 * @param object: JS object to be cloned
	 * @return cloned object
	 */
	cloneObjectDeep: function(clone, object)
	{
		for ( name in object )
		{
			src = clone[ name ];
			copy = object[ name ];

			// Prevent never-ending loop
			if ( clone === copy )
				continue;

			// Recurse if we're merging object literal values or arrays
			if ( copy && ( jQuery.isPlainObject(copy) || jQuery.isArray(copy) ) )
			{
				if (src && jQuery.isPlainObject(src) || jQuery.isArray(src))
					var shell = src;
				if (!shell)
					var shell = jQuery.isArray(copy) ? [] : {}

				clone[ name ] = this.cloneObjectDeep( shell, copy );
			}
			else if ( copy !== undefined )
			{
				clone[ name ] = copy;
			}
		}
		return clone;
	},

	restoreDOM: function()
	{
		this.context.window = this.DOM;
	},

	snapHTML: function()
	{
		var doc = this.context.window.document;  // TODO iterate windows.

		this.documentClone = doc.cloneNode(true);
	},

	restoreHTML: function()
	{
		this.context.window.document = this.documentClone;
	},

	snapEventListeners: function()
	{

	},

	restoreEventListeners: function()
	{

	},
};

// ************************************************************************************************

/**
 * @class Implements a tracing listener responsible for colorization of all trace logs
 * coming from this extension. All logs should use "snap." prefix.
 */
Firebug.Snap.TraceListener =
/** @lends Firebug.Snap.TraceListener */
{
    onLoadConsole: function(win, rootNode)
    {
        var doc = rootNode.ownerDocument;
        var styleSheet = createStyleSheet(doc,
            "chrome://snap/skin/snap.css");
        styleSheet.setAttribute("id", "SnapLogs");
        addStyleSheet(doc, styleSheet);
    },

    onDump: function(message)
    {
        var index = message.text.indexOf("snap.");
        if (index == 0)
            message.type = "DBG_SNAP";
    }
};


//*************************************************************************************************
// Copied from jQuery 1.4.2 core.js on June 28, 2010, MIT License.
var jQuery =
{
		isArray: function( obj ) {
			return toString.call(obj) === "[object Array]";
		},

		isPlainObject: function( obj ) {
			// Must be an Object.
			// Because of IE, we also have to check the presence of the constructor property.
			// Make sure that DOM nodes and window objects don't pass through, as well
			if ( !obj || toString.call(obj) !== "[object Object]" || obj.nodeType || obj.setInterval ) {
				return false;
			}

			// Not own constructor property must be Object
			if ( obj.constructor
				&& !hasOwnProperty.call(obj, "constructor")
				&& !hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf") ) {
				return false;
			}

			// Own properties are enumerated firstly, so to speed up,
			// if last one is own, then all properties are own.

			var key;
			for ( key in obj ) {}

			return key === undefined || hasOwnProperty.call( obj, key );
		},

}
// ************************************************************************************************
// Registration

Firebug.registerStringBundle("chrome://snap/locale/snap.properties");
Firebug.registerModule(Firebug.Snap);

// ************************************************************************************************
}});
