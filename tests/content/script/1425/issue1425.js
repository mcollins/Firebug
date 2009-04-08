// Test entry point.
function runTest()
{
    FBTest.sysout("issue1425.START");

    FBTest.Firebug.clearCache();

    var issue1425URL = basePath + "script/1425/issue1425.html";
    var issue1425 = new FBTest.Firebug.TestHandlers("issue1425");

    issue1425.add( function onNewPage(event)
    {
        var isOpen = FBTest.Firebug.isFirebugOpen();
        FBTest.sysout("onNewPage starts with isFirebugOpen:"+isOpen, event);
        if (!isOpen)
            FBTest.Firebug.pressToggleFirebug();
    });


    issue1425.add( function navigateToSource(event)
    {
            var panel = FW.FirebugChrome.selectPanel("script");

            issue1425.userHasNavigated = true;

            // Select proper JS file.
            var found = FBTestFirebug.selectPanelLocationByName(panel, "main.js");
            FBTest.compare(found, true, "The main.js should be found");

    });

    issue1425.add( function checkSource(event)
    {
        var panel = FW.FirebugContext.chrome.getSelectedPanel();
        var selectedLocationDescription = panel.getObjectDescription(panel.location);
        FBTest.compare("main.js", selectedLocationDescription.name,  "The selected location must be main.js");

        var sourceBox = panel.getSourceBoxByURL(panel.location.href);
        var sourceViewport =  FW.FBL.getChildByClass(sourceBox, 'sourceViewport');
        if (sourceViewport)
        {
            var rows = sourceViewport.childNodes;

            FBTest.ok(rows.length > 1, "The script view must not be empty.");
            if (rows.length < 1)
                issue1425.done();
            var source1 = "function MapLoadingIndicator(m){";
            FBTest.compare(source1, rows[1].firstChild.nextSibling.textContent,
                    "Verify source on line 1");

            // Scroll to 1143
            issue1425.userHasScrolled = true;
            FBTest.Firebug.selectSourceLine(panel.location.href, 1143, "js");
        }
        else
        {
            issue1425.done();
        }
    });

    issue1425.add( function checkScrolling()
    {
            FBTest.progress("check scrolling");
            // Look for line 1143
            var row1143 = FBTestFirebug.getSourceLineNode(1143);

            // Check 1143
            FBTest.ok(row1143, "The row 1143 must exist");
            if (row1143)
            {
                var source1143 = "initialize:function(config){";
                FBTest.compare(source1143, row1143.firstChild.nextSibling.textContent,
                    "The source code at line 1143 verified.");
            }
            else
            {

                FBTest.sysout("Where is 1143 row in "+panel.location.href, rows);
            }

            issue1425.done();
    });


    var testListener =
    {
            moduleListener:
            {
                loadedContext: function(context)
                {
                    if (issue1425.userIsActive)
                        issue1425.fire("navigateToSource");
                },
                destroyContext: function(context)
                {

                }
            },
            uiListener:
            {
                onPanelNavigate: function()
                {
                    if (issue1425.userIsActive && issue1425.userHasNavigated && !issue1425.userHasScrolled)
                        issue1425.fire("checkSource");
                },
                showUI: function(browser, context)
                {
                    issue1425.userIsActive = true;
                    FBTest.progress("showUI userIsActive "+issue1425.userIsActive+" context.loaded "+context.loaded);
                    if (context.loaded)
                        issue1425.fire("navigateToSource");
                },
                onViewportChange: function()
                {
                    if (issue1425.userHasScrolled)
                    {
                        FBTest.progress("onViewportChange");
                        issue1425.fire("checkScrolling");
                    }
                }
            }
    };
    issue1425.userIsActive = false;
    issue1425.fireOnNewPage("onNewPage", issue1425URL,  testListener);
}

