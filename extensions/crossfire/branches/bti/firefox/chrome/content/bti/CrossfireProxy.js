/* See license.txt for terms of usage */

define("CrossfireProxy", [], function () {

    /**
     * @description Proxy object that will send requests for window
     */
    function CrossfireProxy(objectName, contextId, methods) {
        this.name = objectName;
        this.contextId = contextId;
        this.methods = methods;
        for (var method in methods) {
            this[method] = this._createProxyMethod(method);
        }
    }

    CrossfireProxy.prototype = {

        _createProxyMethod: function( methodName) {
            return function() {
                throw "Aieee! Not Implemented!";
                //TODO:
                // 1. serialize arguments
                // 2. make remote call
                // 3. block calling javascript ( with debugger?)
                // 4. get return value from remote
                // 5. set return value and resume
            };
        }
    }

});
