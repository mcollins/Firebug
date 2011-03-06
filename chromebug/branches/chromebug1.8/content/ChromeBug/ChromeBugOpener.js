/* See license.txt for terms of usage */

const PrefService = Components.classes["@mozilla.org/preferences-service;1"];
const nsIPrefBranch2 = Components.interfaces.nsIPrefBranch2;
const prefs = PrefService.getService(nsIPrefBranch2);
const nsIPrefService = Components.interfaces.nsIPrefService;
const prefService = PrefService.getService(nsIPrefService);

var ChromebugOpener =
{
    openNow: function()
    {
        var opener = this.getCommandLineHandler().wrappedJSObject;
        if (opener)
            return opener.openNow(window);
        else
            window.dump("ChromebugOpener: no wrappedJSObject in command line handler\n");
    },

    getCommandLineHandler: function()
    {
        if (!this.ChromebugCommandLineHandler)
        {
            this.ChromebugCommandLineHandler = Components.classes['@mozilla.org/commandlinehandler/general-startup;1?type=chromebug'].
                getService(Components.interfaces.nsICommandLineHandler);
        }

        return this.ChromebugCommandLineHandler;
    },

    setMenuByPref: function()
    {
        var menuitem = document.getElementById("menu_OpenChromebugAlways");
        if (menuitem)
        {
            var openalways = Boolean(prefs.getBoolPref("extensions.chromebug.openalways"));
            menuitem.setAttribute("checked", openalways.toString() );
            //alert("set menuitem.checked to "+menuitem.getAttribute("checked"));
        }
        else
            window.dump("ChromebugOpener: no element with id='menu_OpenChromebugAlways'\n");
    },

    observe: function(subject, topic, data)
    {
        if (data == "extensions.chromebug.openalways")
            ChromebugOpener.setMenuByPref();
    }
}

function ChromebugOpenerOnLoad(event)
{
    ChromebugOpener.setMenuByPref();
    prefs.addObserver("extensions.chromebug", ChromebugOpener, false);
    window.removeEventListener("load", ChromebugOpenerOnLoad, false);
}

window.addEventListener("load", ChromebugOpenerOnLoad, false);
