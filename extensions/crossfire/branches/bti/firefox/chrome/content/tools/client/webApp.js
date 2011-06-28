/* See license.txt for terms of usage */

define([
],
function webAppFactory() {

// ********************************************************************************************* //

// WebApp: unit of related browsing contexts.
// http://www.whatwg.org/specs/web-apps/current-work/multipage/browsers.html#groupings-of-browsing-contexts

//xxxMcollins: on the remote client, this is completely superfluous,
// and we don't know anything about windows

function WebApp(/*win*/)
{
    this.win = "doesn't exist";
}

/**
 * The Window of the top-level browsing context, aka 'top'
 * http://www.whatwg.org/specs/web-apps/current-work/multipage/browsers.html#top-level-browsing-context
 */
WebApp.prototype =
{
    getTopMostWindow: function()
    {
        throw "I'm a Remote Client! I don't know anything about windows!!!";
    }
}

// ********************************************************************************************* //
// Registration

return WebApp;

// ********************************************************************************************* //
});