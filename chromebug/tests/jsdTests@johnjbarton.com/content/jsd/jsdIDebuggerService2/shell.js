

TestJSD.parentStartJSD = TestJSD.startJSD;

TestJSD.startJSD = function(win)  // override 
    {
    	netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
        var DebuggerService = Components.classes["@mozilla.org/js/jsd/debugger-service;1"];
        try 
        {
            var jsdIDebuggerService2 = Components.interfaces["jsdIDebuggerService2"]
                                                             
            var jsd = DebuggerService.getService(jsdIDebuggerService2);

            if (jsd)
                log("Found jsdIDebuggerService2\n");
            else
                throw "No jsdIDebuggerService2";

            this.hasJSD = 2;
            
            if (jsd.isOn)
                log("startJSD gets jsd service, isOn:"+jsd.isOn+" initAtStartup:"+jsd.initAtStartup+"\n");        

            jsd.on();
            jsd.flags |= jsdIDebuggerService.DISABLE_OBJECT_TRACE;

            log("jsd service, isOn:"+jsd.isOn+" initAtStartup:"+jsd.initAtStartup+"\n");         
            return jsd;
        } 
        catch (exc)
        {
            this.hasJSD = 1;
            return this.parentStartJSD(win);
        }
    } 
