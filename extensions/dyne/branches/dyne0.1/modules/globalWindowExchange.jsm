

var EXPORTED_SYMBOLS = ["globalWindowExchange"];

var globalWindowExchange =
{
    listeners: [],

    addListener: function(obj)
    {
        var index = this.listeners.indexOf(obj);
        if (index === -1)
            this.listeners.push(obj);
        return this.listeners.length;
    },

    removeListener: function(obj)
    {
        var index = this.listeners.indexOf(obj);
        if (index !== -1)
            this.listeners.splice(index,1);
        return this.listeners.length;
    },

    onWindowAdded: function(win)
    {
        for (var i = 0; i < this.listeners.length; i++)
            this.listeners[i].onWindowAdded(win);
    },

    onWindowRemoved: function(win, outerXULWindow)
    {
        for (var i = 0; i < this.listeners.length; i++)
            this.listeners[i].onWindowRemoved(win, outerXULWindow);
    },
};