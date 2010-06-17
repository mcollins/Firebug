/* See license.txt for terms of usage */

CDB.ns(function() { with (CDB) {

/*************************************************************************************************/

/**
 * @modules Firebug database wrapper. This object implements domin specific methods for acessing
 * data in the database.
 */
CDB.FirebugDB = extend(CDB.Module,
{
    initialize: function()
    {
        $.couch.urlPrefix = "http://brasstacks.mozilla.com/couchdb";
        //$.couch.urlPrefix = "http://legoas/couchdb";
        this.db = $.couch.db("firebug");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Getters

    /**
     * Returns list of all groups in the database. Part of the result data
     * is also a number of failing tests in each group.
     */
    getGroupList: function(callback)
    {
        var self = this;
        var options = {
            descending: true,
            group: true,
            success: function(data) {
                //xxxHonza: the sort should be done by the DB.
                self.sortByDate(data, "value.doc.Export Date", true);
                callback(data);
            },
            error: function(status, statusText, error, reason) {
                log("Ajax Error: ", status, statusText, error, reason);
            }
        };

        try
        {
            this.db.list("resultviews/headers", "json", options);
        }
        catch (e)
        {
            callback(null);
            exception(e);
        }
    },

    /**
     * Returns failing results for specified group.
     */
    getGroupResults: function(groupID, callback)
    {
        var options = {
            descending: false,
            key: groupID,
            success: function(data) {
                callback(data);
            }
        };

        this.db.list("resultviews/results_by_header", "json", options);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Just for debugging purposes.

    allDesignDocs: function(callback)
    {
        var options = {
            success: function(data) {
                callback(data);
            }
        };

        this.db.allDesignDocs(options);
    },

    getAllResultsView: function(name, callback)
    {
        var options = {
            success: function(data) {
                callback(data);
            }
        };

        this.db.view(name, options);
    },

    getTestGroups: function(callback)
    {
        var map = function(doc)
        {
            if (doc.type == "header")
                emit(doc["Export Date"], {
                    name: doc["Export Date"],
                    count: doc["Total Tests"]
                });
        };

        var self = this;
        var options = {
            success: function(data) {
                self.sortByDate(data.rows, "key", false);
                callback(data);
            }
        };

        this.db.query(map, null, null, options);
    },

    getFailingTests: function(headerID, callback)
    {
        var map = function(doc)
        {
            if (doc.type == "result" &&
                (doc.result == "TEST-UNEXPECTED-FAIL" || doc.result == "TEST-KNOWN-FAIL"))
            {
                emit(doc.file, {
                    file: doc.file,
                    desc: doc.description,
                    result: doc.result});
            }
        };

        var self = this;
        var options = {
            success: function(data) {
                self.sortByString(data.rows, "key", true);
                callback(data);
            }
        };

        this.db.query(map, null, null, options);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Sorting

    sortByString: function(rows, prop, desc)
    {
        function sort(a, b) {
            var s1 = getObjectProperty(a, prop);
            var s2 = getObjectProperty(b, prop);
            return desc ? s1 < s2 : s1 > s2;
        };
        rows.sort(sort);
    },

    sortByDate: function(rows, prop, desc)
    {
        function sort(a, b){
            var d1 = (new Date(getObjectProperty(a, prop))).getTime();
            var d2 = (new Date(getObjectProperty(b, prop))).getTime();
            return desc ? d2 - d1 : d1 - d2;
        };
        rows.sort(sort);
    }
});

/*************************************************************************************************/

CDB.registerModule(CDB.FirebugDB);

/*************************************************************************************************/
}});

