

var EXPORTED_SYMBOLS = ["globalWindowExchange"];

var globalWindowExchange =
{
    listeners: [],

    addListener: function(obj)
    {
        this.listeners.push(obj);
    },

    removeListener: function(obj)
    {
        var index = this.listeners.indexOf(obj);
        if (index !== -1)
            this.listeners.splice(index,1);
    },

    onWindowAdded: function(win)
    {
        for (var i = 0; i < this.listeners.length; i++)
            this.listeners[i].onWindowAdded(win);
    }
};