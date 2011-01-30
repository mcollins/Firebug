/* See license.txt for terms of usage */
FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);

// ************************************************************************************************

// Register string bundle of this extension so, $STR method (implemented by Firebug)
// can be used. Also, perform the registration here so, localized strings used
// in template definitions can be resolved.
Firebug.registerStringBundle("chrome://dyne/locale/dyne.properties");

// ************************************************************************************************
// Front end

Firebug.Dyne = extend(Firebug.Module,
{
    dispatchName: "dyne",

    showPanel: function(browser, panel)
    {
        if (!panel)
            return;

        panel.showToolbarButtons("fbEditButtons",  (panel.location instanceof CompilationUnit));
    },

    /*
     * Integrate the selected panel with the selected editor
     */
    toggleEditing: function()
    {
        var panel = Firebug.chrome.getSelectedPanel();
        if (panel.dynamoEditing)
            FBTrace.sysout("Retry requested ");
        else
        {
            var location = Firebug.chrome.getSelectedPanelLocation();
            FBTrace.sysout("Edit requested "+location);
            try
            {
                var editURL = Firebug.Dyne.getEditURLbyURL(panel.context, location);
                if (editURL)
                    Firebug.Dyne.beginEditing(editURL);
            }
            catch (exc)
            {
                Firebug.Console.logFormatted([exc+"", exc], panel.context, "error");
                Firebug.chrome.selectPanel("console");
            }
        }
    },
    // --------------------------------------------------------------------

    beginEditing: function(editURL)
    {
        FBL.openNewTab(editURL);
    },

    // --------------------------------------------------------------------
    // Extracting edit URL
    getEditURLbyURL: function(context, url)
    {
        if (url.substr(0,4) === "http")
            return Firebug.Dyne.getEditURLbyWebURL(context, url);
        else
            return Firebug.Dyne.getEditURLbyLocalFile(context, url);
    },

    /*
     * @param url starts with 'http'
     */
    getEditURLbyWebURL: function(context, url)
    {
        var files = context.netProgress.files;
        for (var i = 0; i < files.length; i++)
        {
            var href = files[i].href;
            href = href.split('?')[0]; // discard query
            href = href.split('#')[0]; // discard fragment

            if (href === url)
                return Firebug.Dyne.getEditURLbyNetFile(files[i]);
        }
        throw Firebug.Dyne.noMatchingRequest(url);
    },

    getEditURLbyLocalFile: function(context, url)
    {
        if (url.substr(0,5) !== "file:")
        {
            var uri = FBL.getLocalSystemURI(url);
            if (uri)
                url = uri.spec;
        }
        if (!Firebug.Dyne.webEditPath)
        {
            var msg = "Need to set Web Edit Path: please open a Web page on your editor for ";
            var followup = " then click Ok";
            window.alert(msg+url+followup);
            Firebug.Dyne.setWebEditPath(url); // assume they navigated to the Web edit for the URL.
            return;  // user can already edit now
        }

        var urlSegments = url.split('/');
        var relativeSegments = urlSegments.splice(0, Firebug.Dyne.webEditPath.urlSegments.length);  // take off the local file part
        var editSegments = Firebug.Dyne.webEditPath.editSegments.concat(relativeSegments);
        return editSegments.join('/');
    },

    setWebEditPath: function(url)
    {
        var urlSegments = url.split('/');
        // Look through all of the windows and find one ending with part of the path from the url
        FBL.iterateBrowserWindows(null, function compareLocations(win)
        {
            var winLocation = win.location.toString();
            var winSegments = winLocation.split('/');
            var commonSegments = 0;
            for (var i = 0; i < urlSegments.length && i < winSegments.length; i++)
            {
                if (winSegments[winSegment.length-1+i] === urlSegments[urlSegments.length-1+i])
                    commonSegments++;
                else
                    break;
            }
            if (commonSegments)
            {
                Firebug.Dyne.webEditPath =
                {
                        urlSegments: urlSegments.splice(-commonSegments, commonSegments),
                        editSegments: winSegments.splice(-commonSegments, commonSegment)
                };
                return true;
            }
            return false;
        });

    },

    getEditURLbyNetFile: function(file)
    {
        var server = null;
        var token = null;
        var headers = file.responseHeaders;
        for (var i = 0; i < headers.length; i++)
        {
            if (headers[i].name.toLowerCase() === "x-edit-server")
                server = headers[i].value;
            if (headers[i].name.toLowerCase() === "x-edit-token")
                token = headers[i].value;
        }
        var editURL = server + token;
        if (editURL)
            return editURL;
        else
            throw Firebug.Dyne.noEditServerHeader(file);
    },

    noEditServerHeader: function(file)
    {
        var msg = "The web page has no x-edit-server header: "; // NLS
        return new Error(msg + file.href);
    },

    noMatchingRequest: function(url)
    {
        var msg = "The Net panel has no request matching "; // NLS
        return new Error(msg + url);
    },

});



// ************************************************************************************************
// ************************************************************************************************
// Registration

// xxxHonza: what if the stylesheet registration would be as follows:
//Firebug.registerStylesheet("chrome://dyne/skin/dyne.css");

Firebug.registerModule(Firebug.Dyne);

// ************************************************************************************************
}});