/* Released under BSD license (see license.txt) */

/**
 * utility methods for filtering . Adapted from Dojo's dojo.data.ItemFileReadStore class
 */

/*
 * http://svn.dojotoolkit.org/src/branches/1.6/dojo/data/ItemFileReadStore.js
 * Date of read 20110407
 * BSD License  
 */


define([
        "firebug/lib/trace"
       ], function dojoFilterFactory(FBTrace)
{

//var DojoFilter = FBL.ns(function() {

    var DojoFilter = {};
    
    DojoFilter.filter = function(requestArgs, arrayOfItems, /*Object*/formatters) {        
        var items = [], i, key;
        
        if(requestArgs.query){
            var value,
                  ignoreCase = requestArgs.queryOptions ? requestArgs.queryOptions.ignoreCase : true;
    
            
            var query = requestArgs.query;
            var isPlainQuery = !this.isObject(query);
            var plainQueryOverFields = requestArgs.plainQueryOverFields || [];
                         
            if(isPlainQuery) {
                query =  this.patternToRegExp(query, ignoreCase);
            } else {
                //object based query
                
                //See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
                //same value for each item examined.  Much more efficient.
                var regexpList = {};
                for(key in query){
                    value = query[key];
                    if(typeof value === "string"){
                        regexpList[key] = this.patternToRegExp(value, ignoreCase);
                    } else if(value instanceof RegExp){
                        regexpList[key] = value;
                    }
                }
            } 
            try {
                //iterate over all elements
                for(i = 0; i < arrayOfItems.length; ++i){
                    var match = true;
                    var candidateItem = arrayOfItems[i];

                    if(candidateItem === null){
                        match = false;
                    } else {
                        
                        if(isPlainQuery) {
                            match = false;
                            var j;
                            for(j = 0; j < plainQueryOverFields.length; j++){
                                if(this._containsValue(candidateItem, plainQueryOverFields[j], query, query, formatters)){
                                    match = true;
                                }
                            }
                            
                        } else {
                            //object based query
                            for(key in query){
                                value = query[key];                        
                                if(!this._containsValue(candidateItem, key, value, regexpList[key], formatters)){
                                    match = false;
                                    break;
                                }
                            }                        
                        }
                    }
                    if(match){
                        items.push(candidateItem);
                    }
                }
            }catch(exc) {
                if(FBTrace.DBG_DOJO) {
                    FBTrace.sysout("DOJO ERROR: " + exc, exc);
                }
            }

        } else {
            // We want a copy to pass back in case the parent wishes to sort the array.
            // We shouldn't allow resort of the internal list, so that multiple callers
            // can get lists and sort without affecting each other.  We also need to
            // filter out any null values that have been left as a result of deleteItem()
            // calls in ItemFileWriteStore.
            for(i = 0; i < arrayOfItems.length; ++i){
                var item = arrayOfItems[i];
                if(item !== null){
                    items.push(item);
                }
            }
        }
        return items;
    };

    DojoFilter._containsValue = function(    /* item */ item, /* attribute-name-string */ attribute,
            /* anything */ value, /* RegExp?*/ regexp, /*Object*/formatters) {
        //    summary:
        //        Internal function for looking at the values contained by the item.
        //    description:
        //        Internal function for looking at the values contained by the item.  This
        //        function allows for denoting if the comparison should be case sensitive for
        //        strings or not (for handling filtering cases where string case should not matter)
        //
        //    item:
        //        The data item to examine for attribute values.
        //    attribute:
        //        The attribute to inspect.
        //    value:
        //        The value to match.
        //    regexp:
        //        Optional regular expression generated off value if value was of string type to handle wildcarding.
        //        If present and attribute values are string, then it can be used for comparison instead of 'value'
        var self = this;
        return this.getValues(item, attribute).some(function(possibleValue) {
            if(formatters[attribute]) {
                possibleValue = formatters[attribute].format(possibleValue);
            }
            if(possibleValue !== null && !self.isObject(possibleValue) && regexp){
                if(possibleValue.toString().match(regexp)){
                    return true; // Boolean
                }
            } else if(value === possibleValue) {
                return true; // Boolean
            }
        });
    };

    DojoFilter.getValues = function(item, attribute) {
        var res = item[attribute] || [];
        if(res instanceof Array || typeof res == "array") {
            return res;
        } else {
            return [ res ];
        }
    };
    
    DojoFilter.isObject = function(/*anything*/ it){
        // summary:
        //        Returns true if it is a JavaScript object (or an Array, a Function
        //        or null)
        return it !== undefined &&
            (it === null || typeof it == "object" || it instanceof Array || typeof it == "array" 
                || Object.prototype.toString.call(it) === "[object Function]");
    };

    DojoFilter.patternToRegExp = function(/*String*/pattern, /*boolean?*/ ignoreCase){
        //    summary:
        //        Helper function to convert a simple pattern to a regular expression for matching.
        //    description:
        //        Returns a regular expression object that conforms to the defined conversion rules.
        //        For example:
        //            ca*   -> /^ca.*$/
        //            *ca*  -> /^.*ca.*$/
        //            *c\*a*  -> /^.*c\*a.*$/
        //            *c\*a?*  -> /^.*c\*a..*$/
        //            and so on.
        //
        //    pattern: string
        //        A simple matching pattern to convert that follows basic rules:
        //            * Means match anything, so ca* means match anything starting with ca
        //            ? Means match single character.  So, b?b will match to bob and bab, and so on.
        //          \ is an escape character.  So for example, \* means do not treat * as a match, but literal character *.
        //                To use a \ as a character in the string, it must be escaped.  So in the pattern it should be
        //                represented by \\ to be treated as an ordinary \ character instead of an escape.
        //
        //    ignoreCase:
        //        An optional flag to indicate if the pattern matching should be treated as case-sensitive or not when comparing
        //        By default, it is assumed case sensitive.

        var rxp = "^";
        var c = null;
        var i;
        for(i = 0; i < pattern.length; i++){
            c = pattern.charAt(i);
            switch(c){
                case '\\':
                    rxp += c;
                    i++;
                    rxp += pattern.charAt(i);
                    break;
                case '*':
                    rxp += ".*"; break;
                case '?':
                    rxp += "."; break;
                case '$':
                case '^':
                case '/':
                case '+':
                case '.':
                case '|':
                case '(':
                case ')':
                case '{':
                case '}':
                case '[':
                case ']':
                    rxp += "\\"; //fallthrough
                default:
                    rxp += c;
            }
        }
        rxp += "$";
        if(ignoreCase){
            return new RegExp(rxp,"mi"); //RegExp
        }else{
            return new RegExp(rxp,"m"); //RegExp
        }
        
    };
 

    return DojoFilter;
});    