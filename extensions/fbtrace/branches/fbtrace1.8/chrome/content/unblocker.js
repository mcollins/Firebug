/* See license.txt for terms of usage */

(function() {

// ********************************************************************************************* //

// This value causes loader.js to pull in firebug source from Firebug
// embedded directory for the tracing console instance.
window._firebugLoadConfig =
{
    baseUrl: "chrome://fbtrace-firebug/content/",
    prefDomain: "extensions.firebug"
};

// ********************************************************************************************* //

var releaser = window.arguments[0];  // see fbtrace/components/commandLine.js

function onLoad(event)
{
    window.dump("-------- " + window.location + " load -----------------\n");

    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
        .getService(Components.interfaces.nsIWindowMediator);

    var enumerator = wm.getEnumerator(null);
    while (enumerator.hasMoreElements())
    {
        var win = enumerator.getNext();
        if (win.location.href === releaser.url)
        {
            TraceConsole.applicationReleased = true;
            TraceConsole.releaser = releaser;
        }
    }
}

window.addEventListener("load", onLoad, false);

// ********************************************************************************************* //
})();
