/* See license.txt for terms of usage */

(function() {
// ********************************************************************************************* //

var config = {
    baseUrl: "resource://",
    paths: {"firebug": "firebug_rjs", "helloworld": "helloworld_rjs"}
};

require(config, [
    "firebug/lib/trace",
    "helloworld/myPanel"
],
function(FBTrace)
{
    FBTrace.sysout("helloworld; My exension loaded");
});

// ********************************************************************************************* //
}());
