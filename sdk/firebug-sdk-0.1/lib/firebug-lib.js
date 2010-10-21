/* See license.txt for terms of usage */

// ************************************************************************************************
// Firebug Library

var FBL = exports.FBL = {};

(function() {

// ************************************************************************************************
// Basics

this.bind = function()  // fn, thisObject, args => thisObject.fn(arguments, args);
{
   var args = cloneArray(arguments), fn = args.shift(), object = args.shift();
   return function bind() { return fn.apply(object, arrayInsert(cloneArray(args), 0, arguments)); }
};

this.bindFixed = function() // fn, thisObject, args => thisObject.fn(args);
{
    var args = cloneArray(arguments), fn = args.shift(), object = args.shift();
    return function() { return fn.apply(object, args); }
};

this.extend = function(l, r)
{
    var newOb = {};
    for (var n in l)
        newOb[n] = l[n];
    for (var n in r)
        newOb[n] = r[n];
    return newOb;
};

// ************************************************************************************************
}).apply(FBL);
