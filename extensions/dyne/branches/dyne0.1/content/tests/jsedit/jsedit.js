var userPartFileName = "jsEditThisJs.js";
var fileName = basePath + "jsedit/" + userPartFileName;
var lineNo = 2;

function runTest()
{
    FBTest.sysout("jsedit runTest starts basePath: "+basePath);

    FBTestFirebug.openNewTab(basePath + "jsedit/jsedit.html", function()
    {
        // Open Firebug UI, enable Script panel, reload and start first test.
        FBTestFirebug.openFirebug();
        FBTestFirebug.clearCache();
        FBTestFirebug.selectPanel("script");
        FBTestFirebug.enableScriptPanel(function callbackOnReload(testWindow) {
            win = testWindow;
            selectFile();
            editLine();
        });
    });
}
function editLine() {
    var chrome = FW.Firebug.chrome;

    FBTestFirebug.selectSourceLine(fileName, lineNo, "js", chrome, function(row)
    {
        FBTest.progress("Found line "+lineNo+" "+row);
        FBTest.sysout("row ", row);
        var sourceRowText = row.getElementsByClassName('sourceRowText').item(0);
        var sourceText = sourceRowText.textContent;
        var changeMe = sourceText.split("\"")[1];
        FBTest.compare("change me", changeMe, "The original source must be found");
        var index = sourceText.indexOf(changeMe);
        FBTest.progress(" change me is at "+index);
        applyEdit(sourceRowText, index, changeMe.length, "ok then");

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
}