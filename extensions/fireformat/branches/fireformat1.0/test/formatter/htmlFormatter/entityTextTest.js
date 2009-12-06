/* See license.txt for terms of usage */
function runTest() {
  FBTest.loadScript("FBTestFireformat.js", this);

  var formatter = Format.Formatters.getFormatter("com.incaseofstairs.fireformatHTMLFormatter"),
      input = "\u0022\u0026\u0027\u003E\u00FF\u0152\u0153\u0160",
      output = "&quot;&amp;&apos;&gt;&yuml;&OElig;&oelig;&Scaron;"

  // Test text node output with a few sample entities
  FBTest.compare(output, formatter.format(document.createTextNode(input)), "TextNode entities");

  // Test attribute node output with a few sample entities
  var attr = document.createAttribute("class");
  attr.nodeValue = input;
  FBTest.compare(output, formatter.format(attr).replace(/.*"(.*)"/, "$1"), "Attr entities");

  // Test comment node output with a few sample entities
  FBTest.compare("<!--" + output + "-->", formatter.format(document.createComment(input)), "Comment entities");

  // TODO : Test CDATA output with a few sample entities
  var xmlDoc = document.implementation.createDocument(null, "", null);
  FBTest.compare("<![CDATA[" + input + "]]>", formatter.format(xmlDoc.createCDATASection(input)), "CDATA entities");

  FBTest.testDone();
}