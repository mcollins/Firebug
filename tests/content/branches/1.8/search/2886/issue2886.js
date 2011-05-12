function runTest()
{
    FBTest.sysout("issue2886.START");

    FBTest.openNewTab(basePath + "search/2886/issue2886.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.enableScriptPanel(function(win)
        {
            FW.Firebug.chrome.selectPanel("script");

            var tests = new FBTest.TaskList();
            tests.push(doSearch, "(!(this-is-accidental-regexpr))", 28, false);
            tests.push(doSearch, "keyword\\s+\\d+", 30, true);

            tests.run(function() {
                FBTest.testDone("issue2886.DONE");
            });
        });
    });
}

function doSearch(callback, searchString, lineNo, useRegExp)
{
    FBTest.progress("Search for " + searchString);
    FBTest.setPref("searchUseRegularExpression", useRegExp);

    // Execute search.
    FBTest.searchInScriptPanel(searchString, function(row)
    {
        var sourceLine = row.querySelector(".sourceLine");
        FBTest.compare(lineNo, parseInt(sourceLine.textContent),
            searchString + " found on line: " + lineNo);

        callback();
    });
}
