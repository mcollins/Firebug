

var Test462704 = TestJSD.extend
(
	TestJSD, 
	{
		setHooks: function(jsd, win)
		{
			TestJSD.setHooks(jsd, win);
			log("window is "+win.location+"\n");
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
						log(lineOut+"|"+lines[i]);
					}
					if (script.functionName == "b462704Spoiled")
						output.report(script.lineExtent == 4, script.functionName+" lineExtent correct", script.functionName+" lineExtent ("+script.lineExtent+") incorrect");
					if (script.functionName == "b462704WhileEndsMethod")
						output.report(script.lineExtent == 4, script.functionName+" lineExtent correct", script.functionName+" lineExtent ("+script.lineExtent+") incorrect");
				},
				
				onScriptDestroyed: function(script)
				{
					log("script destroyed "+script.tag+" "+script.fileName+"\n");
				},
			};
		},
		
	    removeHooks: function(jsd, win)
	    {
	        jsd.scriptHook = null;
	        TestJSD.removeHooks(jsd, win);
	    },
	    
	    test: function()
	    {
	        var worksFunction = "function b462704Spoiled() { var x = false; \n while(x) { \nbreak;\n } var spoiler = 2; }";
	        var failsFunction = "function b462704WhileEndsMethod() { var x = false; \n while(x) { \nbreak;\n }                  }";    
	        var evalResult = eval(worksFunction);
	        var evalResult = eval(failsFunction);
	    }
	}
);

function test()
{
	Test462704.doTest(window, "<a href='https://bugzilla.mozilla.org/show_bug.cgi?id=462704'>bugzilla 462704</a>");
}

