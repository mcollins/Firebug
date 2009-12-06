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
      "<?xml version=\"1.0\" standalone=\"yes\"?>\n"
      + "<HTML:html xmlns:HTML=\"http://www.w3.org/1999/xhtml\">\n"
      + "<HTML:head>\n"
      + "    <HTML:meta http-equiv=\"Content-Type\" content=\"text/xml; charset=utf-8\" />\n"
      + "    <HTML:title>Firediff: HTML Formatter Test</HTML:title>\n"
      + "    <HTML:link type=\"text/css\" rel=\"stylesheet\" href=\"cssSource.css\" />\n"
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
      + "</HTML:html>\n";

    var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatHTMLFormatter"),
        text = formatter.format(doc);
    FBTrace.sysout("htmlFormatter", text);
    FBTest.compare(expected, text, "Formatter value");

    // TODO : Individual tests?
    // TODO : Self closing tests
    // TODO : Test for each node type
    // TODO : Test the case where everything should wrap. Make sure that nowrap is correct

    FBTestFirebug.testDone();
  });
}