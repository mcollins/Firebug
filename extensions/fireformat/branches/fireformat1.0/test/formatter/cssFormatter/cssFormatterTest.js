function runTest() {
  var urlBase = FBTest.getHTTPURLBase();
  var Formatter = FBTest.FirebugWindow.FireDiff.formatter,
      FBTrace = FBTest.FirebugWindow.FBTrace;
  
  //FBTest.loadScript("FBTestFireDiff.js", this);
  FBTestFirebug.openNewTab(urlBase + "formatter/cssFormatter/index.htm", function(win) {
    var Format = {};
    Components.utils.import("resource://fireformat/formatters.jsm", Format);

    var doc = win.document;

    var expected = '@charset "ISO-8859-1";\n'
      + '\n'
      + '@import url("import.css");\n'
      + '@import url("import.css");\n'
      + '\n'
      + '@font-face {\n'
      + '  font-family: "Robson Celtic";\n'
      + '  src: url("http://site/fonts/rob-celt");\n'
      + '}\n'
      + '\n'
      + '@media tv, print {\n'
      + '  #div2 {\n'
      + '    overflow: hidden;\n'
      + '  }\n'
      + '  \n'
      + '  #div3 {\n'
      + '    overflow: hidden;\n'
      + '  }\n'
      + '}\n'
      + '\n'
      + '@media screen {\n'
      + '  #div2 {\n'
      + '    overflow: visible;\n'
      + '  }\n'
      + '}\n'
      + '\n'
      + '#div2 {\n'
      + '  font-weight: bold;\n'
      + '  color: green;\n'
      + '}\n'
    var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatCSSFormatter"),
        text = formatter.format(doc.styleSheets[0]);
    FBTrace.sysout("cssFormatter", text);
    FBTest.compare(expected, text, "Formatter value");

    text = formatter.format(doc.styleSheets[0].cssRules[0]);
    FBTest.compare('@charset "ISO-8859-1";', text, "Rule Formatter Value");

    text = formatter.format(doc.styleSheets[0].cssRules[3]);
    FBTrace.sysout("cssFormatter", text);
    FBTest.compare('@font-face {\n'
        + '  font-family: "Robson Celtic";\n'
        + '  src: url("http://site/fonts/rob-celt");\n'
        + '}\n', text, "Rule Formatter Value");

    + 
    FBTestFirebug.testDone();
  });
}