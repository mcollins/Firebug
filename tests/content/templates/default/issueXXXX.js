/*
    1. Replace "XXXX" by number of your issue
    2. Replace "mainPanel" by main panel name
    3. Replace "doSomething" by first step after selecting the main panel
    4. Add the functionality and tests as described in the steps of the HTML file
    5. Remove all template comments
*/
function runTest()
{
    FBTest.sysout("issueXXXX.START");

    FBTest.openNewTab(basePath + "net/XXXX/issueXXXX.html", function(win)
    {
        FBTest.openFirebug();
        FBTest.selectPanel("mainPanel");

        FBTest.doSomething(function(win)
        {
            // Test functionality must be placed here

            FBTest.testDone("issueXXXX.DONE");
        });
    });
}