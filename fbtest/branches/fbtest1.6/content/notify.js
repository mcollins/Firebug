/* See license.txt for terms of usage */

FBTestApp.ns(function() { with (FBL) {

// ************************************************************************************************
// Connects FBTest to other modules via global events

var Rebroadcaster =
{
    onTestStart: function(aTest)
    {
        if (!this.observerService)
            Components.utils.import("resource://firebug/observer-service.js", this);

        this.observerService.notifyObservers(this, "fbtest-start-case", aTest);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    replay: function(aTest)
    {
        FBTestApp.TestRunner.runTest(aTest);
    },
}

FBTestApp.TestRunner.addListener(Rebroadcaster);

// ************************************************************************************************
}});
