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

            postObject: function(object) {
                var data = JSON.stringify(object);
                Connection.postMessage(data);
            },

            receiveObject: function(event) {
                var data = Connection.receiveMessage(event);
                if (data)
                    var obj = JSON.parse(data);
                if (obj)
                    fnOfObject(obj);
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

    return addObjectConnection;
});
