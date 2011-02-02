try {
    Components.utils.import("resource://firebug/firebug-trace-service.js");
    FBTrace = traceConsoleService.getTracer("extensions.firebug");
} catch(ex) {
    FBTrace = {};
}

var CrossfireRemote = {};

CrossfireRemote.toolListLocator = function(xul_element) {
    var list = CrossfireRemote.toolList;
    if (!list.elementBoundTo)
    {
        list.elementBoundTo = xul_element;
        xul_element.addEventListener("selectObject", FBL.bind(list.onSelectLocation, list), false);
        if (list.onPopUpShown)
            xul_element.addEventListener("popupshown", FBL.bind(list.onPopUpShown, list), false);
    }
    return list;
};

CrossfireRemote.contextsListLocator = function(xul_element) {
    var list = CrossfireRemote.contextsList;
    if (!list.elementBoundTo)
    {
        list.elementBoundTo = xul_element;
        xul_element.addEventListener("selectObject", FBL.bind(list.onSelectLocation, list), false);
        if (list.onPopUpShown)
            xul_element.addEventListener("popupshown", FBL.bind(list.onPopUpShown, list), false);
    }
    return list;
};

// wait for onload so that FBL and modules are loaded into window
addEventListener("load", function() {
    //FBL.ns(function() {
        CrossfireRemote.Tool = FBL.extend(Crossfire.ToolListener, {
            //FIXME: we need to be 'all' to hear the listcontexts response
            toolName: "all",
            commands: [],
            events: [],

            contexts: [],
            tools: [],

            handleRequest: function( request) {

            },

            supportsEvent: function( event) {
                return true;
            },

            // xxxMcollins this should really be handleEvent, but we're cheating
            fireEvent: function(event) {
                var eventName = event.event;
                if (eventName == "onContextCreated") {
                    this.contexts.push(event.data);
                } else if (eventName == "onContextDestroyed") {
                    for (var i = 0; i < this.contexts.length; i++) {
                        if (this.contexts[i].context_id == event.context_id) {
                            this.contexts.splice(i, 1);
                        }
                    }
                }
            },

            supportsResponse: function( response) {
                if (response.command == "listcontexts") return true;
            },

            handleResponse: function( response) {
                var body = response.body;
                if (response.command == "listcontexts") {
                    FBTrace.sysout("CrossfireRemote Tool got contexts => " + response.contexts);
                    this.contexts = body.contexts;
                }
            },

            onConnectionStatusChanged: function( status) {
                this.status = status;
                FBTrace.sysout(this.toolName +" status changed "+status);
            },

            onRegistered: function() {
                FBTrace.sysout(this.toolName +" onRegistered ");
            },

            onUnregistered: function() {
                FBTrace.sysout(this.toolName +" onUnRegistered ");
            }
        });

        CrossfireModule.registerTool("RemoteClient", CrossfireRemote.Tool);

        var crossfireToolList = document.getElementById("crossfireToolList");
        CrossfireRemote.toolList = {

            getCurrentLocation: function() {
                return crossfireToolList.repObject;
            },

            setCurrentLocation: function( loc) {
                crossfireToolList.location = loc;
            },

            getLocationList: function() {
                CrossfireRemote.Tool.tools;
            },

            getDefaultLocation: function() {

            },
    /*
            setDefaultLocation: function( loc) {

            },
    */
            getObjectLocation: function( obj) {

            },

            getObjectDescription: function( obj) {
                if (obj == null) {
                    return "No tools.";
                }
            },

            onSelectLocation: function( evt) {

            },

            onPopupShown: function( evt) {

            }

        };


        var crossfireContextsList = document.getElementById("crossfireContextsList");
        CrossfireRemote.contextsList = {

            getCurrentLocation: function() {
                return crossfireContextsList.repObject
            },

            setCurrentLocation: function( loc) {
                crossfireContextsList.location = loc;
            },

            getLocationList: function() {
                return CrossfireRemote.Tool.contexts;
            },

            getDefaultLocation: function() {
                return null;
            },
    /*
            setDefaultLocation: function( loc) {

            },
    */
            getObjectLocation: function( obj) {
                return obj.href;
            },

            getObjectDescription: function( obj) {
                if (obj == null) {
                    return "No contexts";
                } else if (obj.href) {
                    return { path: obj.href, name: obj.href };
                }
            },

            onSelectLocation: function( evt) {
                FBTrace.sysout("**** onSelectLocation");
            },

            onPopupShown: function( evt) {
                FBTrace.sysout("***** onPopupShown");
            }
        };

    //});
}, false);
