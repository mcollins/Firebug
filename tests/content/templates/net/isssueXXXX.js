// 1) Load test case page.
// 2) Open Firebug and enable the Net panel
// 3) Select Net panel
// 4) Execute test implemented on the test page. 
// 5) Perform test-driver code
// 6) Finish test.
function runTest()
{
    FBTest.sysout("issueXXXX.START");

    // 1) Load test case page
    FBTestFirebug.openNewTab(basePath + "net/XXXX/issueXXXX.html", function(win)
    {
        // 2) Open Firebug and enable the Net panel.
        FBTestFirebug.openFirebug();
        FBTestFirebug.enableNetPanel(function(win)
        {
            // 3) Select Net panel
            var panel = FW.FirebugChrome.selectPanel("net");

            // 4) Execute test by clicking on the 'Execute Test' button.
            FBTest.click(win.document.getElementById("testButton"));

            // 5) TODO: Test driver code (can be asynchronous)

            // 6) Finish test
            FBTestFirebug.testDone("issueXXXX.DONE");
        });
    });
}
