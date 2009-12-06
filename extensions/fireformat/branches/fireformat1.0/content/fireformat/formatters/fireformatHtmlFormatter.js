/* See license.txt for terms of usage */
FBL.ns(function() { with (FBL) {
  var i18n = document.getElementById("strings_fireformat");


  const ENTITY_LUT = {
    "\u0022": "&quot;", "\u0026": "&amp;", "\u0027": "&apos;", "\u003C": "&lt;",
    "\u003E": "&gt;", "\u00A0": "&nbsp;", "\u00A1": "&iexcl;", "\u00A2": "&cent;",
    "\u00A3": "&pound;", "\u00A4": "&curren;", "\u00A5": "&yen;", "\u00A6": "&brvbar;",
    "\u00A7": "&sect;", "\u00A8": "&uml;", "\u00A9": "&copy;", "\u00AA": "&ordf;",
    "\u00AB": "&laquo;", "\u00AC": "&not;", "\u00AD": "&shy;", "\u00AE": "&reg;",
    "\u00AF": "&macr;", "\u00B0": "&deg;", "\u00B1": "&plusmn;", "\u00B2": "&sup2;",
    "\u00B3": "&sup3;", "\u00B4": "&acute;", "\u00B5": "&micro;", "\u00B6": "&para;",
    "\u00B7": "&middot;", "\u00B8": "&cedil;", "\u00B9": "&sup1;", "\u00BA": "&ordm;",
    "\u00BB": "&raquo;", "\u00BC": "&frac14;", "\u00BD": "&frac12;", "\u00BE": "&frac34;",
    "\u00BF": "&iquest;", "\u00C0": "&Agrave;", "\u00C1": "&Aacute;", "\u00C2": "&Acirc;",
    "\u00C3": "&Atilde;", "\u00C4": "&Auml;", "\u00C5": "&Aring;", "\u00C6": "&AElig;",
    "\u00C7": "&Ccedil;", "\u00C8": "&Egrave;", "\u00C9": "&Eacute;", "\u00CA": "&Ecirc;",
    "\u00CB": "&Euml;", "\u00CC": "&Igrave;", "\u00CD": "&Iacute;", "\u00CE": "&Icirc;",
    "\u00CF": "&Iuml;", "\u00D0": "&ETH;", "\u00D1": "&Ntilde;", "\u00D2": "&Ograve;",
    "\u00D3": "&Oacute;", "\u00D4": "&Ocirc;", "\u00D5": "&Otilde;", "\u00D6": "&Ouml;",
    "\u00D7": "&times;", "\u00D8": "&Oslash;", "\u00D9": "&Ugrave;", "\u00DA": "&Uacute;",
    "\u00DB": "&Ucirc;", "\u00DC": "&Uuml;", "\u00DD": "&Yacute;", "\u00DE": "&THORN;",
    "\u00DF": "&szlig;", "\u00E0": "&agrave;", "\u00E1": "&aacute;", "\u00E2": "&acirc;",
    "\u00E3": "&atilde;", "\u00E4": "&auml;", "\u00E5": "&aring;", "\u00E6": "&aelig;",
    "\u00E7": "&ccedil;", "\u00E8": "&egrave;", "\u00E9": "&eacute;", "\u00EA": "&ecirc;",
    "\u00EB": "&euml;", "\u00EC": "&igrave;", "\u00ED": "&iacute;", "\u00EE": "&icirc;",
    "\u00EF": "&iuml;", "\u00F0": "&eth;", "\u00F1": "&ntilde;", "\u00F2": "&ograve;",
    "\u00F3": "&oacute;", "\u00F4": "&ocirc;", "\u00F5": "&otilde;", "\u00F6": "&ouml;",
    "\u00F7": "&divide;", "\u00F8": "&oslash;", "\u00F9": "&ugrave;", "\u00FA": "&uacute;",
    "\u00FB": "&ucirc;", "\u00FC": "&uuml;", "\u00FD": "&yacute;", "\u00FE": "&thorn;",
    "\u00FF": "&yuml;", "\u0152": "&OElig;", "\u0153": "&oelig;", "\u0160": "&Scaron;",
    "\u0161": "&scaron;", "\u0178": "&Yuml;", "\u0192": "&fnof;", "\u02C6": "&circ;",
    "\u02DC": "&tilde;", "\u0391": "&Alpha;", "\u0392": "&Beta;", "\u0393": "&Gamma;",
    "\u0394": "&Delta;", "\u0395": "&Epsilon;", "\u0396": "&Zeta;", "\u0397": "&Eta;",
    "\u0398": "&Theta;", "\u0399": "&Iota;", "\u039A": "&Kappa;", "\u039B": "&Lambda;",
    "\u039C": "&Mu;", "\u039D": "&Nu;", "\u039E": "&Xi;", "\u039F": "&Omicron;",
    "\u03A0": "&Pi;", "\u03A1": "&Rho;", "\u03A3": "&Sigma;", "\u03A4": "&Tau;",
    "\u03A5": "&Upsilon;", "\u03A6": "&Phi;", "\u03A7": "&Chi;", "\u03A8": "&Psi;",
    "\u03A9": "&Omega;", "\u03B1": "&alpha;", "\u03B2": "&beta;", "\u03B3": "&gamma;",
    "\u03B4": "&delta;", "\u03B5": "&epsilon;", "\u03B6": "&zeta;", "\u03B7": "&eta;",
    "\u03B8": "&theta;", "\u03B9": "&iota;", "\u03BA": "&kappa;", "\u03BB": "&lambda;",
    "\u03BC": "&mu;", "\u03BD": "&nu;", "\u03BE": "&xi;", "\u03BF": "&omicron;",
    "\u03C0": "&pi;", "\u03C1": "&rho;", "\u03C2": "&sigmaf;", "\u03C3": "&sigma;",
    "\u03C4": "&tau;", "\u03C5": "&upsilon;", "\u03C6": "&phi;", "\u03C7": "&chi;",
    "\u03C8": "&psi;", "\u03C9": "&omega;", "\u03D1": "&thetasym;", "\u03D2": "&upsih;",
    "\u03D6": "&piv;", "\u2002": "&ensp;", "\u2003": "&emsp;", "\u2009": "&thinsp;",
    "\u200C": "&zwnj;", "\u200D": "&zwj;", "\u200E": "&lrm;", "\u200F": "&rlm;",
    "\u2013": "&ndash;", "\u2014": "&mdash;", "\u2018": "&lsquo;", "\u2019": "&rsquo;",
    "\u201A": "&sbquo;", "\u201C": "&ldquo;", "\u201D": "&rdquo;", "\u201E": "&bdquo;",
    "\u2020": "&dagger;", "\u2021": "&Dagger;", "\u2022": "&bull;", "\u2026": "&hellip;",
    "\u2030": "&permil;", "\u2032": "&prime;", "\u2033": "&Prime;", "\u2039": "&lsaquo;",
    "\u203A": "&rsaquo;", "\u203E": "&oline;", "\u2044": "&frasl;", "\u20AC": "&euro;",
    "\u2111": "&image;", "\u2118": "&weierp;", "\u211C": "&real;", "\u2122": "&trade;",
    "\u2135": "&alefsym;", "\u2190": "&larr;", "\u2191": "&uarr;", "\u2192": "&rarr;",
    "\u2193": "&darr;", "\u2194": "&harr;", "\u21B5": "&crarr;", "\u21D0": "&lArr;",
    "\u21D1": "&uArr;", "\u21D2": "&rArr;", "\u21D3": "&dArr;", "\u21D4": "&hArr;",
    "\u2200": "&forall;", "\u2202": "&part;", "\u2203": "&exist;", "\u2205": "&empty;",
    "\u2207": "&nabla;", "\u2208": "&isin;", "\u2209": "&notin;", "\u220B": "&ni;",
    "\u220F": "&prod;", "\u2211": "&sum;", "\u2212": "&minus;", "\u2217": "&lowast;",
    "\u221A": "&radic;", "\u221D": "&prop;", "\u221E": "&infin;", "\u2220": "&ang;",
    "\u2227": "&and;", "\u2228": "&or;", "\u2229": "&cap;", "\u222A": "&cup;",
    "\u222B": "&int;", "\u2234": "&there4;", "\u223C": "&sim;", "\u2245": "&cong;",
    "\u2248": "&asymp;", "\u2260": "&ne;", "\u2261": "&equiv;", "\u2264": "&le;",
    "\u2265": "&ge;", "\u2282": "&sub;", "\u2283": "&sup;", "\u2284": "&nsub;",
    "\u2286": "&sube;", "\u2287": "&supe;", "\u2295": "&oplus;", "\u2297": "&otimes;",
    "\u22A5": "&perp;", "\u22C5": "&sdot;", "\u2308": "&lceil;", "\u2309": "&rceil;",
    "\u230A": "&lfloor;", "\u230B": "&rfloor;", "\u2329": "&lang;", "\u232A": "&rang;",
    "\u25CA": "&loz;", "\u2660": "&spades;", "\u2663": "&clubs;", "\u2665": "&hearts;"
  };
  function replaceEntities(value) {
    // TODO : Is there a faster way to perform this operation?
    return value.replace(/./g, function(x) { return ENTITY_LUT[x] || x; });
  }

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
      this.writer.write(replaceEntities(text.data));
    },
    printAttr: function(attr) {
      this.writer.write(" ");
      this.writer.write(attr.nodeName);
      this.writer.write("=\"");
      this.writer.write(replaceEntities(attr.nodeValue));
      this.writer.write("\"");
    },
    printComment: function(comment) {
      this.writer.write("<!--");
      this.writer.write(replaceEntities(comment.data));
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