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
        var parentNode = document.getElementById("groups");
        FirebugDB.getGroupList(function(data)
        {
            // xxxHonza: localization
            if (data)
                Reps.GroupList.render(data, parentNode);
            else
                parentNode.innerHTML = "Failed to execute remote AJAX! See debugging console for more details.";
        });
    }
});

/*************************************************************************************************/

CDB.registerModule(CDB.Main);

/*************************************************************************************************/
}});

