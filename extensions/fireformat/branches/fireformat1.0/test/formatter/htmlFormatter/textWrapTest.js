/* See license.txt for terms of usage */
function runTest() {
  FBTest.loadScript("FBTestFireformat.js", this);
  var prefs = new FBTestFireformat.PrefHandler([
      "fireformatHtmlFormatter.wrapSize"
  ]);

  var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatHTMLFormatter"),
      xmlDoc = document.implementation.createDocument(null, "", null),
      content = "test\nValue";
  function getText(el) {
    var fragment = xmlDoc.createDocumentFragment();
    fragment.appendChild(xmlDoc.createTextNode("offset"));
    fragment.appendChild(el);
    
    return formatter.format(fragment).replace(/^offset/, "");
  }

  // Test text node output with a few sample entities
  prefs.setPrefs(80);
  FBTest.compare(content, getText(document.createTextNode(content)), "TextNode nowrap");
  prefs.setPrefs(1);
  FBTest.compare(content, getText(document.createTextNode(content)), "TextNode wrap");

  // Test comment node output with a few sample entities
  prefs.setPrefs(80);
  FBTest.compare("<!--" + content + "-->", getText(document.createComment(content)), "Comment nowrap");
  prefs.setPrefs(1);
  FBTest.compare("<!--" + content + "-->", getText(document.createComment(content)), "Comment wrap");

  // Test CDATA output with a few sample entities
  prefs.setPrefs(80);
  FBTest.compare("<![CDATA[" + content + "]]>", getText(xmlDoc.createCDATASection(content)), "CDATA entities nowrap");
  prefs.setPrefs(1);
  FBTest.compare("<![CDATA[" + content + "]]>", getText(xmlDoc.createCDATASection(content)), "CDATA entities wrap");

  FBTest.testDone();
}