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
                Connection.postMessage(data);
            },

            receiveObject: function(event) {
                try
                {
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
                        FBTrace.sysout("postObject ERROR "+msg, exc);
                }
            },

            postMessage: function(data) {
                // store the object on the child frame targetElement
                targetElement.ownerDocument.setUserData(messageType, data, null);
                var event = targetElement.ownerDocument.createEvent("Event");
                event.initEvent(messageType, false, false);
                Connection.ignore = true;  // both target and source are listening
                targetElement.dispatchEvent(event);
                delete Connection.ignore;
            },

            receiveMessage: function(event) {
                if (Connection.ignore)  // ignore self messages
                    return;
                return targetElement.ownerDocument.getUserData(messageType);
            },

        };
        // The child frame is used to signal and store the data.
        targetElement.addEventListener(messageType, Connection.receiveObject, false);

        return Connection;
    }
    var jsonConnection = {
        add: addObjectConnection,
    };

    return window.jsonConnection = jsonConnection;
})();
