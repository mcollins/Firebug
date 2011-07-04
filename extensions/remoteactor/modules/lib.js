/* See license.txt for terms of usage */

// ********************************************************************************************* //
// Constants

var EXPORTED_SYMBOLS = ["Lib"];

var Lib = {};

// ********************************************************************************************* //
// Object

Lib.bind = function()  // fn, thisObject, args => thisObject.fn(arguments, args);
{
   var args = cloneArray(arguments), fn = args.shift(), object = args.shift();
   return function bind() { return fn.apply(object, arrayInsert(cloneArray(args), 0, arguments)); }
}

// ********************************************************************************************* //
// Array

function cloneArray(array, fn)
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

function arrayInsert(array, index, other)
{
   for (var i = 0; i < other.length; ++i)
       array.splice(i+index, 0, other[i]);

   return array;
}

// ********************************************************************************************* //
// Time

Lib.now = function()
{
    return (new Date().getTime());
}

// ********************************************************************************************* //
