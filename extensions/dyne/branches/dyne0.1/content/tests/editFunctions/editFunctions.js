var userPartFileName = "editFunctions.html";
var fileName = basePath + "editFunctions/" + userPartFileName;
var lineNo = 2;

function runTest()
{
    FBTest.sysout("editFunctions runTest starts basePath: "+basePath);
    FBTestFirebug.enableAllPanels()
    FBTestFirebug.openNewTab(basePath + "editFunctions/editFunctions.html", function()
    {
        // Open Firebug UI, enable Script panel, reload and start first test.
        FBTestFirebug.openFirebug();
        FBTestFirebug.clearCache();
        FBTestFirebug.selectPanel("script");
        FBTestFirebug.enableScriptPanel(function callbackOnReload(testWindow) {
            win = testWindow;
            tryNow(win.document);
            selectFile();
            tryNow(win.document);
        });
    });
}

function tryNow(doc)
{
    var button = doc.getElementById('tryNow');
    var event = document.createEvent("MouseEvents");
    event.initMouseEvent("click", true, true, doc.defaultView,
        0, 0, 0, 0, 0, false, false, false, false, 0, null);
    var canceled = !button.dispatchEvent(event);
    return canceled;
}

function editFunctions(location)
{
    FBTest.sysout("editFunctions ", location);

    var sourceFile = location.sourceFile;
    var at6 = sourceFile.getScriptsAtLineNumber(6);
    FBTest.sysout("at6", at6);
    var mostEnclosing = at6[0];
    at6.every(function findMin(script){
        if (script.lineExtent < mostEnclosing.lineExtent)
            mostEnclosing = script;
    });
    FBTest.sysout("most enclosing at 6  "+mostEnclosing.functionSource, mostEnclosing);
    var replacementSource = sourceFile.getLine(sourceFile.context, 22)+"\n"+
        sourceFile.getLine(sourceFile.context, 23)+"\n"+
        sourceFile.getLine(sourceFile.context, 24)+"\n"+
        sourceFile.getLine(sourceFile.context, 25)+"\n"+
        sourceFile.getLine(sourceFile.context, 26)+"\n"+
        sourceFile.getLine(sourceFile.context, 27)+"\n";
    FBTest.sysout("replacement source at 6 ", replacementSource);

    var replacementFunction = eval("var replacement ="+replacementSource+";replacement;");
    FBTest.sysout("replacement function "+replacementFunction, replacementFunction);

    var sourceFunction = mostEnclosing.functionObject.getWrappedValue();
    sourceFunction = location.context.window.wrappedJSObject[mostEnclosing.functionName];
    FBTest.sysout("sourceFunction "+sourceFunction, sourceFunction);
    replaceAll(sourceFunction, replacementFunction, location.context.window.wrappedJSObject);
}

function replaceAll(original, replacement, obj, visited)
{
    var visitedObjects = visited || [];
    var keys = Object.keys(obj);
    if (obj.prototype)
        keys.push('prototype');
    keys.forEach(function(key)
    {
        var candidate = obj[key];
        if (typeof(candidate) === 'object' || typeof(candidate) === 'function')
        {
            if (typeof(candidate) === 'function')
                FBTest.sysout("checking function key "+key+": "+(candidate === original), {candidate: candidate, original: original});

            if (candidate === original)
            {
                obj[key] = replacement;
                FBTest.sysout("replaced object key "+key+" in ", obj);
            }

            if (visitedObjects.indexOf(candidate) == -1)
            {
                visitedObjects.push(candidate);
                replaceAll(original, replacement, candidate, visitedObjects);
            }
        }
    });
}


function applyEdit(target, index, length, toText) {
    var text = target.innerHTML;
    FBTest.progress("innerHTML" +text);
    var result = text.substring(0, index) + toText + text.substring(index+length);
    target.innerHTML = result;
    FBTest.progress("result" +result);
}

function selectFile()
{
    FBTest.progress("selectFile");

    // Select proper JS file.
    var panel = FBTestFirebug.getSelectedPanel();
    FBTest.progress("panel.location "+panel.location.getURL());
    var found = FBTestFirebug.selectPanelLocationByName(panel, userPartFileName);
    FBTest.compare(found, true, "The "+fileName+" should be found");

    editFunctions(panel.location);
}