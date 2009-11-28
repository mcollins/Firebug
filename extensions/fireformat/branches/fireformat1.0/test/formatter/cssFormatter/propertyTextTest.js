/* See license.txt for terms of usage */
function runTest() {
  FBTest.loadScript("FBTestFireformat.js", this);
  var prefs = new FBTestFireformat.PrefHandler([
       "fireformatCssFormatter.wrapSize",
       "fireformatCssFormatter.property.tokensPerLine",
       "fireformatCssFormatter.property.indentLevel",
       "fireformatCssFormatter.property.spaceBeforeColon",
       "fireformatCssFormatter.property.spaceBeforeValue",
       "fireformatCssFormatter.property.spaceBeforePriority",
       "fireformatCssFormatter.property.spaceBeforeSemicolon",
       "fireformatCssFormatter.property.valueSpaceCount"
  ]);

  var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatCSSFormatter");
  function getStyle(cssText) {
    var style = formatter.format({
      type: CSSRule.STYLE_RULE,
      selectorText: "selector",
      style: { cssText: cssText }
    });
    return style.replace(/[\s\S]*?\{\n([\s\S]*)\n\}[\s\S]*?/, "$1");
  }

  // Single property, no wrap
  prefs.setPrefs(80, 10, 1, 0, 1, 1, 0, 1);
  FBTest.compare("  background-color: green;\n", getStyle("background-color : green;"), "Single Property, no wrap");
  prefs.setPrefs(80, 10, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background-color :green ;\n", getStyle("background-color : green;"), "Single Property, no wrap, spaces");
  prefs.setPrefs(80, 1, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    green ;\n", getStyle("background : green;"), "Single Property, token wrap");
  prefs.setPrefs(80, 10, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :green brown ;\n", getStyle("background : green brown;"), "Single Property, multiple token nowrap");
  prefs.setPrefs(80, 1, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    green\n    brown ;\n", getStyle("background : green brown;"), "Single Property, multiple token wrap");
  prefs.setPrefs(80, 1, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    \"green{ string\" ;\n", getStyle("background : \"green{ string\";"), "Single Property, token wrap, string1");
  prefs.setPrefs(1, 10, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    \"green }string\" ;\n", getStyle("background : \"green }string\";"), "Single Property, token wrap, string1");
  prefs.setPrefs(80, 1, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    \'green{ string\' ;\n", getStyle("background : \'green{ string\';"), "Single Property, token wrap, string2");
  prefs.setPrefs(1, 10, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    \'green }string\' ;\n", getStyle("background : \'green }string\';"), "Single Property, token wrap, string2");

  // Testing with priority values
  prefs.setPrefs(80, 10, 1, 0, 1, 1, 0, 1);
  FBTest.compare("  background-color: green !important;\n", getStyle("background-color : green  !important;"), "Important single Property, no wrap");
  prefs.setPrefs(80, 10, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background-color :green !important ;\n", getStyle("background-color : green !important;"), "Important single Property, no wrap, spaces");
  prefs.setPrefs(80, 1, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    green\n    !important ;\n", getStyle("background : green !important;"), "Important single Property, token wrap");
  prefs.setPrefs(80, 10, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :green brown !important ;\n", getStyle("background : green brown !important;"), "Important single Property, multiple token nowrap");
  prefs.setPrefs(80, 1, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    green\n    brown\n    !important ;\n", getStyle("background : green brown !important;"), "Important single Property, multiple token wrap");
  prefs.setPrefs(80, 1, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    \"green{ string\"\n    !important ;\n", getStyle("background : \"green{ string\" !important;"), "Important single Property, token wrap, string1");
  prefs.setPrefs(1, 10, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    \"green }string\"\n    !important ;\n", getStyle("background : \"green }string\" !important;"), "Important single Property, token wrap, string1");
  prefs.setPrefs(80, 1, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    \'green{ string\'\n    !important ;\n", getStyle("background : \'green{ string\' !important;"), "Important single Property, token wrap, string2");
  prefs.setPrefs(1, 10, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    \'green }string\'\n    !important ;\n", getStyle("background : \'green }string\' !important;"), "Important single Property, token wrap, string2");
  prefs.setPrefs(80, 10, 1, 0, 1, 2, 0, 1);
  FBTest.compare("  background-color: green  !important;\n", getStyle("background-color : green  !important;"), "Important single Property, no wrap");
  prefs.setPrefs(80, 10, 1, 1, 0, 2, 1, 1);
  FBTest.compare("  background-color :green  !important ;\n", getStyle("background-color : green !important;"), "Important single Property, no wrap, spaces");
  prefs.setPrefs(80, 1, 1, 1, 0, 2, 1, 1);
  FBTest.compare("  background :\n    green\n    !important ;\n", getStyle("background : green !important;"), "Important single Property, token wrap");
  prefs.setPrefs(80, 10, 1, 1, 0, 2, 1, 1);
  FBTest.compare("  background :green brown  !important ;\n", getStyle("background : green brown !important;"), "Important single Property, multiple token nowrap");
  prefs.setPrefs(80, 1, 1, 1, 0, 2, 1, 1);
  FBTest.compare("  background :\n    green\n    brown\n    !important ;\n", getStyle("background : green brown !important;"), "Important single Property, multiple token wrap");
  prefs.setPrefs(80, 1, 1, 1, 0, 2, 1, 1);
  FBTest.compare("  background :\n    \"green{ string\"\n    !important ;\n", getStyle("background : \"green{ string\" !important;"), "Important single Property, token wrap, string1");
  prefs.setPrefs(1, 10, 1, 1, 0, 2, 1, 1);
  FBTest.compare("  background :\n    \"green }string\"\n    !important ;\n", getStyle("background : \"green }string\" !important;"), "Important single Property, token wrap, string1");
  prefs.setPrefs(80, 1, 1, 1, 0, 2, 1, 1);
  FBTest.compare("  background :\n    \'green{ string\'\n    !important ;\n", getStyle("background : \'green{ string\' !important;"), "Important single Property, token wrap, string2");
  prefs.setPrefs(1, 10, 1, 1, 0, 2, 1, 1);
  FBTest.compare("  background :\n    \'green }string\'\n    !important ;\n", getStyle("background : \'green }string\' !important;"), "Important single Property, token wrap, string2");

  prefs.setPrefs(80, 1, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    \"green{\\\n string\" ;\n", getStyle("background : \"green{\\\n string\";"), "Single Property newline, token wrap, string1");
  prefs.setPrefs(80, 1, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    \'green{\\\n string\' ;\n", getStyle("background : \'green{\\\n string\';"), "Single Property newline, token wrap, string2");
  prefs.setPrefs(80, 1, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    \"green{\\\n string\" ;\n", getStyle("background : \"green{\n string\";"), "Single Property invalid newline, token wrap, string1");
  prefs.setPrefs(80, 1, 1, 1, 0, 1, 1, 1);
  FBTest.compare("  background :\n    \'green{\\\n string\' ;\n", getStyle("background : \'green{\n string\';"), "Single Property invalid newline, token wrap, string2");

  prefs.reset();

  FBTest.testDone();
}