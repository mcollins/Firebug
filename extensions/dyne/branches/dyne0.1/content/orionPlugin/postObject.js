(function()
{
    /*
     * Create a connection using events on targetElement.
     * In parent window, pass child documentElement as targetElement,
     * In child window pass documentElement
     * var connection = addObjectConnection(elt, recvr);
     * connection.postObject(bar);
     */
    var jsonConnection = {};
    function addObjectConnection(targetElement, fnOfObject) {

        var messageType = "pseudoPostMessage";

        var Connection = {
            numberOfRequests: 0,
            callService: function(interfaceId, method, params) {
                if (typeof(interfaceId) !== 'string')
                    throw new Error("postObject.callService interfaceId must be a string not "+typeof(interfaceId));
                if (typeof(method) !== 'string')
                    throw new Error("postObject.callService method must be a string not "+typeof(method));
                if (!params instanceof Array)
                    throw new Error("postObject.callService params must be array not "+params);

                var message = {
                        orionish: true,
                        id: ++Connection.numberOfRequests,
                        serviceId: interfaceId+"",
                        method: method+"",
                        params: params
                    };
                Connection.postObject(message);
            },

            registry: {},
            registerService: function(interfaceId, ignored, implementation)
            {
                Connection.registry[interfaceId] = implementation;
            },
            receiveServiceCall: function(interfaceId, method, params)
            {
                var implementation = Connection.registry[interfaceId];
                if (!implementation)
                    throw new Error("receiveServiceCall at "+interfaceId+" failed, no implemenation");
                if (!implementation[method])
                    throw new Error("receiveServiceCall at "+interfaceId+" failed, no method \'"+method+"\'");
                if (typeof(implementation[method]) !== 'function')
                    throw new Error("receiveServiceCall at "+interfaceId+" failed, method \'"+method+"\' not a function");
                try
                {
                    //log(" receiveServiceCall "+method+" -> "+window.location, params);
                    implementation[method].apply(implementation, params);
                }
                catch(exc)
                {
                    var args = "(";
                    var keys = Object.keys(params);
                    var args = keys.map(function chop(param) { return param.substr(0,20); });
                    var msg = exc.toString() +" "+(exc.fileName || exc.sourceName) + "@" + exc.lineNumber;
                    throw new Error("receiveServiceCall at "+interfaceId+"["+method+"]("+args.join(',')+") failed: "+msg);
                }
            },

            postObject: function(object) {
                var data = JSON.stringify(object);
                log("postObject "+data);
                Connection.postMessage(data);
            },

            receiveObject: function(event) {
                try
                {
                    console.log("receiveobject "+window.location, event)
                    var data = Connection.receiveMessage(event);
                    if (data)
                        var obj = JSON.parse(data);
                    if (obj)
                    {
                        if (obj.orionish && obj.serviceId && obj.method && obj.params)
                            Connection.receiveServiceCall(obj.serviceId, obj.method, obj.params);
                        else
                            fnOfObject(obj);
                    }
                }
                catch(exc)
                {
                    var msg = exc.toString() +" "+(exc.fileName || exc.sourceName) + "@" + exc.lineNumber;

                    if (window.console)
                        console.error(window.location+" postObject ERROR "+msg, exc);
                    else
                        log("postObject ERROR "+msg, exc);
                }
            },

            postMessage: function(data) {
                // store the object on the child frame targetElement
                targetElement.ownerDocument.setUserData(messageType, data, null);
                var event = targetElement.ownerDocument.createEvent("Event");
                event.initEvent(messageType, false, true);
                Connection.currentEvent = event.timeStamp;  // to ignore self messages
                var body = targetElement.ownerDocument.getElementsByTagName('body')[0];
                log("postMessage "+event.timeStamp+" from "+window.location+" "+data+" to "+body.innerHTML, targetElement);
                log("postMessage "+targetElement.ownerDocument.location+" "+targetElement.ownerDocument.defaultView.parent.location);
                targetElement.dispatchEvent(event);
                delete Connection.currentEvent;
            },

            receiveMessage: function(event) {
                var data = targetElement.ownerDocument.getUserData(messageType);
                if (event.timeStamp !== Connection.currentEvent) {
                    log("receiveMessage "+event.timeStamp+" to "+window.location+" CONTINUE "+data, event);
                    event.stopPropagation();
                    event.preventDefault();
                    return data;
                } // else ignore self data

                 log("receiveMessage "+event.timeStamp+" to "+window.location+" DISCARD "+data, event);
            },

        };
        // The child frame is used to signal and store the data.
        targetElement.addEventListener(messageType, Connection.receiveObject, false);
        return Connection;
    }
    var jsonConnection = {
        add: addObjectConnection,
    };

    function log()
    {
       if (window.FBTrace)
            FBTrace.sysout.apply(FBTrace, arguments);
       else if (window.console)
           console.log.apply(console, arguments);
       else
            dump("postObject log "+arguments[0]);
    }

    return window.jsonConnection = jsonConnection;
})();
