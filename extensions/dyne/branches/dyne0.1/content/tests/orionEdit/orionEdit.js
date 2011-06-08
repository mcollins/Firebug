var orionBase = "http://localhost:8080/file/b/doc/";
var userPartFileName = "dynedoc.css";
var fileName = orionBase+"index.html";
var lineNo = 2;

function runTest()
{
    FBTest.sysout("orionEdit runTest starts basePath: "+basePath);
    FBTest.enableAllPanels();
    // Open the file we plan to edit
    FBTestFirebug.openNewTab(fileName, function()
    {
        // Open Firebug UI, enable Script panel, reload and start first test.
        FBTestFirebug.openFirebug();
        FBTestFirebug.clearCache();
        FBTestFirebug.selectPanel("stylesheet");
        selectFile();
        beginEdit();
    });
}
function beginEdit()
{
    FBTest.progress("begin edit");
    var chrome = FW.Firebug.chrome;
    FW.Firebug.CSSModule.setCurrentEditorName("Orion"); // TODO push buttons
    FBTest.progress("set current editor name to "+FW.Firebug.CSSModule.getCurrentEditorName());
    FBTestFirebug.waitForPanel("orion", continueEdit);
    FW.Firebug.currentContext.getPanel('stylesheet').toggleEditing();
}

function continueEdit()
{
    FBTest.progress("continueEdit");
}

function selectFile()
{
    FBTest.progress("selectFile");

    // Select proper CSS file.
    var panel = FBTestFirebug.getSelectedPanel();
    FBTest.progress("panel.location "+panel.location.href);
    var found = FBTestFirebug.selectPanelLocationByName(panel, userPartFileName);
    FBTest.compare(found, true, "The "+fileName+" should be found");
}