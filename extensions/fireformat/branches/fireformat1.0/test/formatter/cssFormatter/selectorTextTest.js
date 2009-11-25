/* See license.txt for terms of usage */
function runTest() {
  var Firebug = FW.Firebug;
  var Format = {};
  Components.utils.import("resource://fireformat/formatters.jsm", Format);

  function getStyle(selectorText) {
    return {
      type: CSSRule.STYLE_RULE,
      selectorText: selectorText,
      style: { cssText: "" }
    };
  }
  function setPrefs(wrap, perLine, spaces, indent) {
    Firebug.setPref(Firebug.prefDomain, "fireformatCssFormatter.wrapSize", wrap);
    Firebug.setPref(Firebug.prefDomain, "fireformatCssFormatter.selectorText.selectorsPerLine", perLine);
    Firebug.setPref(Firebug.prefDomain, "fireformatCssFormatter.selectorText.spaceCount", spaces);
    Firebug.setPref(Firebug.prefDomain, "fireformatCssFormatter.selectorText.indentLevel", indent); 
  }
  var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatCSSFormatter");
  
  // TODO : Tests
  // Formatting with a single token
  FBTest.compare(".single {\n}\n", formatter.format(getStyle(".single")), "Single Token");
  
  // Formatting with multiple tokens, no wrap
  setPrefs(80, 3, 1, 0);
  FBTest.compare(".single, .double, .triple {\n}\n", formatter.format(getStyle(".single, .double, .triple")), "Formatting with multiple tokens, no wrap");

  // Formatting with multiple tokens, token wrap, no indent
  setPrefs(80, 2, 1, 0);
  FBTest.compare(".single, .double,\n.triple {\n}\n", formatter.format(getStyle(".single, .double, .triple")), "Formatting with multiple tokens, token wrap, no indent");

  // Formatting with multiple tokens, token wrap, indent
  setPrefs(80, 2, 2, 1);
  FBTest.compare(".single,  .double,\n  .triple {\n}\n", formatter.format(getStyle(".single, .double, .triple")), "Formatting with multiple tokens, token wrap, indent");

  // Formatting with multiple tokens, char wrap, no indent
  setPrefs(10, 3, 1, 0);
  FBTest.compare(".single, .double,\n.triple {\n}\n", formatter.format(getStyle(".single, .double, .triple")), "Formatting with multiple tokens, char wrap, no indent");

  // Formatting with multiple tokens, char wrap, indent
  setPrefs(11, 3, 2, 1);
  FBTest.compare(".single,  .double,\n  .triple {\n}\n", formatter.format(getStyle(".single, .double, .triple")), "Formatting with multiple tokens, char wrap, indent");

  // Formatting with advanced selectors, char wrap, indent
  setPrefs(10, 3, 2, 1);
  FBTest.compare(".single[name] > DIV.test + *,\n  .double:focus,\n  .triple#myid {\n}\n", formatter.format(getStyle(".single[name] > DIV.test + *, .double:focus, .triple#myid")), "Multiple no wrap");
  
  FBTest.testDone();
}