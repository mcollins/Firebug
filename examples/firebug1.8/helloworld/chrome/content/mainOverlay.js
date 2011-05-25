/* See license.txt for terms of usage */

(function() {

// ********************************************************************************************* //
// Application

var config = {
    baseUrl: "resource://",
    paths: {
        "firebug": "firebug_rjs",
        "helloworld": "helloworld/content",
    }
};

require(config, [
    "helloworld/main"
],
function()
{
});

return {};

// ********************************************************************************************* //
})();
