/* See license.txt for terms of usage */


define([
        "firebug/lib/lib",
        "firebug/firebug",
        "firebug/lib/url"
        ],
function parseURIFactory(FBL, Firebug, Url)
{

const Cc = Components.classes;
const Ci = Components.interfaces;

const reComponents = /:\/(.*)\/components\//; // chrome:/ or file:/
const reExtensionInFileURL = /file:.*\/extensions\/([^\/]*)/;
const reResource = /resource:\/\/([^\/]*)\//;
const reModules = /:\/\/(.*)\/modules\//; // chrome:// or file://
const reWeb = /(^http:|^ftp:|^mailto:|^https:|^ftps:)\//;
const reXUL = /\.xul$|\.xml$|^XStringBundle$/;



this.namespaceName = "Chromebug";

//*******************************************************************************

var URI = {};

URI.parseWebURI = function(uri)
{
    var m = reWeb.exec(uri);
    if(m)
    {
        var split = FBL.splitURLBase(uri);
        return {path: m[1], name: split.path+'/'+split.name, kind:"web", pkgName: m[1]};
    }
}

URI.parseSystemURI = function(uri)
{
    if (Url.isSystemURL(uri))
    {
        var split =  FBL.splitURLBase(uri);
        return {path: split.path, name: split.name, kind: "system", pkgName: "system" }
    }
}

URI.parseNoWindowURI = function(uri)
{
    if (uri.indexOf('noWindow')==0)
    {
        var sandbox = uri.indexOf('Sandbox');
        if (sandbox > 0)
            return {path: "Sandbox", name: uri.substr(11), kind: "sandbox", pkgName: "Sandbox"};

        return {path: uri.substr(0,9), name: uri.substr(11), kind: "noWindow", pkgName: "noWindow" }
    }
}

URI.parseDataURI = function(URI)
{
    if (isDataURL(URI))
    {
        var split = splitURLBase(URI);

        if (FBTrace.DBG_LOCATIONS)
            FBTrace.sysout("parseDataURI "+URI, split);
        return {path: "data:", name: split.path+'/'+split.name, kind:"data", pkgName: "data:"};
    }
}

URI.parseComponentURI = function(URIString)
{
    var m = reComponents.exec(URIString);
    if (m)
    {
        return { path: "components", pkgName: m[1], name: new String(URIString), href: URIString, kind: 'component' };
    }
    else
          return null;
};

URI.parseModuleURI = function(URIString)
{
    if (Firebug.Chromebug.isChromebugURL(URIString))
        return null;

    var m = reModules.exec(URIString);
    if (m)
    {
           var module = m[1];
           //var remainder = m[0].length;
        return { path: "modules", name: new String(URIString), pkgName: "modules", href: URIString, kind: 'module' };
    }
    else
          return null;
};


URI.parseExtensionURI = function(URIString)
{

    if (typeof(URI.appStream) === undefined)
    {
        try
        {
            URI.appURLStem = Firebug.Chromebug.getPlatformStringURL("resource:app");
        }
        catch(exc)
        {
            // FAIL in FF6
            URI.appURLStem = "";
        }
    }

    var m = FBL.reChrome.exec(URIString) || reExtensionInFileURL.exec(URIString) || reResource.exec(URIString);
    var pkgName, remainder;
    if (m)
    {
        pkgName = m[1];
        remainder = m[0].length;
    }
    else
    {
        if (URI.appURLStem && URIString && URIString.indexOf(appURLStem) == 0)
        {
            pkgName = "application";
            remainder = appURLStem.length;
        }
        // else not one of ours
        return null;
    }
    return {path: pkgName, name: new String(URIString.substr(remainder)), pkgName: pkgName, href: URIString, kind:'extension'};
};


URI.parseURI = function(aURI)
{
    if (!aURI || Firebug.Chromebug.isChromebugURL(aURI))
        return null;

    var description = null;
    if (!description)
        description = URI.parseNoWindowURI(aURI);
    if (!description)
        description = URI.parseComponentURI(aURI);
    if (!description)
        description = URI.parseExtensionURI(aURI);
    if (!description)
        description = URI.parseModuleURI(aURI);
    if (!description)
        description = URI.parseSystemURI(aURI);
    if (!description)
        description = URI.parseWebURI(aURI);
    if (!description)
        description = URI.parseDataURI(aURI);

    if (!description)
    {
        if (FBTrace.SOURCEFILES)
            FBTrace.sysout("URI.parseURI: no match for "+URI);
        description = {path:"mystery", name:URI, kind: "mystery", pkgName: "unparsable"};
    }

    return description;
}


return URI;
});