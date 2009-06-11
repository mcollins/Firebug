window.FBTestTimeout = 17000; // override the default test timeout [ms].

function runTest()
{
    FBTest.sysout("issue1693.START");

    FBTest.registerPathHandler("/console/1693/issue1693.php", function (metadata, response)
    {
        response.setHeader("Content-Type", "text/html", false);
        var text = "";
        for (var i=0; i<80000; i++)
            text += i + " ";
        response.write(text);
    });

    FBTestFirebug.openNewTab(basePath + "console/1693/issue1693.html", function(win)
    {
        FBTestFirebug.enableConsolePanel(function(win)
        {
            var panelNode = FBTestFirebug.selectPanel("console").panelNode;
            win.wrappedJSObject.executeRequest(function(request)
            {
                FBTestFirebug.expandElements(panelNode, "spyTitleCol", "spyCol");
                setTimeout(function() {
                    FBTest/*Firebug*/.testDone("issue1693.DONE");
                }, 500);
            });
        });
    });
}
