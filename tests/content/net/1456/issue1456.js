window.FBTestTimeout = 13000; // override the default test timeout [ms].

function runTest()
{
	var startTime = new Date().getTime();
    FBTest.sysout("issue1456.START");
    var responseText = "$('tb').shake();\n$('tb').value='Some Response';\n";

    FBTestFirebug.openNewTab(basePath + "net/1456/issue1456.htm", function(win)
    {
    	var time = new Date().getTime();
    	FBTest.progress("opened "+win.location+" at "+ (time - startTime)+"ms");
        // Open Firebug UI and enable Net panel.
        FBTestFirebug.enableNetPanel(function(win)
        {
        	var time = new Date().getTime();
        	FBTest.progress("enabled net panel at "+ (time - startTime)+"ms");

        	win.wrappedJSObject.runTest(function(response)
            {
            	var time = new Date().getTime();
            	FBTest.progress("onResponse at "+ (time - startTime)+"ms");

        		FBTest.sysout("issue1456.onResponse: ", response);

                // Expand the test request with params
                var panelNode = FW.FirebugChrome.selectPanel("net").panelNode;
                FBTestFirebug.expandElements(panelNode, "netRow", "category-xhr", "hasHeaders", "loaded");
                FBTestFirebug.expandElements(panelNode, "netInfoResponseTab");

                // The response must be displayed.
                var responseBody = FW.FBL.getElementByClass(panelNode, "netInfoResponseText",
                    "netInfoText");

                FBTest.ok(responseBody, "Response tab must exist.");
                if (responseBody)
                {
                    // Get response text properly formatted from the response tab.
                    var lines = [];
                    var children = responseBody.firstChild.childNodes;
                    for (var i=0; i<children.length; i++)
                        lines.push(children[i].textContent);

                    FBTest.compare(responseText, lines.join(""), "Response must match.");
                }

            	var time = new Date().getTime();
            	FBTest.progress("done at "+ (time - startTime)+"ms");

                // Finish test
                FBTestFirebug.testDone("issue1456.DONE");
            })
        });
    })
}
