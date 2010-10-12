function runTest() {
  var urlBase = FBTest.getHTTPURLBase();
  var Formatter = FBTest.FirebugWindow.FireDiff.formatter,
      FBTrace = FBTest.FirebugWindow.FBTrace;

  FBTestFirebug.openNewTab(urlBase + "formatter/htmlFormatter/html_index.html", function(win) {
    var Format = {};
    Components.utils.import("resource://fireformat/formatters.jsm", Format);

    var doc = win.document;
    var expected =
        "<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\" \"http://www.w3.org/TR/html4/loose.dtd\">\n"
        // This is an issue with the firefox parser. Not much that we can do about this right now
        // Expected:
        // + "<html>\n"
        // + "<head>\n"
        + "<html><head>\n\n\n"
        + "    <meta content=\"application/html; charset=utf-8\" http-equiv=\"Content-type\">\n"
        + "    <title>Firediff: HTML Formatter Test</title>\n"
        + "    <link href=\"cssSource.css\" rel=\"stylesheet\" type=\"text/css\">\n"
        + "    <style type=\"text/css\">\n"
        + "      p {\n"
        + "        background-color: green;\n"
        + "      }\n"
        + "      div {\n"
        + "        background-color: red;\n"
        + "      }\n"
        + "      p {\n"
        + "        margin: 100;\n"
        + "      }\n"
        + "      div:after {\n"
        + "        content: \"test\";\n"
        + "      }\n"
        + "    </style>\n"
        // This is an issue with the firefox parser. Not much that we can do about this right now
        // Expected:
        //+ "</head>\n"
        //+ "<body>\n"
        + "</head><body>\n"
        + "  <!-- \n"
        + "  Comments!\n"
        + "  -->\n"
        + "\n"
        + "  <div id=\"elementValue\" class=\"Value1\" align=\"left\" dir=\"ltr\">\n"
        + "    <p>Nested Element</p>\n"
        + "    Escaping &amp; entities.\n"
        + "    <br>\n"
        + "    <input type=\"submit\">\n"
        + "  </div>\n"
        // This is an issue with the firefox parser. Not much that we can do about this right now
        // Expected:
        //+ "</body>\n"
        //+ "</html>";
        + "</body></html>";

    var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatHTMLFormatter"),
        text = formatter.format(doc);
    FBTest.compare(expected, text, "Formatter value");

    FBTestFirebug.testDone();
  });
}