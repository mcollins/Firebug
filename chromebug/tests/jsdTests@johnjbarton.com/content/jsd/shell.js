



var TestJSD = {
        
	extend: function(l, r)
	{
	    var newOb = {};
	    for (var n in l)
	        newOb[n] = l[n];
	    for (var n in r)
	        newOb[n] = r[n];
	    return newOb;
	},

    getHiddenWindow: function()
    {
		if (!this.appShellService)
			this.appShellService = Components.classes["@mozilla.org/appshell/appShellService;1"].getService(Components.interfaces.nsIAppShellService);
		
        return this.appShellService.hiddenDOMWindow;
    },
    
    startJSD: function(win)
    { 
    	netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
        var DebuggerService = Components.classes["@mozilla.org/js/jsd/debugger-service;1"];
        var jsdIDebuggerService = Components.interfaces["jsdIDebuggerService"]
        jsd = DebuggerService.getService(jsdIDebuggerService);

		if (jsd)
			log("Found jsdIDebuggerService\n");
		else
			throw "No jsdIDebuggerService";

        if (jsd.isOn)
             log("chromebug_command_line gets jsd service, isOn:"+jsd.isOn+" initAtStartup:"+jsd.initAtStartup+"\n");        

        jsd.on();
        jsd.flags |= jsdIDebuggerService.DISABLE_OBJECT_TRACE;

        log("jsd service, isOn:"+jsd.isOn+" initAtStartup:"+jsd.initAtStartup+"\n");         
        return jsd;
    },

    setHooks: function(jsd, win)
    {
        jsd.errorHook =
        {
            onError: function(message, fileName, lineNo, pos, flags, errnum, exc)
            {
                win.dump("errorHook: "+message+"@"+ fileName +"."+lineNo+"\n");
                return true;
            }
        }; 
    },

    removeHooks: function(jsd, win)
    {
        jsd.errorHook = null;
        log("hooks removed\n");
    },
    
    before: function(win)
    {
    	this.jsd = this.startJSD(win);
    	this.setHooks(this.jsd, win);
    },
    
    after: function(win)
    {
        if (TestJSD.waiter && TestJSD.waiter())
        {
            TestJSD.removeHooks(this.jsd, win);
            clearInterval(TestJSD.afterInterval);
        }
        else
            TestJSD.removeHooks(this.jsd, win);
    },
    
    doTest: function(win, prefix)
    {
    	var spec = win.location.toString();
    	if (spec.indexOf("http") == -1)
    		this.before(win);
    	
    	output.heading(prefix);
    	try {
    	    TestJSD.waiter = this.test(win);  
    	    log("TestJSD.waiter "+TestJSD.waiter)  	     
    	}
    	catch(exc)
    	{
    	    output.report(false, "", exc);
    	}
    	
    	if (spec.indexOf("http") == -1)
    	{
    	    if (TestJSD.waiter)
    	        TestJSD.afterInterval = setInterval(this.after, 200, win);
    	    else
    	        this.after(win);
    	}
    },
}
