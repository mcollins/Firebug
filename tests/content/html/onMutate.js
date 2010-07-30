function runTest()
{
    FBTest.sysout("html.breakpoints; START");

    FBTestFirebug.openNewTab(basePath + "html/onMutate.html", function(win)
    {
        FBTestFirebug.openFirebug();
        FBTestFirebug.setPref("highlightMutations", true);
        FBTestFirebug.setPref("scrollToMutations", true);

        function onMutateText(id, inline, callback) {
          FBTest.progress("onMutateTest " + id);
          var mutateId = win.document.getElementById(id);

          var chrome = FW.Firebug.chrome;
          waitForHtmlMutation(chrome, inline ? "span" : "div", inline ? mutateId : mutateId.firstChild, callback);

          mutateId.firstChild.appendData("test");
        }
        function onMutateAttr(id, attr, value, callback) {
          FBTest.progress("onMutateAttr " + id);
          var mutateId = win.document.getElementById(id);

          var chrome = FW.Firebug.chrome;
          waitForHtmlMutation(chrome, value ? "span" : "div", mutateId.firstChild, callback);

          if (value) {
            mutateId.firstChild.setAttribute(attr, value);
          } else {
            mutateId.firstChild.removeAttribute(attr);
          }
        }
        function onMutateNode(id, callback) {
          FBTest.progress("onMutateNode " + id);
          var mutateId = win.document.getElementById(id);
          var button = win.document.createElement("button");
          var chrome = FW.Firebug.chrome;

          function parentCallback() {
            waitForHtmlMutation(chrome, "div", button, callback);
          }
          waitForHtmlMutation(chrome, "div", mutateId, parentCallback);

          mutateId.appendChild(button);
        }
        function onRemoveNode(id, index, callback) {
          FBTest.progress("onRemoveNode " + id);

          var mutateId = win.document.getElementById(id);

          var chrome = FW.Firebug.chrome;
          waitForHtmlMutation(chrome, "div", mutateId, callback);

          mutateId.removeChild(mutateId.childNodes[index]);
        }
        function onMutateRemovedRace(id, callback) {
          FBTest.progress("onMutateRemovedRace " + id);
          var mutateId = win.document.getElementById(id);
          var button = win.document.createElement("button");

          var chrome = FW.Firebug.chrome;
          waitForHtmlMutation(chrome, "div", mutateId, callback);

          mutateId.appendChild(button);
          mutateId.lastChild.setAttribute("title", "test");

          mutateId.firstChild.appendData("test");

          mutateId.innerHTML = "&nbsp;";
        }

        // A suite of asynchronous tests.
        var testSuite = [];

        testSuite.push(function(callback) {
          onMutateText("mutateText", false, callback);
        });
        testSuite.push(function(callback) {
          onMutateText("mutateTextInline", true, callback);
        });

        testSuite.push(function(callback) {
          onMutateNode("mutateNode", callback);
        });
        testSuite.push(function(callback) {
          onMutateNode("mutateNodeText", callback);
        });
        testSuite.push(function(callback) {
          onMutateNode("mutateNodeEmpty", callback);
        });

        testSuite.push(function(callback) {
          onRemoveNode("removeNode", 1, callback);
        });
        testSuite.push(function(callback) {
          onRemoveNode("removeNodeText", 0, callback);
        });
        testSuite.push(function(callback) {
          onRemoveNode("removeNodeEmpty", 0, callback);
        });

        testSuite.push(function(callback) {
            onMutateAttr("mutateAttrNew", "title", "boo", callback);
        });
        testSuite.push(function(callback) {
            onMutateAttr("mutateAttrSet", "title", "boo", callback);
        });
        testSuite.push(function(callback) {
            onMutateAttr("mutateAttrRemove", "title", undefined, callback);
        });
        testSuite.push(function(callback) {
            onMutateRemovedRace("mutateRemovedRace", callback);
        });

        // Reload window to activate debugger and run all tests.
        FBTestFirebug.reload(function(win) {
            FBTestFirebug.runTestSuite(testSuite, function() {
                FBTestFirebug.testDone("html.onMutate; DONE");
            });
        })
    });
}


/**
 * Registers handler for break in Debugger.
 * @param {Object} chrome Current Firebug's chrome object (e.g. FW.Firebug.chrome)
 * @param {Number} lineNo Expected source line number where the break should happen.
 * @param {Object} breakpoint Set to true if breakpoint should be displayed in the UI.
 * @param {Object} callback Handeler that should be called when break happens.
 */
function waitForHtmlMutation(chrome, tagName, object, callback)
{
    FBTest.progress("fbTestFirebug.waitForBreakInDebugger in chrome.window" + chrome.window.location);

    var panel = FBTestFirebug.selectPanel("html");
    panel.select(undefined, true);

    // Get document of Firebug's panel.html
    var panel = chrome.getSelectedPanel();
    var doc = panel.panelNode.ownerDocument;

    // Complete attributes that must be set on sourceRow element.
    var attributes = {"class": "mutated"};

    // Wait for mutation event
    var lookBP = new MutationRecognizer(doc.defaultView, tagName, attributes);
    lookBP.onRecognize(function onMutate(node)
    {
        var panel = chrome.getSelectedPanel();

        var repObj = FW.Firebug.getRepObject(node)
            || FW.Firebug.getRepObject(node.getElementsByClassName("repTarget")[0]);
        FBTest.ok(FW.FBL.hasClass(node, "mutated"), "Mutated class: " + node.getAttribute("class") + " " + node.tagName);
        FBTest.compare(object, repObj, "Object matches")

        try
        {
            callback(node);
        }
        catch(exc)
        {
            FBTest.sysout("listenForHtmlMutation callback FAILS "+exc, exc);
        }
    });

    FBTest.sysout("fbTestFirebug.waitForHtmlMutation recognizing ", lookBP);
}
function breakOnMutation(win, type, buttonId, lineNo, callback)
{
    var content = win.document.getElementById("content");
    var context = chrome.window.FirebugContext;

    waitForBreakInDebugger(chrome, lineNo, false, function(sourceRow)
    {
        FBTest.sysout("html.breakpoints; " + buttonId);
        FBTestFirebug.clickContinueButton(chrome);
        FBTest.progress("The continue button is pushed");
        callback();
    });

    FBTest.click(win.document.getElementById(buttonId));
    FBTest.sysout("html.breakpoints; " + buttonId + " button clicked");
}
