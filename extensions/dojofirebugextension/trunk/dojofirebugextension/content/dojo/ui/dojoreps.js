/* Released under BSD license (see license.txt) */
/*
 * dojofirebugextension 
 * Copyright IBM Corporation 2010, 2010. All Rights Reserved. 
 * U.S. Government Users Restricted Rights -  Use, duplication or disclosure restricted by GSA ADP 
 * Schedule Contract with IBM Corp. 
 */



/**
 * dojo specific Reps.
 * @author preyna@ar.ibm.com
 * @author fergom@ar.ibm.com
 */
define([
        "firebug/chrome/reps",
        "firebug/firebug",
        "firebug/js/stackFrame",
        "firebug/lib/css",
        "firebug/lib/dom",
        "firebug/lib/domplate",
        "firebug/lib/events",
        "firebug/lib/lib",
        "firebug/lib/locale",
        "firebug/lib/object",
        "dojo/core/dojomodel",
        "dojo/core/prefs",
        "dojo/lib/collections",
       ], function dojoRepsFactory(FirebugReps, Firebug, StackFrame, Css, Dom, Domplate, Events, FBL, Locale, Obj, DojoModel, DojoPrefs, Collections)
{
with(Domplate) {

var DojoReps = {};

//FIXME XXXpreyna need to use the UI.DOJO_BUNDLE constant. Cannot do it now, because of a circular dependency.
var DOJO_BUNDLE = "dojostrings";    
    
//****************************************************************
// GENERAL FUNCTIONS
//****************************************************************

//xxxPERFORMANCE ?
var getRep = function(value) {
        var rep = Firebug.getRep(value);
        var tag = rep.shortTag || rep.tag;
        return tag;
    };

var getMethodLabel = DojoReps.getMethodLabel = function(method) {
    
    // TODO: method should not be undefined, but it happens. Alert this situation.
    if(!method) {
        return "undefined"; 
    }

    var label = '';
    if (typeof(method) == "string") {
        label = method;
    } else {
        //xxxPERFORMANCE
        //TODO encapsulate in our debugger file
        var script = Firebug.SourceFile.findScriptForFunctionInContext(Firebug.currentContext, method);            
        try {
            label = script ? StackFrame.getFunctionName(script, Firebug.currentContext) : method.name;
        } catch(exc) {
            //$$HACK
            label = method.name;
        }
    }
    return label + ((label.indexOf(')') != -1) ? "" : "()");
};
    

var getFunctionObject = function(conn) {
    return conn.getListenerFunction();
};

var onContainerClick = function(event){
    if (!Events.isLeftClick(event)) {
      return;
    }

    var container = Dom.getAncestorByClass(event.target, "collapsable-container");
    this.toggleContainer(container);
};

var toggleContainer = function(container){
    if (Css.hasClass(container, "container-collapsed"))
    {
        Css.removeClass(container, "container-collapsed");
        Css.setClass(container, "container-opened");
    } else {
        Css.removeClass(container, "container-opened");
        Css.setClass(container, "container-collapsed");
    }
};


//****************************************************************
// REPS
//****************************************************************


DojoReps.DojoMainRep = domplate(FirebugReps.Obj,
{
    tag: FirebugReps.OBJECTLINK(
            "$object|getTitle"
    ),

    shortTag: FirebugReps.OBJECTLINK(
            "$object|getTitle"
    ),
    
    supportsObject: function(object, type) {
        return object['version'] && object['body'] && object['global'] && object['baseUrl'];
    },
    
    getTitle: function(object){
        return "dojo [" + object.version + "]";
    }

});

//************************************************************************************************
DojoReps.DijitMainRep = domplate(FirebugReps.Obj,
{
    tag: FirebugReps.OBJECTLINK(
            "$object|getTitle"
    ),

    shortTag: FirebugReps.OBJECTLINK(
            "$object|getTitle"
    ),
    
    supportsObject: function(object, type) {
        return object['registry'] && object['byId'];
    },
    
    getTitle: function(object){
        return "dijit";
    }

});

//************************************************************************************************
/** Rep for dojo classes */
DojoReps.DojoObjectRep = domplate(FirebugReps.Obj,
{

    tag: FirebugReps.OBJECTLINK(
            "$object|getTitle"
    ),
    shortTag: FirebugReps.OBJECTLINK(
            "$object|getTitle"
    ),

    supportsObject: function(object, type) {
        return object['declaredClass'] && (object['postMixInProperties'] == undefined);
    },
    
    getTitle: function(object) {
        return object['declaredClass'] + "{...}";
    }

});

//************************************************************************************************
DojoReps.DijitRep = domplate(FirebugReps.Obj,
{
    tag: FirebugReps.OBJECTLINK(
        SPAN({"class":"dojo-widget dojo-tracked-obj $object|getDetachedClassName $object|getCustomClassName", _referencedObject: "$object"},
            '[',
            SPAN({"class": "widgetId"}, "$object|getWidgetId"),
            ' ',
            SPAN({"class": "widgetDeclaredClass"}, '(Widget $object|getWidgetDeclaredClass)'),
            ']'
        )
    ),
        
    //TODO for detached css class, try using "$detached: $object|isDetached" .
    // see: http://www.softwareishard.com/blog/domplate/domplate-examples-part-ii/
    shortTag: FirebugReps.OBJECTLINK(
        SPAN({"class":"dojo-widget dojo-tracked-obj $object|getDetachedClassName $object|getCustomClassName", _referencedObject: "$object"},
            '[',
            SPAN({"class": "widgetId"}, "$object|getWidgetId"),
            ' ',
            SPAN({"class": "widgetDeclaredClass"}, '(Widget $object|getWidgetDeclaredClass)'),
            ']'
        )
    ),
    
    inspectable: true,
    
    /**
     * returns true if the given dijit widget is NOT attached to the page document
     * (i.e. it wasn't appended to page yet)
     * @return boolean
     */
    /*boolean*/isDetached: function(/*dijit widget*/ widget) {
        //FIXME should use the dojoAccessor version of this method.
        var domNode = widget.domNode;
        if(!domNode || !domNode.ownerDocument) {
            return true;
        }
        return !FBL.isAncestor(domNode, domNode.ownerDocument);
    },
    
    /**
     * returns 'detached' string if the widget is not visible in the page.
     */
    /*string*/getDetachedClassName: function(/*dijit widget*/widget) {
        return this.isDetached(widget) ? "detached" : "";
    },
    
    /**
     * allows widget to display specific style
     */
    /*string*/getCustomClassName: function(/*dijit widget*/widget) {
        return widget.getCustomStyle ? widget.getCustomStyle() : "";
    },

    supportsObject: function(object, type) {
        // FIXME: This validation should be done using the method isWidgetObject defined in the dojoAccess.
        return object['declaredClass'] && object['postMixInProperties'];
    },
    
    getWidgetDeclaredClass: function(widget){
        return widget.declaredClass; // String
    },
    
    getWidgetId: function(widget){
        return (widget.id || 'NO ID'); // String
    },

    highlightObject: function(widget, context) {
        var domElem = this._getHtmlNode(widget);
        
        Firebug.Inspector.highlightObject(domElem, context); //FIXME preyna using global
    },
    
    _getHtmlNode: function(widget) {
        return widget['domNode'];
    },
    
    _inspectHtml: function(widget, context) {
        Firebug.chrome.select(this._getHtmlNode(widget), Firebug.HTMLPanel.prototype.name);
    },

    getContextMenuItems: function(widget, target, context, script) {
        if (!widget) {
            return;
        }
    
        
        return [
            "-",
            {label: Locale.$STRF("InspectInTab", ["HTML"]), nol10n: true, command: Obj.bindFixed(this._inspectHtml, this, widget, context) }
        ];
    },
    
    getTooltip: function(widget) {
        var widgetLabel = '[' + this.getWidgetId(widget) + ' (' + this.getWidgetDeclaredClass(widget) + ')]';
        
        if(this.isDetached(widget)) {
            widgetLabel = Locale.$STR('detached.tooltip', DOJO_BUNDLE) + ": " + widgetLabel;
        }
        
        return widgetLabel;
    }
            
});

//************************************************************************************************
DojoReps.ConnectionRep = domplate(FirebugReps.Obj,
{
    inspectable: false,
    
    tagOutgoing: SPAN(
            TAG("$object.obj|getRep", {object: "$object.obj", className: "object"}),
            " -> ",
            SPAN("$object.event")
        ),
    tagIncomming: SPAN(
            TAG("$object.context|getRep", {object: "$object.context", className: "object"}),
            " -> ",
            TAG(FirebugReps.OBJECTLINK("$title"), {object: "$object|getFunctionObject", className: "object", title: "$object.method|getMethodLabel"})
        ),
    shortTag: DIV({},
            SPAN({"class": "inline-connection"}, "connection("),
            TAG(FirebugReps.OBJECTLINK("$object"), {object: "$object.obj", className: "object"}),
            SPAN({"class": "inline-connection"}, "->"),
            SPAN({"class": "inline-event"}, "$object.event"), //string
            SPAN({"class": "inline-connection"}, ")==>"),
            SPAN({"class": "inline-connection"}, "Exec:("),
            TAG(FirebugReps.OBJECTLINK("$object"), {object: "$object.context", className: "object"}),
            SPAN({"class": "inline-connection"}, "->"),
            TAG(FirebugReps.OBJECTLINK("$title"), {object: "$object|getFunctionObject", className: "object", title: "$object.method|getMethodLabel"}),
            SPAN({"class": "inline-connection"}, ")")
        ),
      getMethodLabel: getMethodLabel,
      getFunctionObject: getFunctionObject,
    supportsObject: function(object, type) {
        return object['clazz'] == 'Connection';
    },

    getRep: getRep
});

//************************************************************************************************
DojoReps.SubscriptionRep = domplate(FirebugReps.Obj, {
    inspectable: false,
    
    shortTag: DIV({},
            SPAN({"class": "inline-subscription"}, "subscription('"),
            SPAN({"class": "inline-topic"}, "$object.topic"),
            SPAN({"class": "inline-subscription"}, "'==>"),
            TAG(FirebugReps.OBJECTLINK("$object"), {object: "$object.context", className: "object"}),
            SPAN({"class": "inline-subscription"}, "->"),
            TAG(FirebugReps.OBJECTLINK("$title"), {object: "$object|getFunctionObject", className: "object", title: "$object.method|getMethodLabel"}),
            SPAN({"class": "inline-subscription"}, ")")
        ),
    
    tag: DIV({},
            //$STR('title.subscriptionRep.onTopic', DOJO_BUNDLE),
            SPAN({"class": "inline-subscription"}, "On Topic: '"),
            SPAN({"class": "inline-topic"}, "$object.topic"),
            SPAN({"class": "inline-subscription"}, "'==>Exec:("),
            TAG(FirebugReps.OBJECTLINK("$object"), {object: "$object.context", className: "object"}),
            SPAN({"class": "inline-subscription"}, "->"),
            TAG(FirebugReps.OBJECTLINK("$title"), {object: "$object|getFunctionObject", className: "object", title: "$object.method|getMethodLabel"}),
            SPAN({"class": "inline-subscription"}, ")")
        ),            

      getMethodLabel: getMethodLabel,
      getFunctionObject: getFunctionObject,
    supportsObject: function(object, type) {
        return object['clazz'] == 'Subscription';
    },

    getRep: getRep
});        

//************************************************************************************************
DojoReps.SubscriptionsArrayRep = domplate(FirebugReps.Obj,
{
    inspectable: false,
    tag: DIV({"class": "connectionsInfo"},
            DIV({"class": "object"}, TAG("$object.object|getRep", {object: "$object.object", className: "object"})),
            DIV({"class": "objectSubscriptions"},
                FOR("sub", "$object|subscriptionsIterator",
                        DIV({"class": "dojo-subscription subscription", _referencedObject: "$sub"},
                            SPAN({"class": ""}, "[$sub.topic]"), " >> ",
                            SPAN({"class": ""}, TAG(FirebugReps.OBJECTLINK("$title"), {object: "$sub|getFunctionObject", className: "object", title: "$sub.method|getMethodLabel"}))
                        )
                    )
            )
        ),
    getRep: getRep,
    /*array*/subscriptionsIterator: function(/*SubscriptionsTracker*/connInfo){
        return connInfo.getSubscriptions();
    },
    getMethodLabel: getMethodLabel,
    getFunctionObject: getFunctionObject
});

//************************************************************************************************

DojoReps.ConnectionsInfoRep = domplate(FirebugReps.Obj,
{
    inspectable: false,
    
    tag: DIV({"class": "connectionsInfo"},
            // Header - Object
            DIV({"class": "object"}, 
                TAG("$object.object|getRep", {object: "$object.object", className: "object"})
            ),
            
            //Incoming connections
            DIV({"style": "display:$object|incomingConnectionsNotEmpty"},
                DIV({"class": "collapsable-container container-opened"},
                    DIV({"class": "collapsable-label", onclick: "$onContainerClick"},
                        DIV({"class": "incomingConnections"},
                            Locale.$STR('title.Listened by', DOJO_BUNDLE),
                            " ($object|getTotalCountOfIncommingConnections)"
                        )
                    ),
                    DIV({"class": "collapsable-content"},
                        FOR("incCon", "$object|incommingConnectionsIterator",
                            DIV({"class": "collapsable-container container-opened"},
                                DIV({"class": "collapsable-label", onclick: "$onContainerClick"},
                                    DIV({"class": "event dojo-eventFunction", _referencedObject: "$incCon"}, "$incCon.event $incCon.connections|getNumberOfItemsIfNeeded")
                                ),
                                DIV({"class": "collapsable-content"},
                                    FOR("con", "$incCon.connections",
                                        DIV({"class": "dojo-connection connectionOut", _referencedObject: "$con"}, 
                                            TAG(DojoReps.ConnectionRep.tagIncomming, {object: "$con", className: "connection"})
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            ),
            
            //Outgoing connections
            DIV({"style": "display:$object|outgoingConnectionsNotEmpty"},
                DIV({"class": "collapsable-container container-opened"},
                    DIV({"class": "collapsable-label", onclick: "$onContainerClick"},
                        DIV({"class": "outgoingConnections"}, 
                            Locale.$STR('title.Listens to', DOJO_BUNDLE),
                            " ($object|getTotalCountOfOutgoingConnections)"
                        )
                    ),
                    DIV({"class": "collapsable-content"},
                        FOR("outCon", "$object|outgoingConnectionsIterator",
                            DIV({"class": "collapsable-container container-opened"},
                                DIV({"class": "collapsable-label", onclick: "$onContainerClick"},
                                    DIV({"class": "function dojo-targetFunction", _referencedObject: "$outCon"}, 
                                        TAG(FirebugReps.OBJECTLINK("$title"), {object: "$outCon|getFunctionObject", className: "object", title: "$outCon.method|getMethodLabel"}),
                                        "$outCon.connections|getNumberOfItemsIfNeeded"
                                    )
                                ),
                                DIV({"class": "collapsable-content"},    
                                    FOR("con", "$outCon.connections",
                                        DIV({"class": "dojo-connection connectionInc", _referencedObject: "$con"}, 
                                            TAG(DojoReps.ConnectionRep.tagOutgoing, {object: "$con", className: "connection"})
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
        ),
        
    /*string*/getNumberOfItemsIfNeeded: function(/*array*/ arr) {
        return arr.length > 1 ? " ("+arr.length+")" : "";
    },
    /*array*/incommingConnectionsIterator: function(/*ConnectionsTracker*/conInfo) {
        var incConnect = [];
        var incommingConnectionsEvents = conInfo.getIncommingConnectionsEvents();
        var i;
        for (i = 0; i < incommingConnectionsEvents.length; i++ ) {
            var obj = conInfo.object;
            var event = incommingConnectionsEvents[i];
            var connections = conInfo.getIncommingConnectionsForEvent(event); //array            
            incConnect.push(new IncomingConnectionsDescriptor(obj, event, connections));
        }
        return incConnect;
      },
      /*array*/outgoingConnectionsIterator: function(/*ConnectionsTracker*/outCons) {
        var outConnect = [];
        var outgoingConnectionsMethods = outCons.getOutgoingConnectionsMethods();
        var i;
        for (i = 0; i < outgoingConnectionsMethods.length; i++) {
            var m = outgoingConnectionsMethods[i];
            var connections = outCons.getOutgoingConnectionsForMethod(m);
            var context = outCons.object;
            var method = m;
            outConnect.push(new OutgoingConnectionsDescriptor(context, method, connections));
        }
        return outConnect;
      },
      incomingConnectionsNotEmpty: function(/*ConnectionsTracker*/incCons) {
          return this.arrayNotEmpty(this.incommingConnectionsIterator(incCons));
      },      
      outgoingConnectionsNotEmpty: function(/*ConnectionsTracker*/outCons) {
        return this.arrayNotEmpty(this.outgoingConnectionsIterator(outCons));
      },
      arrayNotEmpty: function(array) {
        return (array.length == 0) ? "none" : "";
      },
      getTotalCountOfOutgoingConnections: function(/*ConnectionsTracker*/outCons) {
          return outCons.getTotalCountOfOutgoingConnections();
      },
      getTotalCountOfIncommingConnections: function(/*ConnectionsTracker*/incCons) {
          return incCons.getTotalCountOfIncommingConnections();
      },
      getMethodLabel: getMethodLabel,
      getFunctionObject: getFunctionObject,
    supportsObject: function(object, type) {
        return object['clazz'] == 'ConnectionsInfo';
    },
    getRep: getRep,
    onContainerClick: onContainerClick,
    toggleContainer: toggleContainer
});

/**
 * @class IncomingConnectionsDescriptor
 */
var IncomingConnectionsDescriptor = DojoReps.IncomingConnectionsDescriptor = function(obj, /*string*/event, /*array*/connections){
     this.obj = obj;
     this.event = event;
     this.connections = connections;
};
  
IncomingConnectionsDescriptor.prototype =
{
     /*function*/getEventFunction: function(){
            return (this.connections.length > 0) ? this.connections[0].getEventFunction() : null;
     }             
};

/**
 * @class OutgoingConnectionsDescriptor
 */
var OutgoingConnectionsDescriptor = DojoReps.OutgoingConnectionsDescriptor = function(context, method, /*array*/connections){
     this.context = context;
     this.method = method;
     this.connections = connections; //array
};
OutgoingConnectionsDescriptor.prototype = Obj.extend(DojoModel.FunctionLinkResolver.prototype, {});


//************************************************************************************************
DojoReps.SubscriptionsRep = domplate(FirebugReps.Obj,
{
    inspectable: false,
    tag: DIV({"class": "subscriptions"},
            FOR("topic", "$object|topicsIterator",
                DIV({"class": "collapsable-container container-opened"},
                    DIV({"class": "collapsable-label", onclick: "$onContainerClick"}, 
                            DIV({"class": "topic"}, "$topic.topic $topic.subscriptions|getNumberOfItemsIfNeeded")
                    ),
                    DIV({"class": "collapsable-content"},
                        FOR("sub", "topic.subscriptions",
                            DIV({"class": "dojo-subscription subscription", _referencedObject: "$sub"}, 
                                TAG(DojoReps.ConnectionRep.tagIncomming, {object: "$sub", className: "subscription"})
                            )
                        ), "<br/>"
                    )
                )
            )
    ),
    /*string*/getNumberOfItemsIfNeeded: function(/*array*/ arr) {
        return arr.length > 1 ? " ("+arr.length+")" : "";
    },
    onContainerClick: onContainerClick,
    toggleContainer: toggleContainer,
    
    topicsIterator: function(/*Map*/subscriptions) {
        var topics = [];
        var topicsArray = subscriptions.getKeys();
        var e;
        for (e = 0; e < topicsArray.length; e++) { 
            topics.push(
                {topic: topicsArray[e],
                 subscriptions: subscriptions.get(topicsArray[e])}
            );
        }
        return topics;
      },
    supportsObject: function(object, type) {
        return object['clazz'] == 'Subscriptions';
    }
});

//************************************************************************************************
DojoReps.ConnectionsTableRep = domplate(
        {tag:
            DIV({"id": "connections-table"},
                TABLE({"class": "connections-table", "cellpadding": 0, "cellspacing": 0},
                        TBODY(
                            TR({"class": ""},
                                    TD({"class": "superHeader", "colspan": "2"}, Locale.$STR('title.Source', DOJO_BUNDLE)),
                                    TD({"class": "superHeader", "colspan": "2"}, Locale.$STR('title.Target', DOJO_BUNDLE))
                              ),
                            TR({"class": "connectionsPropertyHeaders"},
                                    //TODO preyna sorted table: enable again!
                                    TH({/*"class": "$priorityCriteriaArray|objectPriorityOrder", "onclick": "$sorterObject"*/}, Locale.$STR('title.Obj', DOJO_BUNDLE)),
                                    TH({/*"class": "$priorityCriteriaArray|eventPriorityOrder", "onclick": "$sorterEvent"*/},Locale.$STR('title.Event', DOJO_BUNDLE)),
                                    TH({/*"class": "$priorityCriteriaArray|contextPriorityOrder", "onclick": "$sorterContext"*/},Locale.$STR('title.Context', DOJO_BUNDLE)),
                                    TH({/*"class": "$priorityCriteriaArray|methodPriorityOrder", "onclick": "$sorterMethod"*/},Locale.$STR('title.Method', DOJO_BUNDLE))
                              ),
                            FOR("con", "$connections",
                                TR({"class": "dojo-connection row-$null|changeLineType", _referencedObject: "$con"},
                                    TD({"class":"dojo-conn-obj dojo-tracked-obj", _referencedObject: "$con.obj"},
                                        TAG("$con.obj|getRep", {object: "$con.obj", className: "object"})
                                    ),
                                    TD({"class": "dojo-conn-event", _referencedObject: "$con.event"}, "$con.event"
                                    ),
                                    TD({"class":"dojo-conn-context dojo-tracked-obj", _referencedObject: "$con.context"},
                                        TAG("$con.context|getRep", {object: "$con.context", className: "object"})
                                    ),
                                    TD({"class": "dojo-conn-method", _referencedObject: "$con.method"},
                                        TAG(FirebugReps.OBJECTLINK("$title"),
                                                {object: "$con|getFunctionObject", className: "object", title: "$con.method|getMethodLabel"})
                                    )
                                )
                            )
                        )
                    )
                ),
          getMethodLabel: getMethodLabel,
          getFunctionObject: getFunctionObject,
          getRep: getRep,
          changeLineType: function(object, type) {
            var type = this.counter = this.counter || "even";
            this.counter = (this.counter == 'even') ? "odd" : "even";
            return type;
        },
        getOrderClass: function(propertyValue, priorityCriteriaArray){
            var priority = priorityCriteriaArray.indexOf(propertyValue);
            return "columnPriority" + priority;
        },
        objectPriorityOrder: function(priorityCriteriaArray){
            return this.getOrderClass(DojoModel.ConnectionArraySorter.OBJ, priorityCriteriaArray);
        },
        eventPriorityOrder: function(priorityCriteriaArray){
            return this.getOrderClass(DojoModel.ConnectionArraySorter.EVENT, priorityCriteriaArray);
        },
        contextPriorityOrder: function(priorityCriteriaArray){
            return this.getOrderClass(DojoModel.ConnectionArraySorter.CONTEXT, priorityCriteriaArray);
        },
        methodPriorityOrder: function(priorityCriteriaArray){
            return this.getOrderClass(DojoModel.ConnectionArraySorter.METHOD, priorityCriteriaArray);
        }
    }
);

//************************************************************************************************
DojoReps.CounterLabel = domplate(FirebugReps.Obj,
        {
            inspectable: false,
            tag: DIV({"class": "$counterLabelClass"}, 
                        SPAN({"class": "counterLabel"},  "$label"), ": ",
                        SPAN({"class": "counterValue $counterValueId"}, "$object")
                    )
        });

//************************************************************************************************
DojoReps.Messages = domplate({
    infoTag: DIV({"class": "infoMessage"}, "$object"),
    simpleTag: DIV({"class": "simpleMessage"}, "$object")
});

//************************************************************************************************
DojoReps.ActionMessageBox = domplate({
    tag: 
        DIV({"class": "dojo-warning", "id": "$actionMessageBoxId", "style": "display: $visibility"},
            IMG({"src": 'chrome://dojofirebugextension/skin/info.png'}),
            "$message",
            INPUT({"type": "button", "value": "$btnName", "onclick": "$runAction", _actionMessageBox: "$actionMessageBox"})
        ),
    runAction: function(event){
        var actionMessageBox = event.target['actionMessageBox'];
        actionMessageBox.executeAction();
    }
});

//************************************************************************************************
//FIXME preyna : using globals
DojoReps.WidgetListRep = domplate(Firebug.DOMPanel.DirTable,
{
    // object will be array of dijit widgets
    tag :DIV({"class": "widgets-container"},
            FOR("widget", "$object",
                DIV({"class": "collapsable-container container-collapsed widget-info-level-specific", _repWidget:"$widget", _decFunction:"$propertiesToShow"},
                        DIV({"class": "widget-label"},
                                SPAN({"class": "collapsable-label", onclick: "$onContainerClick"},
                                        TAG(DojoReps.DijitRep.tag, {object: "$widget"})
                                ),
                                SPAN({"class": "infoLevelToggle", onclick: "$onSwitchInfoLevelClick", title: Locale.$STR('widget.infoLevelToggle.tooltip', DOJO_BUNDLE)}, "&nbsp;")
                            ),
                        DIV({"class": "collapsable-content", _referencedObject:"$widget"},
                                DIV({"class": "widget-specific-data not-loaded"}),
                                DIV({"class": "widget-full-data not-loaded"})
                            )
                    )
            )
        ),
    
    onContainerClick: function(event) {
        if (!Events.isLeftClick(event)) {
            return;
        }

        var elem = Dom.getAncestorByClass(event.target, "collapsable-container");
        var specificInfoLevel = Css.hasClass(elem, "widget-info-level-specific");
        this.lazyContentLoad(elem, 
                (specificInfoLevel) ? "widget-specific-data" : "widget-full-data",
                elem.repWidget, (specificInfoLevel) ? elem.decFunction : null);
        this.toggleContainer(elem);
      },
    toggleContainer: toggleContainer,
    onSwitchInfoLevelClick: function(event){
        var select = event.target;
        var elem = Dom.getAncestorByClass(select, "collapsable-container");
            
        if (Css.hasClass(elem, "widget-info-level-specific")) {
              Css.removeClass(elem, "widget-info-level-specific");
              Css.setClass(elem, "widget-info-level-full");
              this.lazyContentLoad(elem, "widget-full-data", elem.repWidget);
          } else {
              Css.removeClass(elem, "widget-info-level-full");
              Css.setClass(elem, "widget-info-level-specific");
              this.lazyContentLoad(elem, "widget-specific-data", elem.repWidget, elem.decFunction);
          }
    },
    lazyContentLoad: function(parentNode, nodeClass, obj, decFunction){
        var nodes = parentNode.getElementsByClassName(nodeClass);
        var node = (nodes) ? nodes[0] : null;
        if(node && Css.hasClass(node, "not-loaded")){            
            Firebug.DOMPanel.DirTable.tag.append({object: ((decFunction) ? decFunction(obj) : obj)}, node); //FIXME preyna : using globals
            Css.removeClass(node, "not-loaded");
        }
    }
});

//************************************************************************************************


DojoReps.WidgetsTreeRep = domplate({
    //"object" is an array of widgets (the roots)
    //expandPath will be an array of widgets
    tag: DIV({"class": "widgets-tree", _decFunction:"$propertiesToShow", _expandPath: "$expandPath"},
            FOR("wrapper", "$object",
                DIV({style: "padding-left: $wrapper|indent"},
                    TAG("$widgetTreeRow", {wrapper: "$wrapper", level: 0})
                )
            )
        ),

    widgetTreeRow:    DIV({"class": "collapsable-container container-collapsed collapsable-children-container $wrapper|shouldChildrenStartOpenedClass widget-info-level-none", _repWidget:"$wrapper.widget",
                            _level: "$level"},
                        DIV({"class": "widget-label"},
                                SPAN({"class": "collapsable-children-label $wrapper|hasChildrenClass", onclick: "$onChildrenContainerClick" },
                                        TAG(DojoReps.DijitRep.tag, {object: "$wrapper.widget"})
                                )/*, //DEPRECATED
                                SPAN({"class": "$wrapper|infoLevelToggleClass", onclick: "$onSwitchInfoLevelClick", title: Locale.$STR('widget.infoLevelToggle.tooltip', DOJO_BUNDLE)}, "&nbsp;")
                                */
                            ),
                        DIV({"class": "widget-data widget-data-collapsed collapsable-content", _referencedObject:"$wrapper.widget"},
                                DIV({"class": "widget-specific-data not-loaded"}),
                                DIV({"class": "widget-full-data not-loaded"}),
                                DIV({"class": "widget-none-data not-loaded"})
                            ),
                        DIV({"class": "collapsable-children", _referencedObject:"$wrapper.widget"},
                                DIV({"class": "children $wrapper|shouldChildrenBeLoadedClass"},
                                    TAG("$loopChildren", {children: "$wrapper|getChildrenIfNeeded"})
                                )                                
                        )                        
                    ),
 
    loopChildren:    FOR("wrapper", "$children",
                        DIV({style: "padding-left: $wrapper|indent"},
                            TAG("$widgetTreeRow", {wrapper: "$wrapper", level: "$wrapper|level"})
                        )
                    ),

    createFakeTreeNode: function(children) { 
        return { 'isFakeRoot': true, 'id': 'Detached Widgets', 'declaredClass': '', 'children': children,
            getCustomStyle: function() {
                return "fakeWidgetNode";
            }};
    },            
    collapsedChildrenNode:     DIV({"class": "children not-loaded"}),
    
    shouldChildrenStartOpenedClass: function(wrapper) {
        var res = this._contains(wrapper.widget, wrapper.expandPath) ? "children-opened" : "children-collapsed";
        return res;
    },
    shouldChildrenBeLoadedClass: function(wrapper) {
        var res = this._contains(wrapper.widget, wrapper.expandPath) ? "" : "not-loaded";
        return res;
    },
    _contains: function(widget, widgetsArray) {
        //FIXME $$HACK XXXpreyna
        if(widget.isFakeRoot) {
            return widgetsArray[0] && widgetsArray[0].isFakeRoot;
        }

        var usingHashcodes = DojoPrefs._isHashCodeBasedDictionaryImplementationEnabled();
        var i;
        for(i=0;i<widgetsArray.length;i++) {    
            if(Collections.areEqual(widget, widgetsArray[i], usingHashcodes)) {
                return true;
            }
        }
        return false;        
    },

    /*int*/level: function(wrapper) {
        return wrapper.level ? parseInt(wrapper.level) : 0;
    },
    /*string*/indent: function(wrapper) {
        return (this.level(wrapper) * 16) + "px";
    },
    
    //DEPRECATED
    infoLevelToggleClass: function(wrapper) {
        //FIXME do not explicitely use fakeNode
        return wrapper.widget.isFakeRoot ? "not-displayed" : "infoLevelToggle";
    },
    getChildren: function(widget) {
        //FIXME do not explicitely use fakeNode
        if(widget.isFakeRoot) {
            return widget.children;
        }
        var ctx = Firebug.currentContext;
        var dojoAccessor = ctx.dojo.dojoAccessor;        
        var children = dojoAccessor.findWidgets(widget, ctx);
        return children;
    },
    hasChildren: function(widget) {
        return this.getChildren(widget).length > 0;
    },
    hasChildrenClass: function(wrapper) {
        return this.hasChildren(wrapper.widget) ? "with-children" : "with-no-children";
    },
    
    //DEPRECATED
    _getDecFunction: function(node) {
        var root = Dom.getAncestorByClass(node, "widgets-tree");
        return root.decFunction;
    },
    _getExpandPath: function(node) {
        var root = Dom.getAncestorByClass(node, "widgets-tree");
        return root.expandPath;
    },    
    onChildrenContainerClick: function(event) {
        if (!Events.isLeftClick(event)) { 
            return;
        }

        var elem = Dom.getAncestorByClass(event.target, "collapsable-children-container");

        if(!this.hasChildren(elem.repWidget)) {
            return;
        }
        var level = parseInt(elem.level);
        this.lazyChildrenLoad(elem, elem.repWidget, level + 1);
        this.toggleChildren(elem);
      },
    
      //DEPRECATED
    onSwitchInfoLevelClick: function(event) {
        if (!Events.isLeftClick(event)) {
            return;
        }        
        var elem = Dom.getAncestorByClass(event.target, "collapsable-container");
        
        //FIXME do not explicitely use fakeNode
        if(elem.repWidget.isFakeRoot) {
            //it's the fake root
            return;
        }
        
        //clear displayed info
        var nodes = elem.getElementsByClassName("widget-data");
        var node = (nodes) ? nodes[0] : null;
        if(node){
            nodes.innerHTML = '';
        }
        
        var needsToggle = true;
        if(Css.hasClass(elem, "widget-info-level-none")) {
            
            Css.removeClass(elem, "widget-info-level-none");
            Css.setClass(elem, "widget-info-level-specific");
        } else if (Css.hasClass(elem, "widget-info-level-specific")) {
            Css.removeClass(elem, "widget-info-level-specific");
            Css.setClass(elem, "widget-info-level-full");
            needsToggle = false; //node already expanded...
        } else {
            Css.removeClass(elem, "widget-info-level-full");
            Css.setClass(elem, "widget-info-level-none");
        }

        if(needsToggle) {
            //expand/collapse widget-data node
            if(Css.hasClass(node, "widget-data-collapsed")) {
                Css.removeClass(node, "widget-data-collapsed");
                Css.setClass(node, "widget-data-opened");
            } else {
                Css.removeClass(node, "widget-data-opened");
                Css.setClass(node, "widget-data-collapsed");
            }            
        }        

        //needs to display info?
        if(Css.hasClass(node, "widget-data-opened")) {
            var decFunction = this._getDecFunction(elem);
            var objectToDisplay = (Css.hasClass(elem, "widget-info-level-specific") && decFunction) ? decFunction(elem.repWidget) : elem.repWidget;  
            Firebug.DOMPanel.DirTable.tag.replace({object: objectToDisplay}, node); //FIXME preyna : using globals
        }        
        
    },
    
    toggleChildren: function(container){
        if(Css.hasClass(container, "children-collapsed")) {
            Css.removeClass(container, "children-collapsed");
            Css.setClass(container, "children-opened");
        } else {
            Css.removeClass(container, "children-opened");
            Css.setClass(container, "children-collapsed");
        }
    },
    
    //display children
    lazyChildrenLoad: function(parentNode, widget, level) {
        var nodes = parentNode.getElementsByClassName("children");
        var node = (nodes) ? nodes[0] : null;
        if(node && Css.hasClass(node, "not-loaded")) {
            var expandPath = this._getExpandPath(node);
            var childrenWrappers = this.getChildrenWrappers(widget, level, expandPath);
            this.loopChildren.replace({'children': childrenWrappers}, node);
            Css.removeClass(node, "not-loaded");
        }
    },
    
    getChildrenIfNeeded: function(wrapper) {
        var widget = wrapper.widget;
        var level = wrapper.level;
        if(!this._contains(widget, wrapper.expandPath)) {
            //just don't return children if not included in expandPath
            return []; 
        }
        return this.getChildrenWrappers(widget, level + 1, wrapper.expandPath);
    },
    
    getChildrenWrappers: function(widget, childrenLevel, expandPath) {
        var children = this.getChildren(widget);
        var wrappers = [];
        var i;
        for (i = 0; i < children.length; i++ ) {
            wrappers.push({'widget': children[i], 'level': childrenLevel, 'expandPath': expandPath});
        }
        return wrappers;
    },
    createWrappersForWidgets: function(widgets, expandPath) {
        var wrappers = [];
        var i;
        for(i=0; i < widgets.length; i++) {
            wrappers.push({ 'widget': widgets[i], 'level': 0, 'expandPath': expandPath });
        }        
        return wrappers;
    }
});

//************************************************************************************************

//called by dojofirebugextension
DojoReps.registerReps = function() {
    //'this' is DojoReps
    Firebug.registerRep(this.DojoMainRep);
    Firebug.registerRep(this.DijitMainRep);
    Firebug.registerRep(this.DojoObjectRep);
    Firebug.registerRep(this.DijitRep);
    Firebug.registerRep(this.ConnectionRep);
    Firebug.registerRep(this.SubscriptionRep);
    Firebug.registerRep(this.ConnectionsInfoRep);    
};

//called by dojofirebugextension
DojoReps.unregisterReps = function() {
    //'this' is DojoReps
    Firebug.unregisterRep(this.DojoMainRep);
    Firebug.unregisterRep(this.DijitMainRep);
    Firebug.unregisterRep(this.DojoObjectRep);    
    Firebug.unregisterRep(this.DijitRep);
    Firebug.unregisterRep(this.ConnectionRep);
    Firebug.unregisterRep(this.SubscriptionRep);
    Firebug.unregisterRep(this.ConnectionsInfoRep);    
};


//************************************************************************************************
/*} // end with FBL */

return DojoReps; 

}});