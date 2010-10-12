/* See license.txt for terms of usage */
function runTest() {
  var prefs = new FBTestFireformat.PrefHandler([
       "fireformatHtmlFormatter.attribute.attrsPerLine",
       "fireformatHtmlFormatter.attribute.indentLevel",
       "fireformatHtmlFormatter.attribute.listSeparator",
       "fireformatHtmlFormatter.attribute.separatorBeforeEquals",
       "fireformatHtmlFormatter.attribute.separatorBeforeValue",
       "fireformatHtmlFormatter.wrapSize"
  ]);

  var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatHTMLFormatter");
  function getAttr(el) {
    var text = formatter.format(el);
    return text.replace(/<\S+\s([\s\S]*?)(?: \/)?>.*/, "$1");
  }

  // One attribute
  var htmlElement = document.createElement("div");
  htmlElement.setAttribute("attr1", "attr1 value");
  prefs.setPrefs(5, 1, " ", "", "");
  FBTest.compare("attr1=\"attr1 value\"", getAttr(htmlElement), "HTML Attr Default");
  prefs.setPrefs(5, 1, " ", " ", " ");
  FBTest.compare("attr1 = \"attr1 value\"", getAttr(htmlElement), "HTML Attr Default, Space Sep");
  prefs.setPrefs(5, 1, " ", "\n", "\n");
  FBTest.compare("attr1\n  =\n  \"attr1 value\"", getAttr(htmlElement), "HTML Attr Default, Newline Sep");
  prefs.setPrefs(5, 0, " ", "\n", "\n");
  FBTest.compare("attr1\n=\n\"attr1 value\"", getAttr(htmlElement), "HTML Attr Default, Newline Sep No indent");
  prefs.setPrefs(5, 2, " ", "\n", "\n");
  FBTest.compare("attr1\n    =\n    \"attr1 value\"", getAttr(htmlElement), "HTML Attr Default, Newline Sep Extra indent");
  prefs.setPrefs(5, 1, " ", " ", " ", 1);
  FBTest.compare("\n  attr1 = \"attr1 value\"", getAttr(htmlElement), "HTML Attr Default, Wrap");
  
  // Multiple attributes
  htmlElement.setAttribute("attr2", "attr2 value");
  prefs.setPrefs(5, 1, " ", "", "");
  FBTest.compare("attr1=\"attr1 value\" attr2=\"attr2 value\"", getAttr(htmlElement), "HTML Multiple Attr");
  prefs.setPrefs(5, 1, "\n", "", "");
  FBTest.compare("attr1=\"attr1 value\"\n  attr2=\"attr2 value\"", getAttr(htmlElement), "HTML Multiple Attr Newline");
  prefs.setPrefs(5, 0, "\n", "", "");
  FBTest.compare("attr1=\"attr1 value\"\nattr2=\"attr2 value\"", getAttr(htmlElement), "HTML Multiple Attr No Indent");
  prefs.setPrefs(5, 2, "\n", "", "");
  FBTest.compare("attr1=\"attr1 value\"\n    attr2=\"attr2 value\"", getAttr(htmlElement), "HTML Multiple Attr, Multiple Indent");
  prefs.setPrefs(1, 1, " ", "", "");
  FBTest.compare("attr1=\"attr1 value\"\n  attr2=\"attr2 value\"", getAttr(htmlElement), "HTML Multiple Attr, Token Wrap");
  prefs.setPrefs(5, 1, " ", " ", " ", 1);
  FBTest.compare("\n  attr1 = \"attr1 value\"\n  attr2 = \"attr2 value\"", getAttr(htmlElement), "HTML Multiple Default, Char Wrap");
  
  // Attr with newline embedded
  htmlElement.setAttribute("newLine", "new\nline");
  prefs.setPrefs(5, 1, " ", "", "");
  FBTest.compare("attr1=\"attr1 value\" attr2=\"attr2 value\" newline=\"new\nline\"", getAttr(htmlElement), "HTML New Line Attr");

  // XHTML Case test
  var xmlDoc = document.implementation.createDocument(null, "", null);
  htmlElement = xmlDoc.createElementNS("http://www.w3.org/1999/xhtml", "input");
  htmlElement.setAttribute("newLine", "test");
  prefs.setPrefs(5, 1, " ", "", "");
  FBTest.compare("newLine=\"test\"", getAttr(htmlElement), "XHTML Attr");

  prefs.reset();

  FBTest.testDone();
}