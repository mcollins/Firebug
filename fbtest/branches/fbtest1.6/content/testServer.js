/* See license.txt for terms of usage */

FBTestApp.ns(function() { with (FBL) {

// ************************************************************************************************
// Test Console Implementation

var Cc = Components.classes;
var Ci = Components.interfaces;

// Services
var cache = Cc["@mozilla.org/network/cache-service;1"].getService(Ci.nsICacheService);
var ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
var chromeRegistry = Cc['@mozilla.org/chrome/chrome-registry;1'].getService(Ci.nsIChromeRegistry);
var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

// Global variables
var serverPort = 7080;

// ************************************************************************************************

/**
 * HTTP Server helper
 */
FBTestApp.TestServer =
{
    // Start the HTTP server mapping the server URL http://localhost:port/tests to the files at chromeRoot.
    // chromeRoot cannot end at /content, it has to have something after that.
    // (if you end in /content/, use parent to undo the convertToChromeURL file portion shorthand .parent;)
    start: function(chromeRoot)
    {
        cache.evictEntries(Ci.nsICache.STORE_ON_DISK);
        cache.evictEntries(Ci.nsICache.STORE_IN_MEMORY);

        this.localDir = this.chromeToPath(chromeRoot);
        this.path = "http://localhost:" + serverPort + "/";

        this.getServer().registerDirectory("/", this.localDir);

        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.TestServer.registerDirectory: " + this.path + " => " +
                this.localDir.path);

        return true;
    },

    stop: function()
    {
        if (this.server)
            this.server.stop();

        this.server = null;
    },

    restart: function(chromeRoot)
    {
        if (FBTrace.DBG_FBTEST)
            FBTrace.sysout("fbtest.TestServer.restart; " + chromeRoot);

        FBTestApp.TestServer.stop();
        FBTestApp.TestServer.start(chromeRoot);
    },

    getTestCaseRootPath: function()
    {
        return this.path;
    },

    getServer: function()
    {
        if (!this.server)
        {
            this.server = new nsHttpServer();
            this.server.start(serverPort);

            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.TestServer.getServer HTTP server started");
        }
        return this.server;
    },

    chromeToPath: function (aPath)
    {
        try
        {
            if (!aPath || !(/^chrome:/.test(aPath)))
                return this.urlToPath( aPath );

            var ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci["nsIIOService"]);
            var uri = ios.newURI(aPath, "UTF-8", null);
            var cr = Cc['@mozilla.org/chrome/chrome-registry;1'].getService(Ci["nsIChromeRegistry"]);
            var rv = cr.convertChromeURL(uri).spec;

            if (/content\/$/.test(aPath)) // fix bug  in convertToChromeURL
            {
                var m = /(.*\/content\/)/.exec(rv);
                if (m)
                    rv = m[1];
            }

            if (/^file:/.test(rv))
                rv = this.urlToPath(rv);
            else
                rv = this.urlToPath("file://"+rv);

            return rv;
        }
        catch (err)
        {
            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.TestServer.chromeToPath EXCEPTION", err);
        }

        return null;
    },

    urlToPath: function (aPath)
    {
        try
        {
            if (!aPath || !/^file:/.test(aPath))
                return;

            return Cc["@mozilla.org/network/protocol;1?name=file"]
                      .createInstance(Ci.nsIFileProtocolHandler)
                      .getFileFromURLSpec(aPath);
        }
        catch (e)
        {
            throw new Error("urlToPath fails for "+aPath+ " because of "+e);
        }
    },

    chromeToUrl: function (aPath, aDir)
    {
        try
        {
            if (!aPath || !(/^chrome:/.test(aPath)))
                return this.pathToUrl(aPath);

            var uri = ios.newURI(aPath, "UTF-8", null);
            var rv = chromeRegistry.convertChromeURL(uri).spec;
            if (aDir)
                rv = rv.substr(0, rv.lastIndexOf("/") + 1);

            if (/content\/$/.test(aPath)) // fix bug  in convertToChromeURL
            {
                var m = /(.*\/content\/)/.exec(rv);
                if (m)
                    rv = m[1];
            }

            if (!/^file:/.test(rv))
                rv = this.pathToUrl(rv);

            return rv;
        }
        catch (err)
        {
            if (FBTrace.DBG_FBTEST)
                FBTrace.sysout("fbtest.TestServer.chromeToUrl EXCEPTION", err);
        }

        return null;
    },

    pathToUrl: function(aPath)
    {
        try
        {
            if (!aPath || !(/^file:/.test(aPath)))
                return aPath;

            var uri = ios.newURI(aPath, "UTF-8", null);
            return Cc["@mozilla.org/network/protocol;1?name=file"]
                .createInstance(Ci.nsIFileProtocolHandler)
                .getURLSpecFromFile(uri).spec;
        }
        catch (e)
        {
            throw new Error("urlToPath fails for "+aPath+ " because of "+e);
        }
    },
    // *************************************************************************************

    observe: function(subject, topic, data)
    {
        subject = subject.wrappedJSObject;

        if (topic != "fbtest")
            return;

        if (data == "initialize")
        {
            // Some initialization steps for extensions.
        }
        if (data == "shutdown")
        {
            FBTestApp.TestServer.stop();
        }
        else if (data == "restart")
        {
            // Don't start httpd.js server if the driverBaseURI is already using http protocol
            FBTrace.sysout("testServer "+subject.driverBaseURI, subject);
            if (subject.driverBaseURI.indexof("http") == 0)
                return;

            // Restart server with new home directory using a file: url
            var serverBaseURI = FBTestApp.TestServer.chromeToUrl(subject.driverBaseURI, true);
            if (!serverBaseURI)
            {
                FBTestApp.TestServer.stop();
                FBTrace.sysout("Cannot access test files via baseURI conversion to http URL. " +
                    "Verify 'driverBaseURI' in the config file and that it points to a valid directory!\n\n" +
                    "current config file: " + subject.testListPath + "\n" +
                    "driverBaseURI: " + subject.driverBaseURI + "\n");
                return;
            }

            FBTestApp.TestServer.restart(serverBaseURI);
        }
    },

};

observerService.addObserver(FBTestApp.TestServer, "fbtest", false);

// ************************************************************************************************
}});
