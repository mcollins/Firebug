/* See license.txt for terms of usage */
FBL.ns(function() { with (FBL) {
  var i18n = document.getElementById("strings_fireformat");

  var DOMFormatter = function(writer) {
    this.writer = writer;
  };
  DOMFormatter.prototype = {
    printNode: function(node) {
      var type = node.nodeType;

      if (type == Node.ELEMENT_NODE) {
        this.printElement(node);
      } else if (type == Node.ATTRIBUTE_NODE) {
        this.printAttr(node);
      } else if (type == Node.TEXT_NODE) {
        this.printText(node);
      } else if (type == Node.CDATA_SECTION_NODE) {
        this.printCDATA(node);
      // Node.ENTITY_REFRENCE_NODE
      // Node.ENTITY_NODE
      // Node.PROCESSING_INSTRUCTION_NODE
      } else if (type == Node.COMMENT_NODE) {
        this.printComment(node);
      } else if (type == Node.DOCUMENT_NODE) {
        this.printDocument(node);
      } else if (type == Node.DOCUMENT_TYPE_NODE) {
        this.printDocType(node);
      } else {
        // TODO : Remove
        FBTrace.sysout(node + " " + node.nodeType, node.wrappedJSObject || node);
      }
      // Node.DOCUMENT_FRAGMENT_NODE
      // Node.NOTATION_NODE
    },
    
    printDocument: function(doc) {
      var child = doc.firstChild;
      while (child) {
        this.printNode(child);
        child = child.nextSibling;
      }
    },
    printDocType: function(docType) {
      // TODO : Check this against the spec and examine the formatting options that are available
      this.writer.write({ value: "<!DOCTYPE", join: " " });
      this.writer.write({ value: docType.name.toLowerCase(), join: " " });
      this.writer.write({ value: "PUBLIC", join: " " });
      this.writer.write({ value: "\"" + docType.publicId + "\"", join: " " });
      this.writer.write("\"" + docType.systemId + "\"");
      this.writer.write({ value: ">", join: "\n", nowrap: true });
    },
    printElement: function(el) {
      var tagName = el.tagName;    // TODO : Update this for XHTML and HTML pref
      var childNodes = el.childNodes;

      this.writer.write("<");
      this.writer.write(tagName);
      
      var attrs = el.attributes;
      for (var i = 0; i < attrs.length; i++) {
        this.printAttr(attrs[i]);
      }

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
      var prefCache = new Fireformat.PrefCache("extensions.firebug.fireformatHtmlFormatter"),
          writer = new Fireformat.Writer(prefCache);
      new DOMFormatter(writer, prefCache).printNode(object);
      return writer.toString();
    }
  });
}});