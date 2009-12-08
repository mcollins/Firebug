function runTest() {
  var urlBase = FBTest.getHTTPURLBase();
  var Formatter = FBTest.FirebugWindow.FireDiff.formatter,
      FBTrace = FBTest.FirebugWindow.FBTrace;
  
  //FBTest.loadScript("FBTestFireDiff.js", this);
  FBTestFirebug.openNewTab(urlBase + "formatter/htmlFormatter/xhtml_index.xhtml", function(win) {
    var Format = {};
    Components.utils.import("resource://fireformat/formatters.jsm", Format);

    var doc = win.document;
    var expected =
      "<?xml version=\"1.0\" standalone=\"yes\" ?>\n"
      + "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">\n"
      + "<HTML:html xmlns:HTML=\"http://www.w3.org/1999/xhtml\">\n"
      + "<HTML:head>\n"
      + "    <HTML:meta content=\"text/xml; charset=utf-8\" http-equiv=\"Content-Type\" />\n"
      + "    <HTML:title>Firediff: HTML Formatter Test</HTML:title>\n"
      + "    <HTML:link href=\"cssSource.css\" rel=\"stylesheet\" type=\"text/css\" />\n"
      + "    <HTML:style type=\"text/css\">\n"
      + "      p {\n"
      + "        background-color: green;\n"
      + "      }\n"
      + "      div {\n"
      + "        background-color: red;\n"
      + "      }\n"
      + "      p {\n"
      + "        margin: 100;\n"
      + "      }\n"
      + "    </HTML:style>\n"
      + "</HTML:head>\n"
      + "<HTML:body>\n"
      + "  <!-- \n"
      + "  Comments!\n"
      + "  -->\n"
      + "\n"
      + "  <![CDATA[CDATA=\"GOOD & STUFF <>\"]]>\n"
      + "\n"
      + "  <HTML:div id=\"elementValue\" class=\"Value1 &amp; &lt;\" align=\"left\" dir=\"ltr\">\n"
      + "    <HTML:p>Nested Element</HTML:p>\n"
      + "    Escaping &amp; entities.\n"
      + "    <HTML:br />\n"
      + "    <HTML:input type=\"submit\" />\n"
      + "  </HTML:div>\n"
      + "</HTML:body>\n"
      + "</HTML:html>";

    var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatHTMLFormatter"),
        text = formatter.format(doc);
    FBTest.compare(expected, text, "Formatter value");

    FBTestFirebug.testDone();
  });
}