/* See license.txt for terms of usage */

// ********************************************************************************************* //
// The application (the only global)

var NetActorApp =
{
    initialize: function()
    {
        window.removeEventListener("load", NetActorApp.initialize, false);

        try
        {
            Cu["import"]("resource:///modules/dbg-server.jsm");

            // Initialize the browser debugger.
            if (!DebuggerServer.initialized)
            {
                DebuggerServer.init();
                DebuggerServer.addBrowserActors();
            }

            // Add our actor implementations to the mix.
            DebuggerServer.addActors("chrome://remoteactor/content/netActor.js");

            // Open a TCP listener
            DebuggerServer.openListener(2929, false);
        }
        catch(ex)
        {
            dump("Couldn't start debugging server: " + ex);
        }
    },

    shutdown: function()
    {
        window.removeEventListener("unload", NetActorApp.shutdown, false);
    }
};

// ********************************************************************************************* //

// Register handlers to maintain extension life cycle.
window.addEventListener("load", NetActorApp.initialize, false);
window.addEventListener("unload", NetActorApp.shutdown, false);

// ********************************************************************************************* //
