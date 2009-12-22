/* See license.txt for terms of usage */

// ************************************************************************************************
// Constants

// Test list history
const TEST_CLASS_ID = Components.ID("{3008FA55-C12F-4992-9930-B9D52F0CF037}");
const TEST_CLASS_NAME = "FBTest: Test List History";
const TEST_CONTRACT_ID = "@mozilla.org/autocomplete/search;1?name=FBTestHistory";

// Test case history
const CASE_CLASS_ID = Components.ID("{B37D6564-77D9-4613-B088-324389E1A8F3}");
const CASE_CLASS_NAME = "FBTest: Source Server History";
const CASE_CONTRACT_ID = "@mozilla.org/autocomplete/search;1?name=FBTestCaseHistory";

// Test driver history
const DRIVER_CLASS_ID = Components.ID("{3882FC1B-D32A-4722-B935-FA82142808A5}");
const DRIVER_CLASS_NAME = "FBTest: Test Driver URL History";
const DRIVER_CONTRACT_ID = "@mozilla.org/autocomplete/search;1?name=FBTestDriverHistory";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);

var FBTrace = null;

// ************************************************************************************************
// Test URL History, nsIAutoCompleteSearch

function History(pref)
{
    this.pref = pref;
}

History.prototype =
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
        var history = prefs.getCharPref(this.pref);
        var arr = history.split(",");

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.History; startSearch " + this.pref +
                " '" + searchString + "'", arr);

        var map = {};
        var results = [];
        for (var i=0; i<arr.length; i++)
        {
            var url = trimSpaces(arr[i]);
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

function trimSpaces(text)
{
    return text.replace(/^\s*|\s*$/g,"");
}

var testHistory = new History("extensions.fbtest.history");
var testCaseHistory = new History("extensions.fbtest.testCaseHistory");
var testDriverHistory = new History("extensions.fbtest.testDriverHistory");

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
        if (cid.equals(TEST_CLASS_ID))
            return testHistory.QueryInterface(iid);
        else if (cid.equals(CASE_CLASS_ID))
            return testCaseHistory.QueryInterface(iid);
        else if (cid.equals(DRIVER_CLASS_ID))
            return testDriverHistory.QueryInterface(iid);

        throw Cr.NS_ERROR_NOT_REGISTERED;
    },

    registerSelf: function(compMgr, fileSpec, location, type)
    {
        compMgr.QueryInterface(Ci.nsIComponentRegistrar);

        compMgr.registerFactoryLocation(TEST_CLASS_ID, TEST_CLASS_NAME,
            TEST_CONTRACT_ID, fileSpec, location, type);
        compMgr.registerFactoryLocation(CASE_CLASS_ID, CASE_CLASS_NAME,
            CASE_CONTRACT_ID, fileSpec, location, type);
        compMgr.registerFactoryLocation(DRIVER_CLASS_ID, DRIVER_CLASS_NAME,
            DRIVER_CONTRACT_ID, fileSpec, location, type);
      },

    unregisterSelf: function(compMgr, location, type)
    {
        compMgr.QueryInterface(Ci.nsIComponentRegistrar);
        compMgr.unregisterFactoryLocation(TEST_CLASS_ID, location);
        compMgr.unregisterFactoryLocation(CASE_CLASS_ID, location);
        compMgr.unregisterFactoryLocation(DRIVER_CLASS_ID, location);
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
