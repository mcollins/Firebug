if (!window.define)
{
    function define(deps, factory) { window.addObjectConnection = factory(); }
}

define([], function()
{
    /*
     * Create a connection from sourceFrame to targetFrame
     * var connection = addObjectConnection(window, frame, recvr);
     * connection.postObject(bar);
     */
    function addObjectConnection(sourceFrame, targetFrame, fnOfObject) {

        var messageType = "pseudoPostMessage";

        // Send the event always to the child frame.
        if (sourceFrame.parent == sourceFrame)
            var element = targetFrame.document.documentElement;
        else
            var element = sourceFrame.document.documentElement;

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
                    throw new Error("receiveServiceCall at "+interfaceId+"["+method+"]("+args.join(',')+") failed with params");
                }
            },

            postObject: function(object) {
                var data = JSON.stringify(object);
                Connection.postMessage(data);
            },

            receiveObject: function(event) {
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
            },

            postMessage: function(data) {
                // store the object on the child frame element
                element.ownerDocument.setUserData(messageType, data, null);
                var event = element.ownerDocument.createEvent("Event");
                event.initEvent(messageType, false, false);
                Connection.ignore = true;  // both target and source are listening
                element.dispatchEvent(event);
                delete Connection.ignore;
            },

            receiveMessage: function(event) {
                if (Connection.ignore)  // ignore self messages
                    return;
                return element.ownerDocument.getUserData(messageType);
            },

        };
        // The child frame is used to signal and store the data.
        element.addEventListener(messageType, Connection.receiveObject, false);

        return Connection;
    }
    window.addObjectConnection = addObjectConnection;
    return addObjectConnection;
});
