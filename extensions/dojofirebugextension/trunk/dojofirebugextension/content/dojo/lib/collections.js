/* Released under BSD license (see license.txt) */

/**
 * @author preyna@ar.ibm.com
 * @author fergom@ar.ibm.com
 */
define([
        "firebug/lib/object",
        "firebug/lib/trace"
       ], function dojoCollectionsFactory(Obj, FBTrace)
{    
    var Collections = {};

   // ***************************************************************
    
    var _isNumber = function(/*object*/obj) {     
        return typeof(obj) == "number";                
    };
    
    var _isEnumerable = function(/*Object*/obj) {
        var t = typeof(obj);
        if (_isNumber(obj) || t == "boolean" || (t == "string" || t instanceof String)) {                
            return true;
        }
        return false;
   };
   
   /*
    * FIXME xxxpreyna HACK required due to == returning false as of FF 4
    * (in FF 3.6 we can safely use == to compare Objects) 
    */
   Collections.areEqual = function(obj1, obj2, usingHashcodes) {
       if(!usingHashcodes || (_isEnumerable(obj1) || _isEnumerable(obj2))) {
           return obj1 === obj2;
       } else {
           return HashCodeBasedDictionary.prototype.areEqual(obj1, obj2);
       }        
   };    
    
   /**
    * @class Entry
    */
   var Entry = function(key, value){
       this.key = key; 
       this.value = value; 
   };

   /**
    * @class Map 
    */
   var Map = Collections.Map = function(){};
   Map.prototype = {
       entrySet: function(){
           var entries = [];
           var i;
           for (i=0; i<this.getKeys().length; i++){
               var key = this.getKeys()[i];
               entries.push(new Entry(key, this.get(key)));
           }
           return entries;
       }
   };

   
   // ***************************************************************
   /**
    * @class ArrayMap 
    */
    var ArrayMap = Collections.ArrayMap = function() {         

        this._map = [];
        
        
    };
    ArrayMap.prototype = Obj.extend(Map.prototype, 
    {
       // Associates the specified value with the specified key in this map
       put: function (key, value){
            if (typeof(key) != 'undefined') {
                this._map[key] = value;
            }
           return this;
       },
   
       // Returns the value to which this map maps the specified key
       get: function (key){
           var res = null; 
           if (typeof(key) != 'undefined') {
               res = this._map[key]; 
           }
           return res; 
       },
   
       // Removes the mapping for this key from this map if it is present
       remove: function (key) {
           if (typeof(key) != 'undefined') {
               this._map[key] = undefined;
           }            
       },
       
       // Keys getter.
       getKeys: function(){
           var keys = [];
           var i;
           for (i in this._map){
               if (this._map[i]) {
                   keys.push(i);
               }
           }
           return keys;
       },
       
       // Values getter.
       getValues: function(){
           var values = [];
           var i;
           for (i in this._map){
               if (this._map[i]) {
                   values.push(this._map[i]);
               }
           }
           return values;
       },
       
       // Destructor
       destroy: function(){
           this._map.splice(0, this._map.length);
           this._map = null;
           delete this._map;
       }         
    });
    
    
   // ***************************************************************
   
   /**
    * @class Dictionary 
    * @deprecated
    */
    var Dictionary = Collections.Dictionary = function() {         
       // The keys.
       this._keys = [];

       // The values
       this._values = [];
    };
    Dictionary.prototype = Obj.extend(Map.prototype, 
    {
       // Associates the specified value with the specified key in this map
       put: function (key, value){
           var index = this._keys.indexOf(key);
           if (index == -1){
               index = (this._keys.push(key) - 1);
           }
           this._values[index] = value;
           return this;
       },
   
       // Returns the value to which this map maps the specified key
       get: function (key){
           var index = this._keys.indexOf(key);
           return (index != -1) ? this._values[index] : null;
       },
   
       // Removes the mapping for this key from this map if it is present
       remove: function (key){
           var index = this._keys.indexOf(key);
           if (index != -1){
               this._keys.splice(index, 1);
               this._values.splice(index, 1);
           }
       },
       
       // Keys getter.
       getKeys: function(){
           return this._keys;
       },
       
       // Values getter.
       getValues: function(){
           return this._values;
       },
       
       // Destructor
       destroy: function(){
           this._keys.splice(0, this._keys.length);
           this._keys = null;
           this._values.splice(0, this._values.length);
           this._values = null;
       }         
    });
        
   // ***************************************************************

    /**
    * @class HashCodeBasedDictionary
    */
    var HashCodeBasedDictionary = Collections.HashCodeBasedDictionary = function() {
        
       //this is to avoid issues when inserting objects in more than one HashCodeBasedDictionary
       this.keyIdPropertyName = this.keyIdPropertyNamePrefix + HashCodeBasedDictionary.prototype.instanceCount++;

       // Next keys.
       this._nextKey = 1;
       
       // Deprecated keys. Those keys that were released.
       this._deprecatedKeys = [];

       // The keys
       this._keys = [];
       
       // The values
       this._values = [];

    };
    HashCodeBasedDictionary.prototype = Obj.extend(Map.prototype,{
            // classs variable
            instanceCount: 0,         
           // Key id property name, class variable
           keyIdPropertyNamePrefix: 'x_dojoExtHashCode_',
        
           // Associates the specified value with the specified key in this map
           put: function (key, value) {
               if(_isEnumerable(key)) {
                   if(FBTrace.DBG_DOJO) {
                       FBTrace.sysout("DOJO ERROR: tried to use HashCodeDictionary with a primitive type as key");
                   }
                   throw new Error("DOJO InvalidType: key is invalidType for HashCodeDictionary", key);
               }
                
               var realKey = key[this.keyIdPropertyName];
               if (!realKey || realKey == -1) {                    
                   realKey = this._generateAndInjectKey(key);
               }
               this._keys[realKey] = key;
               this._values[realKey] = value;
               return this;
           },

           // Returns the value to which this map maps the specified key
           get: function (key) {
               
               if(_isEnumerable(key)) {
                   if(FBTrace.DBG_DOJO) {
                       FBTrace.sysout("DOJO ERROR: tried to use HashCodeDictionary with a primitive type as key");
                   }
                   throw new Error("DOJO InvalidType: key is invalidType for HashCodeDictionary", key);
               }
               
               var realKey = (key) ? key[this.keyIdPropertyName] : null;
               return (realKey && realKey != -1) ? this._values[realKey] : null;
           },

           // Removes the mapping for this key from this map if it is present
           remove: function (key) {
               
               if(_isEnumerable(key)) {
                   if(FBTrace.DBG_DOJO) {
                       FBTrace.sysout("DOJO ERROR: tried to use HashCodeDictionary with a primitive type as key");
                   }
                   throw new Error("DOJO InvalidType: key is invalidType for HashCodeDictionary", key);
               }

               
               var realKey = key[this.keyIdPropertyName];
               if (realKey && realKey != -1) {
                   this._keys[realKey] = null;
                   this._values[realKey] = null;
                   this._releaseInjectedKey(key);
               }
           },
           
           // Keys getter.
           getKeys: function(){
               var keys = [];
               var i;
               for (i = 0; i < this._keys.length; i++) {
                   if (this._keys[i]) { keys.push(this._keys[i]); }
               }
               return keys;
           },
           
           // Values getter.
           getValues: function(){
               var values = [];
               var i;
               for (i = 0; i < this._values.length; i++) {
                   if (this._values[i]) { values.push(this._values[i]); }
               }
               return values;
           },
           
           // Destructor
           destroy: function(){
               this._keys.splice(0, this._keys.length);
               this._values.splice(0, this._values.length);
               this._values = null;
           },
           
           
           _releaseInjectedKey: function(/*object*/key) {
               var realKey = key[this.keyIdPropertyName];
               this._deprecatedKeys.push(realKey);
               delete key[this.keyIdPropertyName];
           },
           
           /*int*/_generateAndInjectKey: function(/*Object*/obj) {
               /*
                * since Javascript 1.8.5 (FF 4) we can create propeties in objects
                * that are not visible in for..in loops in client web pages.
                * https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/defineProperty 
                */
               if(_isEnumerable(obj)) {
                   if(FBTrace.DBG_DOJO) {
                       FBTrace.sysout("DOJO ERROR: HashCodeDictionary tried to inject key field in primitive type");
                   }
                   throw new Error("DOJO InvalidType: obj is invalidType for injecting keys", obj);
               }

               var hashcode = (this._deprecatedKeys.length > 0) ? this._deprecatedKeys.pop() : this._nextKey++;
               
               try {
                   if(Object.defineProperty) {
                       Object.defineProperty(obj, this.keyIdPropertyName, 
                               {value: hashcode, writable : false, enumerable : false, configurable : true});
   
                   } else {
                       //traditional way..
                       obj[this.keyIdPropertyName] = hashcode;
                   }
                   
                   return hashcode;
                   
               } catch (exc) {
                   if(FBTrace.DBG_DOJO) {
                       FBTrace.sysout("DOJO ERROR while injecting key in hashcode based item", exc);
                   }
                   throw exc;
               }
           },
           
           areEqual: function(obj1, obj2) {
               /*
                * FIXME xxxpreyna HACK required due to == returning false as of FF 4
                * (in FF 3.6 we can safely use == to compare Objects) 
                */
               
               if((obj1 && !obj2) || (!obj1 && obj2)) {
                   return false;
               }

               if((obj1 === null && obj2 === undefined) || (obj1 === undefined && obj2 === null)) {
                   return false;
               }

               var max = HashCodeBasedDictionary.prototype.instanceCount;
               var hashcode1, hashcode2;
               var i;
               for (i = 0; i < max; i++) {
                   hashcode1 = obj1[this.keyIdPropertyNamePrefix + i];
                   hashcode2 = obj2[this.keyIdPropertyNamePrefix + i];
                   if(hashcode1 != hashcode2) {
                       return false;
                   } else if (hashcode1 && hashcode2 && (hashcode1 == hashcode2)) {
                       return true;
                   }                    
               }
               //the objs don't have hashcodes, let's compare them by ===
               return obj1 === obj2;
           }
           
    });
    
   // ***************************************************************
    
    /**
     * @class StringMap 
     */
    var StringMap = Collections.StringMap = function() {
       // The map.
       this._map = {};
    };
    StringMap.prototype = Obj.extend(Map.prototype, {
        
       // Associates the specified value with the specified key in this map
       put: function (key, value) {
           this._map[key] = value;
           return this;
       },

       // Returns the value to which this map maps the specified key
       get: function (key){
           return this._map[key];
       },

       // Removes the mapping for this key from this map if it is present
       remove: function (key){
           this._map[key] = null;
           delete this._map[key];
       },
       
       // Keys getter.
       getKeys: function(){
           var keys = [];
           var i;
           for (i in this._map){
               if (this._map[i]) {
                   keys.push(i);
               }
           }
           return keys;
       },
       
       // Values getter.
       getValues: function(){
           var values = [];
           var i;
           for (i in this._map){
               if (this._map[i]) {
                   values.push(this._map[i]);
               }
           }
           return values;
       },
       
       // Destructor
       destroy: function(){
           this._map = null;
       } 
    });
    
    
    /**
     * @class ComposedDictionary 
     */
    var ComposedDictionary = Collections.ComposedDictionary = function() {
       // The map.
       this._hashcodeKeyedValues = new HashCodeBasedDictionary();
       this._primitiveKeyedValues = new StringMap();
    };
    ComposedDictionary.prototype = Obj.extend(Map.prototype, 
    {
        _hashcodeKeyedValues: null,
        _primitiveKeyedValues: null,
        
       // Associates the specified value with the specified key in this map
        put: function (key, value) {
           if(_isEnumerable(key)) {
               this._primitiveKeyedValues.put(key, value);
           } else {
               this._hashcodeKeyedValues.put(key, value);
           }
           return this;
       },

       // Returns the value to which this map maps the specified key
       get: function (key){
           if(_isEnumerable(key)) {
               return this._primitiveKeyedValues.get(key);
           } else {
               return this._hashcodeKeyedValues.get(key);
           }
       },

       // Removes the mapping for this key from this map if it is present
       remove: function (key){
           if(_isEnumerable(key)) {
               this._primitiveKeyedValues.remove(key);
           } else {
               this._hashcodeKeyedValues.remove(key);
           }
       },
       
       // Keys getter.
       /*array*/getKeys: function(){
           return this._hashcodeKeyedValues.getKeys().concat(this._primitiveKeyedValues.getKeys());
       },
       
       // Values getter.
       /*array*/getValues: function(){
           return this._hashcodeKeyedValues.getValues().concat(this._primitiveKeyedValues.getValues());
       },
       
       // Destructor
       destroy: function(){
           this._hashcodeKeyedValues.destroy();
           this._primitiveKeyedValues.destroy();
       } 
    });

    
    
    // ***************************************************************
    // exported classes
    // ***************************************************************    
    Collections.Map = Map;
    Collections.ArrayMap = ArrayMap; 
    Collections.Dictionary = Dictionary; 
    Collections.HashCodeBasedDictionary = HashCodeBasedDictionary;
    Collections.StringMap = StringMap;
    Collections.ComposedDictionary = ComposedDictionary;
    
    return Collections; 
});    