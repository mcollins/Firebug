// Test entry point.
function runTest()
{
    var Firebug = FBTest.FirebugWindow.Firebug;
    var FBTrace = FBTest.FirebugWindow.FBTrace;

    FBTestFirebug.openNewTab(basePath + "css/2440/issue-2440.html", function(win) {
        var FBL = FBTest.FirebugWindow.FBL;
        FBTestFirebug.pressToggleFirebug(true);

        //FBTest.FirebugWindow.Firebug.chrome.selectPanel("html", "css");
        var testEl = win.document.getElementById("test");
        var panel = FBTestFirebug.getPanel("css");
        
        function compareRules(testEl, expected, msg) {
          var rules = [];
          panel.getElementRules(testEl, rules, {}, {}, false);

          FBTest.compare(expected.length, rules.length, msg + " Rules length");
          for (var i = 0; i < rules.length || i < expected.length; i++) {
            // TODO : Verify that the source link matches the expectation
            var curExpected = expected[i] || {},
                curRule = rules[i] || {},
                sourceLink = curRule.sourceLink || {},
                fileName = FBL.getFileName(sourceLink.href);
            FBTest.compare(curExpected.href, fileName, msg + " Href " + i);
            FBTest.compare(curExpected.instance, sourceLink.instance, msg + " Instance " + i);
          }
        }

        compareRules(testEl, [
          { href: "issue-2440.css", instance: 3 },
          { href: "issue-2440.css", instance: 1 },
          { href: "issue-2440.css", instance: 0 },
        ], "Base case");

        var iframe = win.document.getElementById("testFrame");
            iframeDoc = iframe.contentDocument,
            iframeEl = iframeDoc.getElementById("test");
        compareRules(iframeEl, [
          { href: "issue-2440.css", instance: 3 },
          { href: "issue-2440.css", instance: 1 },
          { href: "issue-2440.css", instance: 0 },
        ], "Iframe");

        // TODO : Test the link insertion case
        var newLink = win.document.createElement("link");
        newLink.setAttribute("rel", "stylesheet");
        newLink.setAttribute("type", "text/css");
        newLink.setAttribute("href", "issue-2440.css");
        win.document.body.appendChild(newLink);
        
        compareRules(testEl, [
          { href: "issue-2440.css", instance: 5 },
          { href: "issue-2440.css", instance: 3 },
          { href: "issue-2440.css", instance: 1 },
          { href: "issue-2440.css", instance: 0 },
        ], "Sheet insertion");

        // Test the link insertion in an iframe
        var newLink = iframeDoc.createElement("link");
        newLink.setAttribute("rel", "stylesheet");
        newLink.setAttribute("type", "text/css");
        newLink.setAttribute("href", "issue-2440.css");
        iframeDoc.body.appendChild(newLink);

        compareRules(iframeEl, [
          { href: "issue-2440.css", instance: 5 },
          { href: "issue-2440.css", instance: 3 },
          { href: "issue-2440.css", instance: 1 },
          { href: "issue-2440.css", instance: 0 },
        ], "Iframe sheet insertion");
    
        FBTestFirebug.testDone();
    });
}