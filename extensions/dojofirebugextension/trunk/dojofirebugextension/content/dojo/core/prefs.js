/* Released under BSD license (see license.txt) */

/**
 * @author preyna@ar.ibm.com
 * @author fergom@ar.ibm.com
 */
define([
        "firebug/firebug",
        "firebug/lib/options"
       ], function dojoPreferencesFactory(Firebug)
{

    var DojoPrefs = {};

    //constants for dojo extension Preferences
    var DOJO_PREF_MAP_IMPL = "dojofirebugextension.useHashCodes";
    var DOJO_PREF_BP_PLACE = "dojofirebugextension.breakPointPlaceDisabled";
    var DOJO_PREF_EVENT_BASED_PROXY_ENABLED = "dojofirebugextension.useHTMLEventBasedProxy";
    var DOJO_PREF_MAX_SUGGESTED_CONNECTIONS = "dojofirebugextension.maxAllowedNumberOfConnectionsInTable";
    var DOJO_PREF_MAX_SUGGESTED_SUBSCRIPTIONS = "dojofirebugextension.maxAllowedNumberOfSubscriptionsInTable";
    var DOJO_PREF_WIDGETS_TREE = "dojofirebugextension.displayWidgetsAsTree";
    var DOJO_ANIMATIONS_FILTER = "dojofirebugextension.dojoAnimationsFilter";


    var isExtensionEnabled = DojoPrefs.isExtensionEnabled = function() {
        return Firebug.Options.getPref("extensions.firebug.dojofirebugextension", "enableSites");
    };

    
    /**
     * verify if the hashCodeBasedDictionary implementation is enabled.
     */
    var _isHashCodeBasedDictionaryImplementationEnabled = DojoPrefs._isHashCodeBasedDictionaryImplementationEnabled = function() {
        var value = Firebug.Options.getPref(Firebug.Options.getPrefDomain(), DOJO_PREF_MAP_IMPL);
        return value;
    };
    
    /**
     * verify if the breakpoint place support is enabled.
     * Note: this setting will be automatically disabled if useEventBasedProxy is enabled.
     */
    var _isBreakPointPlaceSupportDisabled = DojoPrefs._isBreakPointPlaceSupportDisabled = function(){
        var value = Firebug.Options.getPref(Firebug.Options.getPrefDomain(), DOJO_PREF_BP_PLACE);
        
        return value || _isUseEventBasedProxyEnabled();
    };
    
    /**
     * enable/disable the breakpoint place support.
     */
    var _switchBreakPointPlaceEnabled = DojoPrefs._switchBreakPointPlaceEnabled = function(){
        var currentValue = _isBreakPointPlaceSupportDisabled();
        Firebug.Options.setPref(Firebug.Options.getPrefDomain(), DOJO_PREF_BP_PLACE, !currentValue);
    };

    /**
     * verify if the html event based communication mechanism is enabled.
     */
    var _isUseEventBasedProxyEnabled = DojoPrefs._isUseEventBasedProxyEnabled = function(){
        var value = Firebug.Options.getPref(Firebug.Options.getPrefDomain(), DOJO_PREF_EVENT_BASED_PROXY_ENABLED);
        return value;
    };

    var _switchWidgetsTreeEnabled = DojoPrefs._switchWidgetsTreeEnabled = function() {
        var currentValue = _isWidgetsTreeEnabled();
        Firebug.Options.setPref(Firebug.Options.getPrefDomain(), DOJO_PREF_WIDGETS_TREE, !currentValue);
    };

    var _isWidgetsTreeEnabled = DojoPrefs._isWidgetsTreeEnabled = function(){
        var value = Firebug.Options.getPref(Firebug.Options.getPrefDomain(), DOJO_PREF_WIDGETS_TREE);
        return value;
    };
    
    /**
     * verify if the dojo animations filter is enabled.
     */
    var _isDojoAnimationsFilterEnabled = DojoPrefs._isDojoAnimationsFilterEnabled = function(){
        var value = Firebug.Options.getPref(Firebug.Options.getPrefDomain(), DOJO_ANIMATIONS_FILTER);
        return value;
    };

    var getMaxSuggestedConnections = DojoPrefs.getMaxSuggestedConnections = function() {
        return Firebug.Options.getPref(Firebug.Options.getPrefDomain(), DOJO_PREF_MAX_SUGGESTED_CONNECTIONS);
    }; 
            
    var getMaxSuggestedSubscriptions = DojoPrefs.getMaxSuggestedSubscriptions = function() {
        return Firebug.Options.getPref(Firebug.Options.getPrefDomain(), DOJO_PREF_MAX_SUGGESTED_SUBSCRIPTIONS);
    };  
        
    
    // ***************************************************************
        
    return DojoPrefs; 
});