// Test entry point.
function runTest()
{	
	setPreferences();
	
	FBTest.sysout("connect_parameters test START");
	
	FBTest.openURL(basePath + "connect_parameters.html", function(win) {
		FBTest.openFirebug();
	    FBTest.enableAllPanels();
	    enableDojoPanel();
	    
		FBTest.reload(function(win){
			win = FBTest.FirebugWindow.FBL.unwrapObject(win);
			var panel = FW.FirebugChrome.selectPanel("dojofirebugextension"); //get our panel
			var context = FW.Firebug.currentContext; //context!
			
			try {
		    	var api = context.connectionsAPI;
		    	var d = win.dojo;
		    	
		    	//FIXME: I use the first obj in the list of objects with conns (that should be window), instead of use win
		    	//because for an unknown reason the connections cannot be obtained using that reference.
		    	var dojoGlobal = api.getObjectsWithConnections()[0];
		    	var objConnHandlerTest = win.objConnHandlerTest;
		    	var objConnTargetTest = win.objConnTargetTest;

		    	verifyConnection(api, dojoGlobal, "methodGlobal1", dojoGlobal, "methodGlobal2", 'dojo.connect("methodGlobal1", "methodGlobal2");');
				verifyConnection(api, dojoGlobal, "methodGlobal2", dojoGlobal, dojoGlobal.methodGlobal1, 'dojo.connect("methodGlobal2", methodGlobal1);');
				verifyConnection(api, dojoGlobal, "methodGlobal3", dojoGlobal, "methodGlobal4", 'dojo.connect(null, "methodGlobal3", "methodGlobal4");');
				verifyConnection(api, dojoGlobal, "methodGlobal4", dojoGlobal, dojoGlobal.methodGlobal3, 'dojo.connect(null, "methodGlobal4", methodGlobal3);');
				verifyConnection(api, dojoGlobal, "methodGlobal5", dojoGlobal, "methodGlobal6", 'dojo.connect("methodGlobal5", null, "methodGlobal6");');
				verifyConnection(api, dojoGlobal, "methodGlobal6", dojoGlobal, dojoGlobal.methodGlobal5, 'dojo.connect("methodGlobal6", null, methodGlobal5);');
				verifyConnection(api, dojoGlobal, "methodGlobal7", dojoGlobal, "methodGlobal8", 'dojo.connect(null, "methodGlobal7", null, "methodGlobal8");');
				verifyConnection(api, dojoGlobal, "methodGlobal8", dojoGlobal, dojoGlobal.methodGlobal7, 'dojo.connect(null, "methodGlobal8", null, methodGlobal7);');
				verifyConnection(api, dojoGlobal, "methodGlobal9", objConnHandlerTest, "methodHandler1", 'dojo.connect(null, "methodGlobal9", objConnHandlerTest, "methodHandler1");');
				verifyConnection(api, dojoGlobal, "methodGlobal10", objConnHandlerTest, objConnHandlerTest.methodHandler2, 'dojo.connect(null, "methodGlobal10", objConnHandlerTest, objConnHandlerTest.methodHandler2);');
				verifyConnection(api, objConnTargetTest, "method1", dojoGlobal, "methodGlobal11", 'dojo.connect(objConnTargetTest, "method1", "methodGlobal11");');
				verifyConnection(api, objConnTargetTest, "method2", objConnTargetTest, dojoGlobal.methodGlobal12, 'dojo.connect(objConnTargetTest, "method2", methodGlobal12);');
				verifyConnection(api, objConnTargetTest, "method3", dojoGlobal, "methodGlobal13", 'dojo.connect(objConnTargetTest, "method3", null, "methodGlobal13");');
				verifyConnection(api, objConnTargetTest, "method4", objConnTargetTest, dojoGlobal.methodGlobal14, 'dojo.connect(objConnTargetTest, "method4", null, methodGlobal14);');
				verifyConnection(api, objConnTargetTest, "method5", objConnHandlerTest, "methodHandler3", 'dojo.connect(objConnTargetTest, "method5", objConnHandlerTest, "methodHandler3");');
				verifyConnection(api, objConnTargetTest, "method6", objConnHandlerTest, objConnHandlerTest.methodHandler4, 'dojo.connect(objConnTargetTest, "method6", objConnHandlerTest, objConnHandlerTest.methodHandler4);');
				verifyConnection(api, dojoGlobal, "unexistentMethod", objConnHandlerTest, "methodHandler5", 'dojo.connect("unexistentMethod", objConnHandlerTest, "methodHandler5");');
				
			} catch (err) {
		        FBTest.exception("Test: ", err);
		    } finally {
		        FBTest.testDone();
		    }	
		});
	});
}

function verifyConnection(api, obj, event, context, method, connectionStatement){
	var conInc = api.getConnection(obj).getIncommingConnectionsForEvent(event)[0];
	var conOut = api.getConnection(context).getOutgoingConnectionsForMethod(method)[0];
	FBTest.compareHash(conInc, conOut, "Connection registered for statement: '" + connectionStatement + "'.");
}

function applyTests(context) {

}
