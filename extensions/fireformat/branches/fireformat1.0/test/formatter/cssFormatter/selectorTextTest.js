/* See license.txt for terms of usage */
function runTest() {
  var Format = {};
  Components.utils.import("resource://fireformat/formatters.jsm", Format);

  FBTest.loadScript("FBTestFireformat.js", this);
  var prefs = new FBTestFireformat.PrefHandler([
       "fireformatCssFormatter.wrapSize",
       "fireformatCssFormatter.selectorText.selectorsPerLine",
       "fireformatCssFormatter.selectorText.spaceCount",
       "fireformatCssFormatter.selectorText.indentLevel"
  ]);

  function getStyle(selectorText) {
    return {
      type: CSSRule.STYLE_RULE,
      selectorText: selectorText,
      style: { cssText: "" }
    };
  }
  var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatCSSFormatter");
  
  // Formatting with a single token
  FBTest.compare(".single {\n}\n", formatter.format(getStyle(".single")), "Single Token");
  
  // Formatting with multiple tokens, no wrap
  prefs.setPrefs(80, 3, 1, 0);
  FBTest.compare(".single, .double, .triple {\n}\n", formatter.format(getStyle(".single, .double, .triple")), "Formatting with multiple tokens, no wrap");

  // Formatting with multiple tokens, token wrap, no indent
  prefs.setPrefs(80, 2, 1, 0);
  FBTest.compare(".single, .double,\n.triple {\n}\n", formatter.format(getStyle(".single, .double, .triple")), "Formatting with multiple tokens, token wrap, no indent");

  // Formatting with multiple tokens, token wrap, indent
  prefs.setPrefs(80, 2, 2, 1);
  FBTest.compare(".single,  .double,\n  .triple {\n}\n", formatter.format(getStyle(".single, .double, .triple")), "Formatting with multiple tokens, token wrap, indent");

  // Formatting with multiple tokens, char wrap, no indent
  prefs.setPrefs(10, 3, 1, 0);
  FBTest.compare(".single, .double,\n.triple {\n}\n", formatter.format(getStyle(".single, .double, .triple")), "Formatting with multiple tokens, char wrap, no indent");

  // Formatting with multiple tokens, char wrap, indent
  prefs.setPrefs(11, 3, 2, 1);
  FBTest.compare(".single,  .double,\n  .triple {\n}\n", formatter.format(getStyle(".single, .double, .triple")), "Formatting with multiple tokens, char wrap, indent");

  // Formatting with advanced selectors, char wrap, indent
  prefs.setPrefs(10, 3, 2, 1);
  FBTest.compare(".single[name] > DIV.test + *,\n  .double:focus,\n  .triple#myid {\n}\n", formatter.format(getStyle(".single[name] > DIV.test + *, .double:focus, .triple#myid")), "Multiple no wrap");

  prefs.reset();

  FBTest.testDone();
}