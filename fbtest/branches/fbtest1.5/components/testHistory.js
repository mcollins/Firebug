/* See license.txt for terms of usage */

// ************************************************************************************************
// Constants

const CLASS_ID = Components.ID("{3008FA55-C12F-4992-9930-B9D52F0CF037}");
const CLASS_NAME = "FBTest History";
const CONTRACT_ID = "@mozilla.org/autocomplete/search;1?name=FBTestHistory";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);

var FBTrace = null;

// ************************************************************************************************
// Test URL History, nsIAutoCompleteSearch

var History =
{
    /* nsISupports */
    QueryInterface: function(iid)
    {
        if (iid.equals(Ci.nsIAutoCompleteSearch) ||
            iid.equals(Ci.nsIFactory) ||
            iid.equals(Ci.nsISupports))
            return this;

        throw Cr.NS_ERROR_NO_INTERFACE;
    },

    /* nsIAutoCompleteSearch */
    startSearch: function(searchString, searchParam, previousResult, listener)
    {
        // Get all test-lists from preferences.
        var history = prefs.getCharPref("extensions.fbtest.history");
        var arr = history.split(" ");

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.History; startSearch '" + searchString + "'", arr);

        var map = {};
        var results = [];
        for (var i=0; i<arr.length; i++)
        {
            var url = arr[i];
            if (url && !map[url] && (!searchString || url.indexOf(searchString) > 0))
            {
                map[url] = true;
                results.push(url);
            }
        }

        listener.onSearchResult(this, new SearchResult(searchString,
            Ci.nsIAutoCompleteResult.RESULT_SUCCESS,
            0, results));
    },

    stopSearch: function()
    {
        
    },

    /* nsIFactory */
    createInstance: function (outer, iid)
    {
        if (outer != null)
            throw Cr.NS_ERROR_NO_AGGREGATION;

        FBTrace = Cc["@joehewitt.com/firebug-trace-service;1"]
           .getService(Ci.nsISupports).wrappedJSObject.getTracer("extensions.firebug");

        this.wrappedJSObject = this;
        return this.QueryInterface(iid);
    },

    lockFactory: function(lock)
    {
    }
};

// ************************************************************************************************
// Module implementation

var HistoryModule =
{
    QueryInterface: function(iid)
    {
        if (iid.equals(Ci.nsIModule) ||
            iid.equals(Ci.nsISupports))
            return this;

        throw Cr.NS_ERROR_NO_INTERFACE;
    },

    /* nsIModule */
    getClassObject: function(compMgr, cid, iid)
    {
        if (cid.equals(CLASS_ID))
            return History.QueryInterface(iid);

        throw Cr.NS_ERROR_NOT_REGISTERED;
    },

    registerSelf: function(compMgr, fileSpec, location, type)
    {
        compMgr.QueryInterface(Ci.nsIComponentRegistrar);
        compMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME,
            CONTRACT_ID, fileSpec, location, type);
      },

    unregisterSelf: function(compMgr, location, type)
    {
        compMgr.QueryInterface(Ci.nsIComponentRegistrar);
        compMgr.unregisterFactoryLocation(CLASS_ID, location);
    },

    canUnload: function(compMgr)
    {
        return true;
    }
};

// ************************************************************************************************

function NSGetModule(comMgr, fileSpec)
{
    return HistoryModule;
}

// ************************************************************************************************
// Implements nsIAutoCompleteResult

function SearchResult(searchString, searchResult, defaultIndex, results)
{
    this.searchString = searchString;
    this.searchResult = searchResult;
    this.defaultIndex = defaultIndex;
    this.results = results;
}

SearchResult.prototype = {
    searchString: "",
    searchResult: 0,
    defaultIndex: 0,
    results: [],
    errorDescription: "",

    get matchCount() {
        return this.results.length;
    },

    getValueAt: function(index) {
        return this.results[index];
    },

    getCommentAt: function(index) {
        return "";
    },

    getStyleAt: function(index) {
        return null;
    },

    getImageAt: function (index) {
        return "";
    },

    removeValueAt: function(index, removeFromDb) {
        this._results.splice(index, 1);
    },

    QueryInterface: function(aIID)
    {
        if (!aIID.equals(Ci.nsIAutoCompleteResult) &&
            !aIID.equals(Ci.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
};
