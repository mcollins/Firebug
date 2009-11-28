/* See license.txt for terms of usage */
FBL.ns(function() {
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const nsIDocumentEncoder = Ci.nsIDocumentEncoder;
  const EncoderService = Cc["@mozilla.org/layout/documentEncoder;1?type=text/html"];

  var i18n = document.getElementById("strings_fireformat");

  Fireformat.registerFormatter({
    type: "HTML",
    name: "com.incaseofstairs.mozillaHTMLFormatter",
    display: i18n.getString("MozillaHTMLFormatter"),
    format: function(object) {
      // The Document encoder handles all of the heavy lifting here: encoding and line break conversion
      var serializer = EncoderService.createInstance(nsIDocumentEncoder);
      serializer.init(document, "text/html", nsIDocumentEncoder.OutputPreformatted);
      serializer.setCharset("UTF-8");
      serializer.setNode(object);
      return serializer.encodeToString().replace(/\r\n/mg, '\n');
    }
  });
});