window.dump("379410\n");
 
var Test379410 = TestJSD.extend
(
    TestJSD, 
    {
        onScriptsCreated: [],  // All scripts coming through onScriptCreated
        onScriptsCompiled: [], // All scripts coming through onCompilation
        
        setHooks: function(jsd, win)
        {
            TestJSD.setHooks(jsd, win);
            log("setHooks window is "+win.location+"\n");
            jsd.scriptHook =
            {
                onScriptCreated: function(script)
                {
                    Test379410.onScriptsCreated.push(script.tag);
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
                    Test379410.onScriptsCompiled.push(outerScript.tag);
                    log("onCompilation type:"+compilationUnitType+"\n");
                    log("outerScript: "+outerScript.tag);
                    log("innerScripts: ");
                    jsd.enumerateCompiledScripts(
                    {
                        enumerateScript: function sayIt(script)
                        {
                            Test379410.onScriptCompiled.push(script.tag);
                            log(script.tag+", ");
                        }
                    });
                },
            }; 
        },
        
        removeHooks: function(jsd, win)
        {
            jsd.scriptHook = null;
            jsd.interruptHook = null;
            TestJSD.removeHooks(jsd, win);
            Test379410.doAccounting();
        },
        
        doAccounting: function()
        {
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
                    output.report( (tag in Test379410.onScriptsCompiled), "Found script "+tag+" in both lists", "Script "+tag+" Not in onCompilation list");
                }
            }
            for (var tag in Test379410.onScriptsCompiled)
            {
                output.report( (tag in Test379410.onScriptsCreated),  "Found script "+tag+" in both lists", "Script "+tag+" Not in onScriptCreated list");
            }
        },
        
        test: function()
        {
            var testFunction = "function testForScriptCreation() { return true; }";
            var evalResult = eval(testFunction);
            
            var script = Test379410.scriptForb379410;
            if (script)
            {
                window.dump("scriptForb379410:"+ script.tag+"\n");
                window.dump("scriptForb379410:"+ script.baseLineNumber+"-"+script.lineExtent+"\n");
                for (var i = 0; i < script.lineExtent; i++)
                {
                    var jsdLine = i + script.baseLineNumber; 
                    var pc = script.lineToPc(jsdLine, 1);
                    window.dump(jsdLine+" = "+pc+"\n");
                }
                script.setBreakpoint(21);
            }
            testForScriptCreation();
            window.dump("test 379410\n");
        }
    }
);

function test()
{
    Test379410.doTest(window, "<a href='https://bugzilla.mozilla.org/show_bug.cgi?id=379410'>bugzilla 379410</a>");
}

 