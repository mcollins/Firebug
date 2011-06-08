var xhrIO =
{
    readSynchronously: function(fileURL, orElse)
    {
        if (Components)
            var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                 .createInstance(Components.interfaces.nsIXMLHttpRequest);
        else
            var req = new XMLHTTPRequest();
        req.overrideMimeType("application/json");
        req.open('GET', fileURL, false);
        req.send(null);
        if (req.status === 0)
            return req.responseText;
        else
            orElse("ERROR failed to read "+fileURL, req );
    },

    readAsynchronously: function(url, then, orElse)
    {
        if (Components)
            var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                 .createInstance(Components.interfaces.nsIXMLHttpRequest);
        else
            var req = new XMLHTTPRequest();
        req.overrideMimeType("application/json");
        req.onreadystatechange = function(event)
        {
            if (req.readyState == 4)
            {
                if (req.status == 200)
                    then(req.responseText);
                else
                    orElse(event);
            }
        }
        req.open('GET', url, true);
        req.send(null);
    },

};