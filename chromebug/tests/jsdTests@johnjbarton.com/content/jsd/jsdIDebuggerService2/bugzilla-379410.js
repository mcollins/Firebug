 
 
var Test379410 = TestJSD.extend
(
    TestJSD, 
    {
        onScriptsCreated: {},  // All scripts coming through onScriptCreated
        onScriptsCompiled: {}, // All scripts coming through onCompilation
        
        setHooks: function(jsd, win)
        {
            TestJSD.setHooks(jsd, win);
            log("setHooks window is "+win.location+"\n");
            jsd.scriptHook =
            {
                onScriptCreated: function(script)
                {
                    Test379410.onScriptsCreated[script.tag] = script;
                    log("script created "+script.tag+" "+script.functionName+": "+script.baseLineNumber+"-"+script.lineExtent+":"+script.fileName+"\n");
                    var lines = script.functionSource.split("\n");
                    var lineNo = script.baseLineNumber;
                    for (var i = 0; i < lines.length; i++)
                    {
                        var lineOut = lineNo + i;
                        if (i > script.lineExtent) lineOut += "X";
                        else lineOut +=" ";
                        log(lineOut+"|"+lines[i]+"\n");
                    }
                    if (script.functionName == 'b379410')
                    {
                        Test379410.scriptForb379410 = script;
                        log("set Test379410.scriptForb379410\n")
                    }
                },
                
                onScriptDestroyed: function(script)
                {
                    log("script destroyed "+script.tag+" "+script.fileName+"\n");
                },
            };
            
            if (this.hasJSD < 2)
                return;
            
            jsd.compilationHook = 
            {
                onCompilation: function(frame, compilationUnitType, outerScript)
                {
                    Test379410.onScriptsCompiled[outerScript.tag] = outerScript;
                    log("onCompilation type:"+compilationUnitType+"\n");
                    log("outerScript: "+outerScript.tag);
                    log("innerScripts: ");
                    var hiddenWindow = Test379410.getHiddenWindow();
                    hiddenWindow.onScriptCompiled = [];
                    jsd.enumerateCompiledScripts(
                    {
                        enumerateScript: function sayIt(script)
                        {
                            var hw = Components.classes["@mozilla.org/appshell/appShellService;1"].getService(Components.interfaces.nsIAppShellService).hiddenDOMWindow;
                            hw.onScriptCompiled.push(script);
                            log(script.tag+", ");
                        }
                    });
                    for (var i = 0; i < hiddenWindow.onScriptCompiled.length; i++)
                        Test379410.onScriptsCompiled[hiddenWindow.onScriptCompiled[i].tag] = hiddenWindow.onScriptCompiled[i];
                },
            }; 
        },
        
        removeHooks: function(jsd, win)
        {
            jsd.scriptHook = null;
            jsd.interruptHook = null;
            jsd.compilationHook = null;
            TestJSD.removeHooks(jsd, win);
            //Test379410.doAccounting();
        },
        
        doAccounting: function()
        {
            log("doAccounting");
            for (var tag in Test379410.onScriptsCreated)
            {
                if (tag in Test379410.onScriptsCompiled)
                {
                    log("Found script "+tag+" in both lists");
                    delete Test379410.onScriptsCompiled[tag];
                    delete Test379410.onScriptsCreated[tag];
                }
                else
                {
                    output.report( (tag in Test379410.onScriptsCompiled), "379410 Found script "+tag+" in both lists", "379410 FAILED: Script "+tag+" Not in onCompilation list");
                }
            }
            for (var tag in Test379410.onScriptsCompiled)
            {
                output.report( (tag in Test379410.onScriptsCreated),  "379410 Found script "+tag+" in both lists", "379410 FAILED: Script "+tag+" Not in onScriptCreated list");
            }
            Test379410.done = true;
        },
        
        waitFor: function()
        {
            log("Test379410.waitFor "+Test379410.done+"\n");
            return Test379410.done;
        },
        
        test: function()
        {
            Test379410.done = false;
            var iframe = document.createElement('iframe');
            iframe.setAttribute("id", "t379410");
            var body = document.getElementsByTagName('body')[0];
            body.appendChild(iframe);
            
            iframe.addEventListener('load', this.doAccounting, true);
             
            iframe.setAttribute("src", "jsd/jsdIDebuggerService2/createScripts.html");
            
            window.dump("test 379410 exit\n");
            
            return this.waitFor;
        }
    }
);

function test()
{
    Test379410.doTest(window, "<a href='https://bugzilla.mozilla.org/show_bug.cgi?id=379410'>bugzilla 379410</a>");
}

 