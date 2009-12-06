function runTest() {
  var urlBase = FBTest.getHTTPURLBase();
  var Formatter = FBTest.FirebugWindow.FireDiff.formatter,
      FBTrace = FBTest.FirebugWindow.FBTrace;
  
  //FBTest.loadScript("FBTestFireDiff.js", this);
  FBTestFirebug.openNewTab(urlBase + "formatter/htmlFormatter/html_index.html", function(win) {
    var Format = {};
    Components.utils.import("resource://fireformat/formatters.jsm", Format);

    var doc = win.document;
    var expected =
        "<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\" \"http://www.w3.org/TR/html4/loose.dtd\">\n"
        + "<html>\n"
        + "<head>\n"
        + "    <meta http-equiv=\"Content-type\" content=\"application/html; charset=utf-8\">\n"
        + "    <title>Firediff: HTML Formatter Test</title>\n"
        + "    <link type=\"text/css\" rel=\"stylesheet\" href=\"cssSource.css\">\n"
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
        + "    </style>\n"
        + "</head>\n"
        + "<body>\n"
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
        + "</body>\n"
        + "</html>\n";

    var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatHTMLFormatter"),
        text = formatter.format(doc);
    FBTrace.sysout("htmlFormatter", text);
    FBTest.compare(expected, text, "Formatter value");

    // TODO : Individual tests?
    // TODO : Test the case where everything should wrap. Make sure that nowrap is correct

    FBTestFirebug.testDone();
  });
}