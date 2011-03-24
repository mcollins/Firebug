// Test entry point.
function runTest()
{	
	FBTest.sysout("subscribe_parameters test START");
	
	FBTest.openURL(basePath + "subscribe_parameters.html", function(win) {
		FBTest.openFirebug();
	    FBTest.enableAllPanels();
	    
		FBTest.reload(function(win){
			win = FBTest.FirebugWindow.FBL.unwrapObject(win);
			var panel = FW.FirebugChrome.selectPanel("dojofirebugextension"); //get our panel
			var context = FW.Firebug.currentContext; //context!
			
			try {
		    	var api = context.connectionsAPI;
		    	var d = win.dojo;
		    	
		    	var globalTestFunc = win.globalTestFunc;
				var objTest = win.objTest;
		    	
		    	verify(api, "Test1", d.global, "globalTestFunc");
		    	//verify(api, "Test2", d, globalTestFunc);
		    	verifyForDojoObj(api, "Test2", globalTestFunc);
		    	verify(api, "Test3", objTest, "testF");
		    	verify(api, "Test4", objTest, objTest.testF);
		    	verify(api, "Test5", d.global, "globalTestFunc");
		    	//verify(api, "Test6", d, globalTestFunc);
		    	verifyForDojoObj(api, "Test6", globalTestFunc);

			} catch (err) {
		        FBTest.exception("Test: ", err);
		    } finally {
		        FBTest.testDone();
		    }	
		});
	});
}

function verify(api, topic, expectedScope, expectedMethod){
	var sub = getSubscrition(api, topic);
	FBTest.compare(expectedScope, sub.context, "For topic " + topic + " the scope is the expected one.");
	FBTest.compare(expectedMethod, sub.method, "For topic " + topic + " the method is the expected one.");
}

//FIXME: the verify method does not work for dojo object. ??
function verifyForDojoObj(api, topic, expectedMethod){
	var sub = getSubscrition(api, topic);

	//FIXME compare against actual "dojo" object , instead of checking for obj with connect and subscribe method to assume dojo obj!  
	FBTest.ok(sub.context && sub.context.connect && sub.context.subscribe, "For topic " + topic + " the expected scope is dojo.");
	FBTest.compare(expectedMethod, sub.method, "For topic " + topic + " the method is the expected one.");
}

function getSubscrition(api, topic){
	return api.subscriptionsForTopic(topic)[0];
}

function applyTests(context) {

}
