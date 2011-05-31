/* See license.txt for terms of usage */

define([
    "firebug/lib/xpcom",
    "firebug/lib/trace",
    "firebug/net/httpLib",
],
function(Xpcom, FBTrace, Http) {

// ********************************************************************************************* //
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
var categoryManager = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);

// ********************************************************************************************* //
// HTTP Request Observer implementation

/**
 * @service This service is intended as the only HTTP observer registered by Firebug.
 * All FB extensions and Firebug itself should register a listener within this
 * service in order to listen for http-on-modify-request, http-on-examine-response and
 * http-on-examine-cached-response events.
 *
 * See also: <a href="http://developer.mozilla.org/en/Setting_HTTP_request_headers">
 * Setting_HTTP_request_headers</a>
 */
var HttpRequestObserver =
/** lends HttpRequestObserver */
{
    observers: [],
    observing: false,

    registerObservers: function()
    {
        if (FBTrace.DBG_HTTPOBSERVER)
            FBTrace.sysout("httpObserver.registerObservers; wasObserving: " +
                this.observing + " with observers "+this.observers.length, this.observers);

        if (!this.observing)
        {
            observerService.addObserver(this, "http-on-modify-request", false);
            observerService.addObserver(this, "http-on-examine-response", false);
            observerService.addObserver(this, "http-on-examine-cached-response", false);
        }

        this.observing = true;
    },

    unregisterObservers: function()
    {
        if (FBTrace.DBG_HTTPOBSERVER)
            FBTrace.sysout("httpObserver.unregisterObservers; wasObserving: " +
                this.observing + " with observers "+this.observers.length, this.observers);

        if (this.observing)
        {
            observerService.removeObserver(this, "http-on-modify-request");
            observerService.removeObserver(this, "http-on-examine-response");
            observerService.removeObserver(this, "http-on-examine-cached-response");
        }

        this.observing = false;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // nsIObserver

    observe: function(subject, topic, data)
    {
        try
        {
            if (!(subject instanceof Ci.nsIHttpChannel))
                return;

            if (FBTrace.DBG_HTTPOBSERVER)
                FBTrace.sysout("httpObserver.observe " + (topic ? topic.toUpperCase() : topic) +
                    ", " + Http.safeGetRequestName(subject));

            // Notify all registered observers.
            if (topic == "http-on-modify-request" ||
                topic == "http-on-examine-response" ||
                topic == "http-on-examine-cached-response")
            {
                this.notifyObservers(subject, topic, data);
            }
        }
        catch (err)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("httpObserver.observe EXCEPTION", err);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // nsIObserverService

    addObserver: function(observer, topic, weak)
    {
        if (!topic)
            topic = "firebug-http-event";

        if (topic != "firebug-http-event")
            throw Cr.NS_ERROR_INVALID_ARG;

        // Do not add an observer twice.
        for (var i=0; i<this.observers.length; i++)
        {
            if (this.observers[i] == observer)
            {
                // xxxHonza: firebug/debugger is registering itself more times,
                // not sure if it's on purpose, but it causes following error message:
                // Error: attempt to run compile-and-go script on a cleared scope
                // (on the first line of the observe method)
                if (FBTrace.DBG_HTTPOBSERVER || FBTrace.DBG_ERRORS)
                    FBTrace.sysout("httpObserver.addObserver; Observer already registered.",
                        observer);
                return;
            }
        }

        this.observers.push(observer);

        if (this.observers.length > 0)
            this.registerObservers();
    },

    removeObserver: function(observer, topic)
    {
        if (!topic)
            topic = "firebug-http-event";

        if (topic != "firebug-http-event")
            throw Cr.NS_ERROR_INVALID_ARG;

        for (var i=0; i<this.observers.length; i++)
        {
            if (this.observers[i] == observer)
            {
                this.observers.splice(i, 1);

                if (this.observers.length == 0)
                    this.unregisterObservers();

                return;
            }
        }

        if (FBTrace.DBG_HTTPOBSERVER || FBTrace.DBG_ERRORS)
            FBTrace.sysout("httpObserver.removeObserver FAILED (no such observer)");
    },

    notifyObservers: function(subject, topic, data)
    {
        if (FBTrace.DBG_HTTPOBSERVER)
            FBTrace.sysout("httpObserver.notifyObservers (" + this.observers.length + ") " + topic);

        for (var i=0; i<this.observers.length; i++)
        {
            var observer = this.observers[i];
            try
            {
                if (observer.observe)
                    observer.observe(subject, topic, data);
            }
            catch (err)
            {
                if (FBTrace.DBG_HTTPOBSERVER)
                    FBTrace.sysout("httpObserver.notifyObservers; EXCEPTION " + err, err);
            }
        }
    }
}

// ********************************************************************************************* //
// Registration

return HttpRequestObserver;

// ********************************************************************************************* //
});
