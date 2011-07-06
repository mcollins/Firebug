/* Released under BSD license (see license.txt) */

/**
 * Some util stuff
 * @author preyna@ar.ibm.com
 * @author fergom@ar.ibm.com
 */
define([
       ], function dojoUtilsFactory()
{

    var DojoUtils = {};

    
    //required as of FF 4
    DojoUtils._addMozillaExecutionGrants = function(fn) {
        if(!fn.__exposedProps__) {
            fn.__exposedProps__ = {};
        }        
        fn.__exposedProps__.apply = "r";
        fn.__exposedProps__.call = "r";
    };    

   
    return DojoUtils; 
});