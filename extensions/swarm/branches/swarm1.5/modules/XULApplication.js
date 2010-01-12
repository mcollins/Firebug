var EXPORTED_SYMBOLS = ["XULApplication"];



// XULApplication.addEventListener('openWindow', callback, false);

var XULApplication
{
    handlers: {},

    addEventListener: function(eventType, handler, ignored)
    {
        if (!eventType)
            throw new Error("XULApplication.addEventListener requires eventType");

        if (!handler)
            throw new Error("XULApplication.addEventListener requires handler for eventType: "+eventType);

        if (!handlers[eventType])
            handlers[eventType] = [];

        var adapter = XULApplication.getEventAdapter(eventType, handler);
        if (!adapter)
            throw new Error("XULApplication.addEventListener eventType "+ eventType+" not in adapter list "+XULApplication.getAllAdapterTypes().join("|"));

        handlers[eventType].push(handler);
    },

    eventAdapters: {},

    getEventAdapter: function(eventType, handler)
    {
        var adapter = this.eventAdapters[eventType];
        if (adapter)
            return adapter.adapt(handler);
    },

    getAllAdapterTypes: function()
    {
        var all = [];
        for (var p in this.eventAdapters)
            all.push(p);
        return all;
    },

    initializeAdapters: function()
    {
        eventAdapters['openXULWindow'] =
        {
            adapt: function(handler)
            {
                XULApplication.WindowMediatorListener.initialize();
                XULApplication.WindowMediatorListener.handlers.push(handler);
            },

            unadapt: function(handler)
            {
                var i = XULApplication.WindowMediatorListener.handlers.indexOf(handler);
                XULApplication.WindowMediatorListener.handlers.splice(i, 1);
                if (!XULApplication.WindowMediatorListener.handlers.length)
                    this.destroy();
            },
        }

    },

    WindowMediatorListener:
    {
        this.handlers = {openXULWindow: []};

        initialize: function()
        {
            if (XULApplication.windowMediator)
                return;

            XULApplication.windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"]
                .getService(Ci.nsIWindowMediator);
            XULApplication.windowMediator.addListener(XULApplication.WindowMediatorListener);
        },

        onOpenWindow: function(xulWindow)
        {
            var openWindowHandlers = XULApplication.WindowMediatorListener.handlers['openXULWindow'];
            if (openWindowHandlers)
            {
                var event = {type: "openXULWindow", xulWindow: xulWindow};
                XULApplication.dispatch(openWindowHandlers, event);
            }

        },

        onCloseWindow: function(xulWindow)
        {

        },

        onWindowTitleChange: function(xulWindow, newTitle)
        {

        }

        cleanup: function()
        {
            var handlers = XULApplication.WindowMediatorListener.handlers;
            for (var p in handlers)
                if (handlers.length > 0)
                    return;

            XULApplication.windowMediator.removeListener(XULApplication.WindowMediatorListener);
            delete XULApplication.windowMediator;
        }
    },

    test: function()
    {
        try
        {
            XULApplication.addEventListener(null);
            XULApplication.addEventListener("openWindow", null);
            XULApplication.addEventListener("notInAdapterList", function dummy(){}, false);
        }
    }
};
