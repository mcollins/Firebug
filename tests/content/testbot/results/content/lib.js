/* See license.txt for terms of usage */

CDB.ns(function() { with (CDB) {

// ************************************************************************************************
// Debugging

CDB.log = function() {};
CDB.error = function() {};
CDB.exception = function() {};

// #ifdef _DEBUG
CDB.log = function()
{
    try
    {
        // Throws an exception in Chrome, IE
        if (window.console && window.console.error && $.browser.msie)
            for (var i=0; i<arguments.length; i++)
                window.console.log(arguments[i]);
        else if (window.console && window.console.log)
            window.console.log.apply(window.console, arguments);
    }
    catch (err)
    {
    }
};

CDB.error = function()
{
    try
    {
        // Throws an exception in Chrome, IE
        if (window.console && window.console.error && $.browser.msie)
            for (var i=0; i<arguments.length; i++)
                window.console.error(arguments[i]);
        else if (window.console && window.console.error)
            window.console.error.apply(window.console, arguments);
    }
    catch (err)
    {
    }
};

CDB.exception = function(exc)
{
    CDB.error(exc);
};
// #endif

// ************************************************************************************************
// Objects

CDB.extend = function(l, r)
{
    var m = {};
    cloneObject(m, l);
    cloneObject(m, r);
    return m;
};

CDB.cloneObject = function(l, r)
{
    for (var n in r)
        l[n] = r[n];
};

CDB.cloneArray = function(array, fn)
{
   var newArray = [];

   if (fn)
       for (var i = 0; i < array.length; ++i)
           newArray.push(fn(array[i]));
   else
       for (var i = 0; i < array.length; ++i)
           newArray.push(array[i]);

   return newArray;
}

// ************************************************************************************************
// Patterns

CDB.dispatch = function(listeners, name, args)
{
    for (var i=0; listeners && i<listeners.length; i++)
    {
        var listener = listeners[i];
        if (listener[name])
        {
            try
            {
                listener[name].apply(listener, args);
            }
            catch (exc)
            {
                exception(exc);
            }
        }
    }
};

// ************************************************************************************************

CDB.Module =
{
};

// ************************************************************************************************
// CSS

CDB.getAncestorByClass = function(node, className)
{
    for (var parent = node; parent; parent = parent.parentNode)
    {
        if (this.hasClass(parent, className))
            return parent;
    }

    return null;
};

CDB.hasClass = function(node, name) // className, className, ...
{
    if (!node || node.nodeType != 1)
        return false;
    else
    {
        for (var i=1; i<arguments.length; ++i)
        {
            var name = arguments[i];
            //var re = new RegExp("(^|\\s)"+name+"($|\\s)");
            //if (!re.exec(node.getAttribute("class")))
            //    return false;
            var className = node.className;//node.getAttribute("class");
            if (!className || className.indexOf(name) == -1)
                return false;
        }

        return true;
    }
};

CDB.setClass = function(node, name)
{
    if (node && !this.hasClass(node, name))
        node.className += " " + name;
};

CDB.removeClass = function(node, name)
{
    if (node && node.className)
    {
        var index = node.className.indexOf(name);
        if (index >= 0)
        {
            var size = name.length;
            node.className = node.className.substr(0,index-1) + node.className.substr(index+size);
        }
    }
};

CDB.toggleClass = function(elt, name)
{
    if (this.hasClass(elt, name))
    {
        this.removeClass(elt, name);
        return false;
    }
    else
    {
        this.setClass(elt, name);
        return true;
    }
};

CDB.getChildByClass = function(node, className)
{
    return node ? node.querySelector("." + className) : null;
};

// ************************************************************************************************
// Events

CDB.isLeftClick = function(event)
{
    return event.button == 0 && this.noKeyModifiers(event);
};

CDB.noKeyModifiers = function(event)
{
    return !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey;
};

CDB.cancelEvent = function(event)
{
    var e = $.event.fix(event);
    e.stopPropagation();
    e.preventDefault();
}

// ************************************************************************************************
// String

CDB.getObjectProperty = function(object, propName)
{
    var props = (typeof(propName) == "string") ? propName.split(".") : [propName];

    var value = object;
    try
    {
        for (var p in props)
            value = value[props[p]];
    } catch (e) {
    }

    return value;
}

/*************************************************************************************************/
}});
