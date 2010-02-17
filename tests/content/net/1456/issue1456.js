window.FBTestTimeout = 13000; // override the default test timeout [ms].

function runTest()
{
    FBTest.sysout("issue1456.START");
    var responseText = "$('tb').shake();\n$('tb').value='Some Response';\n";

    FBTestFirebug.openNewTab(basePath + "net/1456/issue1456.htm", function(win)
    {
        // Open Firebug UI and enable Net panel.
        FBTestFirebug.enableNetPanel(function(win)
        {
            win.wrappedJSObject.runTest(function(response)
            {
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

                // Finish test
                FBTestFirebug.testDone("issue1456.DONE");
            })
        });
    })
}
