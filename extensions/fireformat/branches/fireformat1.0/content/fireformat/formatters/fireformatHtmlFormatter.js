/* See license.txt for terms of usage */
FBL.ns(function() { with (FBL) {
  var i18n = document.getElementById("strings_fireformat");

  var DOMFormatter = function(writer) {
    this.writer = writer;
  };
  DOMFormatter.prototype = {
    printNode: function(node) {
      if (node instanceof Element) {
        this.printElement(node);
      } else if (node instanceof Text) {
        this.printText(node);
      }
    },
    
    printElement: function(el) {
      this.writer.write("<");
      this.writer.write(el.tagName);
      
      var attrs = el.attributes;
      for (var i = 0; i < attrs.length; i++) {
        this.printAttr(attrs[i]);
      }
      this.writer.write(">");

      var childNodes = el.childNodes;
      for (var i = 0; i < childNodes.length; i++) {
        this.printNode(childNodes[i]);
      }

      this.writer.write("</");
      this.writer.write(el.tagName);
      this.writer.write(">");
    },
    printText: function(text) {
      this.writer.write(text.data);
    },
    printAttr: function(attr) {
      this.writer.write(" ");
      this.writer.write(attr.nodeName);
      this.writer.write("=\"");
      this.writer.write(attr.nodeValue);
      this.writer.write("\"");
    },
    printComment: function(comment) {
      this.writer.write("<!--");
      this.writer.write(comment.data);
      this.writer.write("-->");
    },
    printCDATA: function(cdata) {
      this.writer.write("<![CDATA[");
      this.writer.write(cdata.data);
      this.writer.write("]]>");
    }
  };

  Fireformat.registerFormatter({
    type: "HTML",
    name: "com.incaseofstairs.fireformatHTMLFormatter",
    display: i18n.getString("FireformatHTMLFormatter"),
    format: function(object) {
      var writer = new Fireformat.Writer("  ");
      new DOMFormatter(writer).printNode(object);
      return writer.toString();
    }
  });
}});