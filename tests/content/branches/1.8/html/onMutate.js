function runTest()
{
    FBTest.sysout("html.breakpoints; START");

    FBTest.openNewTab(basePath + "html/onMutate.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.setPref("highlightMutations", true);
        FBTest.setPref("scrollToMutations", true);

        // A suite of asynchronous tests.
        var testSuite = new FBTest.TaskList();
        testSuite.push(onMutateText, win, "mutateText", false);
        testSuite.push(onMutateText, win, "mutateTextInline", true);
        testSuite.push(onMutateNode, win, "mutateNode");
        testSuite.push(onMutateNode, win, "mutateNodeText");
        testSuite.push(onMutateNode, win, "mutateNodeEmpty");
        testSuite.push(onRemoveNode, win, "removeNode", 1);
        testSuite.push(onRemoveNode, win, "removeNodeText", 0);
        testSuite.push(onRemoveNode, win, "removeNodeEmpty", 0);
        testSuite.push(onMutateAttr, win, "mutateAttrNew", "title", "boo");
        testSuite.push(onMutateAttr, win, "mutateAttrSet", "title", "boo");
        testSuite.push(onMutateAttr, win, "mutateAttrRemove", "title", undefined);
        testSuite.push(onMutateRemovedRace, win, "mutateRemovedRace");

        // Reload window to activate debugger and run all tests.
        FBTest.reload(function(win)
        {
            testSuite.run(function() {
                FBTest.testDone("html.onMutate; DONE");
            });
        })
    });
}

function onMutateText(callback, win, id, inline)
{
    FBTest.progress("onMutateTest " + id);

    var mutateId = win.document.getElementById(id);
    waitForHtmlMutation(null, inline ? "span" : "div", mutateId, callback);

    FBTest.click(win.document.getElementById(id + "Button"));
}

function onMutateAttr(callback, win, id, attr, value)
{
    FBTest.progress("onMutateAttr " + id);

    var mutateId = win.document.getElementById(id);
    waitForHtmlMutation(null, value ? "span" : "div",
        value ? mutateId.firstChild : mutateId, callback);

    if (value)
        mutateId.firstChild.setAttribute(attr, value);
    else
        mutateId.firstChild.removeAttribute(attr);

    FBTest.click(win.document.getElementById(id + "Button"));
}

function onMutateNode(callback, win, id)
{
    FBTest.progress("onMutateNode " + id);

    var counter = 0;
    function done()
    {
        if (++counter == 2)
            callback();
    }

    var mutateId = win.document.getElementById(id);
    waitForHtmlMutation(null, "div", mutateId, done);
    waitForHtmlMutation(null, "div", null, done);

    FBTest.click(win.document.getElementById(id + "Button"));
}

function onRemoveNode(callback, win, id, index)
{
    FBTest.progress("onRemoveNode " + id);

    var mutateId = win.document.getElementById(id);
    waitForHtmlMutation(null, "div", mutateId.parentNode, callback);

    FBTest.click(win.document.getElementById(id + "Button"));
}

function onMutateRemovedRace(callback, win, id)
{
    FBTest.progress("onMutateRemovedRace " + id);

    var counter = 0;
    function done()
    {
        if (++counter == 3)
            callback();
    }

    var mutateId = win.document.getElementById(id);
    waitForHtmlMutation(null, "div", mutateId.parentNode, done);
    waitForHtmlMutation(null, "div", null, done);
    waitForHtmlMutation(null, "div", null, done);

    FBTest.click(win.document.getElementById(id + "Button"));
}

function waitForHtmlMutation(chrome, tagName, object, callback)
{
    FBTest_waitForHtmlMutation(chrome, tagName, function(node)
    {
        if (object)
        {
            var repObj = FW.Firebug.getRepObject(node);
            if (!repObj)
                repObj = FW.Firebug.getRepObject(node.getElementsByClassName("repTarget")[0]);

            FBTest.compare(object.parentNode.innerHTML, repObj.parentNode.innerHTML, "Element matches");
            FBTest.compare(object.innerHTML, repObj.innerHTML, "Content matches");
            FBTest.compare(object, repObj, "Objects matches");
        }

        callback(node);
    });
}

// ********************************************************************************************* //

// xxxHonza: remove as soon as it's part of FBTest 1.7b11
function FBTest_waitForHtmlMutation(chrome, tagName, callback)
{
    if (!chrome)
        chrome = FW.Firebug.chrome;

    var panel = FBTest.selectPanel("html");

    var doc = FBTest.getPanelDocument();
    var view = doc.defaultView;
    var attributes = {"class": "mutated"};

    // Wait for mutation event. The HTML panel will set "mutate" class on the
    // corresponding element.
    var mutated = new MutationRecognizer(view, tagName, attributes);
    mutated.onRecognizeAsync(function onMutate(node)
    {
        // Now wait till the HTML panel unhighlight the element (removes the mutate class)
        var unmutated = new MutationRecognizer(view, tagName, null, null, attributes);
        unmutated.onRecognizeAsync(function onUnMutate(node)
        {
            setTimeout(function() {
                callback(node);
            }, 200);
        });
    });
}
