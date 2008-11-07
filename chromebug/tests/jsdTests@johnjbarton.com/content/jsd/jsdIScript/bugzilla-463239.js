log("463239\n");
 
var Test463239 = TestJSD.extend
(
	TestJSD, 
	{
		setHooks: function(jsd, win)
		{
			TestJSD.setHooks(jsd, win);
			log("setHooks window is "+win.location+"\n");
			jsd.scriptHook =
			{
				onScriptCreated: function(script)
				{
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
					if (script.functionName == 'b463239')
					{
						Test463239.scriptForb463239 = script;
						log("set Test463239.scriptForb463239\n")
					}
				},
				
				onScriptDestroyed: function(script)
				{
					log("script destroyed "+script.tag+" "+script.fileName+"\n");
				},
			};
			jsd.breakpointHook = 
			{ 
				onExecute: function breakpointHook(frame, type, rv)
	        	{
					log("breakpointHook: "+type+" line "+frame.line+" pc:"+frame.pc+"\n");
					log("script: "+frame.script.functionSource+"\n");
					return 1;
	        	}
			};
		},
		
	    removeHooks: function(jsd, win)
	    {
	        jsd.scriptHook = null;
	        jsd.interruptHook = null;
	        TestJSD.removeHooks(jsd, win);
	    },
	    
	    test: function()
	    {
	    	/*
	    	var src = "function b463239(aObject)";  
	    	src += "{\n"; 
	    	src += "	var result = null;\n";
	    	src += "	if (aObject.aString === 'Hello World')\n"; 
	    	src += "		result = true;\n";
	    	src += "	else\n";
	    	src += "		result = false;\n";
	    	src += "\n"	
	    	src += "	output.report(result, 'b463239 is correct', 'b463239 === test fails');\n";
	    	src += "\n}"
	    	*/
	    	var src = "function b463239() {\n";
	        src+= "try\n";
	        src+= "{\n";
	            //var ex = {fileName: "foo", lineNumber: 6};  // If we throw this object, no bug.
	        src+= "    throw new Error('Test Exception');\n";
	        src+= "}\n";
	        src+= "catch(ex)\n";
	        src+= "{\n";
	        src+= "    var condition  = (ex.fileName != null) && (ex.lineNumber != null); // Set a breakpoint here.\n";
	        //src+= "    \n";
	        src+= "    output.report(condition, 'success', 'failed');\n";
	        src+= "}\n";
	        src+= "}\n";
	    	eval(src);

	    	var script = Test463239.scriptForb463239;
	    	if (script)
	    	{
	    		log("scriptForb463239:"+ script.tag+"\n");
	    		log("scriptForb463239:"+ script.baseLineNumber+"-"+script.lineExtent+"\n");
	    		for (var i = 0; i < script.lineExtent; i++)
	    		{
	    			var jsdLine = i + script.baseLineNumber;
	    			var pc = script.lineToPc(jsdLine, 1);
	    			log(jsdLine+" = "+pc+"\n");
	    		}
	    		script.setBreakpoint(21);
	    	}
	    	b463239({aString: "Hello World"});
	    	log("test 463239\n");
	    }
	}
);

function test()
{
	Test463239.doTest(window, "<a href='https://bugzilla.mozilla.org/show_bug.cgi?id=463239'>bugzilla 463239</a>");
}

 