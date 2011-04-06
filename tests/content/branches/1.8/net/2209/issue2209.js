function runTest()
{
    FBTest.sysout("issue2209.START");

    FBTestFirebug.openNewTab(basePath + "net/2209/issue2209.html", function(win)
    {
        FBTestFirebug.enableNetPanel(function(win)
        {
            FBTestFirebug.selectPanel("net");

            FBTest.waitForDisplayedElement("net", null, function(netRow)
            {
                FBTest.click(netRow);

                var rowInfoBody = netRow.nextSibling;
                FBTest.ok(FW.FBL.hasClass(rowInfoBody, "netInfoRow"), "We need XHR entry body.");

                var jsonTab = rowInfoBody.querySelector(".netInfoJSONTab");
                if (FBTest.ok(jsonTab, "JSON tab must exist"))
                {
                    // Select JSON tab.
                    FBTest.click(jsonTab);

                    var label = rowInfoBody.querySelector(
                        ".netInfoJSONText.netInfoText .domTable .memberRow .memberLabel.userLabel");
                    FBTest.ok(label, "JSON DOM Tree must exist");
                    FBTest.compare("ResultSet", label.textContent, "The root label must be displayed");
                }

                FBTestFirebug.testDone("issue2209; end");
            });

            // Execute Test
            FBTest.click(win.document.getElementById("executeTest"));
        });
    });
}
