function define(fn) {
    var exports = fn();
    FBTrace.sysout("xulWindows exports ", exports);
}

define(function(require, exports, module)
{
    var Cc = Components.classes;
    var Ci = Components.interfaces;
    var windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"]
        .getService(Ci.nsIWindowMediator);


    function typeCheck(arg, kind)
    {
        if (!arg)
            throw new Error("ERROR null argument, should be a "+kind);
        if (typeof(arg) !== kind)
            throw new Error("ERROR incorrect argument type, should be a "+kind);
    }

    var listeners = [];

    var XULWindows =
    {
        each: function(fnOfXULWindow)
        {
            var enumerator = windowMediator.getXULWindowEnumerator(null);  // null means all
            while(enumerator.hasMoreElements())
            {
                var win = enumerator.getNext();
                if (win instanceof Ci.nsIXULWindow)
                {
                    var rc = fnOfXULWindow(win);
                    if (rc)
                        return rc;
                }
            }
        },

        always: function(fnOfEvent)
        {
            typeCheck(fnOfEvent, "function");

            XULWindows.each(function(xulWindow)
            {
                fnOfEvent({target: xulWindow, type:"opened"});
            });

            XULWindows.addListener(fnOfEvent);
        },

        addListener: function(fnOfEvent)
        {
            var boundWindowWatcher = createXULWindowWatcher(fnOfEvent);
            listeners.push(boundWindowWatcher);
            windowMediator.addListener(boundWindowWatcher);  // removed in this.shutdown
        },

        removeListener: function(fnOfEvent)
        {
            for(var i = 0; i < listeners.length; i++)
            {
                var windowWatcher = listeners[i];
                if (windowWatcher.callback === fnOfEvent)
                {
                    windowMediator.removeListener(windowWatcher);
                    listeners.splice(1,windowWatcher);
                    return true;
                }
            }
            return false; // no find
        }
    };
    // *****************************************************************************************************
    function createXULWindowWatcher(fnOfEvent)
    {
        var XULWindowWatcher =
        {
            onOpenWindow: function(xulWindow)
            {
                if (xulWindow instanceof Ci.nsIXULWindow)
                    fnOfEvent({target: xulWindow, type: "open"});
            },
            onCloseWindow: function(xulWindow)
            {
                if (xulWindow instanceof Ci.nsIXULWindow)
                    fnOfEvent({target: xulWindow, type:"close"});
            },
            onWindowTitleChange: function(xul_win , newTitle)
            {
                if (xulWindow instanceof Ci.nsIXULWindow)
                    fnOfEvent({target: xulWindow, type:"titleChange", detail: newTitle});
            },
            callback: fnOfEvent,
        };
        return XULWindowWatcher;
    }
    // *****************************************************************************************************

    var xulWindows = {};
    for (var p in XULWindows)
    {
        if (XULWindows.hasOwnProperty(p))
            xulWindows[p] = XULWindows[p];
    }

    return xulWindows;
});