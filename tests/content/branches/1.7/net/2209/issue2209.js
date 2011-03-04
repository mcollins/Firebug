function runTest()
{
    FBTest.sysout("issue2209.START");

    FBTestFirebug.openNewTab(basePath + "net/2209/issue2209.html", function(win)
    {
        FBTestFirebug.enableNetPanel(function(win)
        {
            FBTestFirebug.selectPanel("net");

            // Create listener for mutation events.
            var doc = FBTestFirebug.getPanelDocument();
            var recognizer = new MutationRecognizer(doc.defaultView, "tr",
                {"class": "netRow category-xhr loaded"});

            // Wait for a XHR log to appear in the Net panel.
            recognizer.onRecognizeAsync(function (element)
            {
                // Expand XHR entry.
                FBTest.click(element);

                var rowInfoBody = element.nextSibling;
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
