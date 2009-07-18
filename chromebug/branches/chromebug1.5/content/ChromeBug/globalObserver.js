/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ***********************************************************************************
// Shorcuts and Services

const Cc = Components.classes;
const Ci = Components.interfaces;

const nsIObserverService = Ci.nsIObserverService
const observerService = CCSV("@mozilla.org/observer-service;1", "nsIObserverService");

//************************************************************************************************
Chromebug.globalObserver = 
{
    observe: function(subject, topic, data)
    {
        if (topic == 'domwindowopened')
        {
            try
            {
                if (subject instanceof nsIDOMWindow)
                {
                    if (FBTrace.DBG_CHROMEBUG || FBTrace.DBG_WINDOWS) FBTrace.sysout("Chromebug.globalObserver found domwindowopened "+subject.location+"\n");
                    
                }
            }
            catch(exc)
            {
                FBTrace.sysout("Chromebug.globalObserver notify console opener FAILED ", exc);
            }
        }
        else if (topic == 'domwindowclosed') // Apparently this event comes before the unload event on the DOMWindow
        {
            if (subject instanceof nsIDOMWindow)
            {
                //if (FBTrace.DBG_WINDOWS)
                    FBTrace.sysout("Chromebug.globalObserver found domwindowclosed "+subject.location+getStackDump());
                if (subject.location.toString() == "chrome://chromebug/content/chromebug.xul")
                    throw new Error("Chromebug.globalObserver should not find chromebug.xul");
            }
        }
        else if (topic == 'dom-window-destroyed')  // subject appears to be the nsIDOMWindow with a location that is invalid and closed == true; data null
        {
            if (FBTrace.DBG_WINDOWS)
                FBTrace.sysout("Chromebug.globalObserver found dom-window-destroyed subject:", subject);
        }
    },

};

observerService.addObserver(Chromebug.globalObserver, "domwindowopened", false);
observerService.addObserver(Chromebug.globalObserver, "domwindowclosed", false);
observerService.addObserver(Chromebug.globalObserver, "dom-window-destroyed", false);

// ************************************************************************************************
    
Chromebug.ObserverServiceModule = extend(Firebug.Module,
{
    dispatchName: "observerService",

    initialize: function(prefDomain, prefNames)  // the prefDomain is from the app, eg chromebug
    {
        if (FBTrace.DBG_CB_CONSOLE)
            FBTrace.sysout("cb.ObserverServiceModule.initialize, prefDomain (ignored): " + prefDomain);

        traceService.addObserver(this, "firebug-trace-on-message", false);
    },

    shutdown: function()
    {
        if (FBTrace.DBG_CB_CONSOLE)
            FBTrace.sysout("cb.ObserverServiceModule.shutdown, prefDomain: " + prefDomain);

        traceService.removeObserver(this, "firebug-trace-on-message");
    }, 
    
    initContext: function(context)  // use these to check the tracking of windows to contexts
    {
        if (FBTrace.DBG_CB_CONSOLE)
            FBTrace.sysout("cb.TraceConsoleModule.initContext; " +
                context.getName() + " - " + context.getTitle());

        if (this.tracePanel)  // one per app
            context.setPanel(this.tracePanel.name, this.tracePanel);
        else
            this.tracePanel = this.createTracePanel(context);
    },

    destroyContext: function(context)
    {
        if (FBTrace.DBG_CB_CONSOLE)
            FBTrace.sysout("cb.TraceConsoleModule.destroyContext; " +
                context.getName() + " - " + context.getTitle());

        // unpoint from this context to our panel so its not destroyed.
        if (this.tracePanel)
            context.setPanel(this.tracePanel.name, null);
        FBTrace.sysout("tracePanel.destroyContext unhooking from "+context.getName());
    },
    // nsIObserver
    observe: function(subject, topic, data)
    {
        if (topic == "firebug-trace-on-message")
        {
            // Display messages only with "extensions.firebug" type.
            var messageInfo = subject.wrappedJSObject;

            // type is controlled by FBTrace.prefDomain in the XULWindow that sent the trace message
            if (messageInfo.type != "extensions.firebug")  // TODO selectable
                return;

            if (this.tracePanel)
            {
                this.tracePanel.dump(new Firebug.TraceModule.TraceMessage(
                        messageInfo.type, data, messageInfo.obj, messageInfo.scope));
                return false;
            }
            return false;
        }
    },

    clearPanel: function(context)
    {
        if (this.tracePanel)
            this.tracePanel.clear();
        else
            FBTrace("tracePanel.clearPanel no this.tracePanel");
    },
}

//************************************************************************************************

Chromebug.ObserverServicePanel = function() {}

Chromebug.ObserverServicePanel.prototype = extend(Firebug.Panel,
{
    
});

//************************************************************************************************
Firebug.registerPanel(Chromebug.ObserverServicePanel);

}});