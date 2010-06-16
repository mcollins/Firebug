/* See license.txt for terms of usage */

CDB.ns(function() { with (CDB) {

/*************************************************************************************************/

// <root-uri>/_design/resultviews/_list/values/allresults
// <root-uri>/_utils/document.html?firebug/_design/resultviews

/**
 * @module This object represents the application.
 */
CDB.Main = extend(CDB.Module,
{
    initialize: function()
    {
        // Render list of test groups (a group == Firebug test suite launched once)
        FirebugDB.getGroupList(function(data)
        {
            Reps.GroupList.render(data, document.getElementById("groups"));
        });
    }
});

/*************************************************************************************************/

CDB.registerModule(CDB.Main);

/*************************************************************************************************/
}});

