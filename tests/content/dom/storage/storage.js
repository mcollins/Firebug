/**
 * Test for DOM session and local storage.
 * 
 * Related issues:
 * Issue 3611: localStorage and sessionStorage not shown in DOM panel
 */
function runTest()
{
    FBTest.sysout("storage.START");
    FBTest.openNewTab(basePath + "dom/storage/storage.html", function(win)
    {
        FBTest.openFirebug();

        var tasks = new FBTest.TaskList();
        tasks.push(testEmptySessionStorage, win);
        tasks.push(testEmptyLocalStorage, win);
        tasks.push(testSessionStorageData, win);
        tasks.push(testLocalStorageData, win);

        tasks.run(function()
        {
            FBTest.testDone("storage.DONE");
        })
    });
}

function testEmptySessionStorage(callback, win)
{
    onPropertyDisplayed(panel, "sessionStorage", function(row)
    {
        FBTest.compare(/\s*0 items in Storage\s*/, row.textContent,
            "The session storage must be empty now");
        callback();
    });

    // Clear storage and refresh panel content.
    FBTest.click(win.document.getElementById("clearStorage"));
    var panel = FBTest.selectPanel("dom");
    panel.rebuild(true);
}

function testEmptyLocalStorage(callback, win)
{
    onPropertyDisplayed(panel, "localStorage", function(row)
    {
        FBTest.compare(/\s*0 items in Storage\s*/, row.textContent,
            "The locale storage must be empty now");
        callback();
    });

    // Clear storage and refresh panel content.
    FBTest.click(win.document.getElementById("clearStorage"));
    var panel = FBTest.selectPanel("dom");
    panel.rebuild(true);
}

function testSessionStorageData(callback, win)
{
    onPropertyDisplayed(panel, "sessionStorage", function(row)
    {
        FBTest.compare(
            /2 items in Storage\s*issue="value1",\s*name="item1"\s*/,
            row.textContent, "The session storage must have proper data");
        callback();
    });

    // Init storage and refresh panel content.
    FBTest.click(win.document.getElementById("initStorage"));
    var panel = FBTest.selectPanel("dom");
    panel.rebuild(true);
}

function testLocalStorageData(callback, win)
{
    onPropertyDisplayed(panel, "localStorage", function(row)
    {
        FBTest.compare(
            /\s*10 items in Storage\s*item6="6",\s*item3="3",\s*more...\s*/,
            row.textContent, "The local storage must have proper data");
        callback();
    });

    // Clear storage and refresh panel content.
    FBTest.click(win.document.getElementById("initStorage"));
    var panel = FBTest.selectPanel("dom");
    panel.rebuild(true);
}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

//xxxHonza: should be in FBTestFirebug
function onPropertyDisplayed(panel, propName, callback)
{
    var panel = FBTestFirebug.getPanel("dom");
    var recognizer = new MutationRecognizer(panel.document.defaultView,
        "Text", {}, propName);
    recognizer.onRecognizeAsync(callback);
}
