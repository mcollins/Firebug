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

  var DOMFormatter = function(ownerDocument, writer, prefCache) {
    this.writer = writer;
    this.prefCache = prefCache;
    this.isXML = !!ownerDocument.xmlVersion;
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
      } else if (type == Node.PROCESSING_INSTRUCTION_NODE) {
        this.printProcessingInstruction(node);
      } else if (type == Node.COMMENT_NODE) {
        this.printComment(node);
      } else if (type == Node.DOCUMENT_NODE) {
        this.printDocument(node);
      } else if (type == Node.DOCUMENT_TYPE_NODE) {
        this.printDocType(node);
      } else if (type == Node.DOCUMENT_FRAGMENT_NODE) {
        this.printFragment(node);
      }
      
      // Not Impl in Mozilla: 
      // Node.ENTITY_NODE (https://developer.mozilla.org/En/DOM/Entity)
      // Node.ENTITY_REFRENCE_NODE (https://developer.mozilla.org/En/DOM/EntityReference)
      // Node.NOTATION_NODE (https://developer.mozilla.org/En/DOM/Notation)
    },
    
    printDocument: function(doc) {
      if (doc.xmlVersion) {
        this.writer.write({ value: "<?xml" });
        this.writer.write({ prefix: this.prefCache.getPref("xmlDocType.separatorBeforeVersion"), value: "version=\"" + doc.xmlVersion + "\"" });
        if (doc.xmlEncoding) {
          this.writer.write({ prefix: this.prefCache.getPref("xmlDocType.separatorBeforeEncoding"), value: "encoding=\"" + doc.xmlEncoding + "\"" });
        }
        this.writer.write({
          prefix: this.prefCache.getPref("xmlDocType.separatorBeforeStandalone"),
          value: "standalone=\"" + (doc.xmlStandalone ? "yes" : "no") + "\""
        });
        this.writer.write({ prefix: this.prefCache.getPref("xmlDocType.separatorBeforeClose"), value: "?>\n" });
      }

      this.printFragment(doc);
    },
    printFragment: function(doc) {
      var child = doc.firstChild;
      while (child) {
        this.printNode(child);
        child = child.nextSibling;
      }
    },
    printDocType: function(docType) {
      var name = docType.name;
      if (!this.isXML && this.prefCache.getPref("element.htmlNameToLower")) {
        name = name.toLowerCase();
      }

      this.writer.write({ value: "<!DOCTYPE" });
      this.writer.write({
        prefix: this.prefCache.getPref("docType.separatorBeforeName"),
        value: name,
        nowrap: true
      });
      if (docType.publicId) {
        this.writer.write({
          prefix: this.prefCache.getPref("docType.separatorBeforeExternalId"),
          value: "PUBLIC",
          nowrap: true
        });
        this.writer.write({
          prefix: this.prefCache.getPref("docType.separatorBeforePublicId"),
          value: "\"" + docType.publicId + "\"",
          nowrap: true
        });
      } else if (docType.systemId) {
        this.writer.write({
          prefix: this.prefCache.getPref("docType.separatorBeforeExternalId"),
          value: "SYSTEM",
          nowrap: true
        });
      }
      if (docType.systemId) {
        this.writer.write({
          prefix: this.prefCache.getPref("docType.separatorBeforeSystemId"),
          value: "\"" + docType.systemId + "\"",
          nowrap: true
        });
      }
      if (docType.internalSubset) {
        // Firefox reports the newlines as encoded here rather than converting to \n.
        // Normalize to make things sane
        this.writer.write({
          prefix: this.prefCache.getPref("docType.separatorBeforeInternalSubset"),
          value: "[" + docType.internalSubset.replace(/\r\n/g, "\n") + "]",
          nowrap: true
        });
      }
      this.writer.write({
        prefix: this.prefCache.getPref("docType.separatorBeforeClose"),
        value: ">\n",
        nowrap: true
      });
    },
    printProcessingInstruction: function(pi) {
      this.writer.write({ value "<?" + pi.nodeName, nowrap: true });
      this.writer.write({ prefix: this.prefCache.getPref("pi.separatorBeforeData"), value: pi.nodeValue, nowrap: true });
      this.writer.write({ value: "?>\n", nowrap: true });
    },
    printElement: function(el) {
      var childNodes = el.childNodes,
          tagName = el.tagName;
      if (!this.isXML && this.prefCache.getPref("element.htmlNameToLower")) {
        tagName = tagName.toLowerCase();
      }

      this.writer.write({ value: "<" + tagName, nowrap: true, indentOffset: true });

      var attrs = el.attributes;
      if (attrs.length) {
        var attrsPerLine = this.prefCache.getPref("attribute.attrsPerLine");

        this.writer.setIndent(this.prefCache.getPref("attribute.indentLevel"));
        this.writer.write({ value: this.prefCache.getPref("element.separatorBeforeAttributes"), nowrap: true });
        var curLineCount = 0, curLine = this.writer.lineCount;
        
        var idAttr, classAttr, sortedAttrs = [];
        for (var i = 0; i < attrs.length; i++) {
          var attr = attrs[i];
          if (attr.name == "id") {
            idAttr = attr;
          } else if (attr.name == "class") {
            classAttr = attr;
          } else {
            sortedAttrs.push(attr);
          }
        }
        sortedAttrs.sort(function(a, b) { return a.name.localeCompare(b.name); });
        if (classAttr) {
          sortedAttrs.unshift(classAttr);
        }
        if (idAttr) {
          sortedAttrs.unshift(idAttr);
        }
        
        for (var i = 0; i < sortedAttrs.length; i++) {
          if (curLineCount >= attrsPerLine) {
            this.writer.write("\n");
          }
          curLine = this.writer.lineCount;

          this.printAttr(sortedAttrs[i]);
          curLineCount++;
        }
        this.writer.setIndent(0);
      }

      if (childNodes.length || !this.isXML) {
        this.writer.write({ value: this.prefCache.getPref("element.separatorBeforeClose"), nowrap: true });
        this.writer.write({ value: ">", nowrap: true, resetOffset: true });
  
        for (var i = 0; i < childNodes.length; i++) {
          this.printNode(childNodes[i]);
        }

        if (childNodes.length || !FBL.selfClosingTags[tagName.toLowerCase()]) {
          this.writer.write({ value: "</" + tagName + ">", nowrap: true });
        }
      } else {
        // Not joining as this is simplier and there will never a be a wrap for this case, unless the separator itself is a wrap
        this.writer.write({ value: this.prefCache.getPref("element.separatorBeforeSelfClose"), nowrap: true });
        this.writer.write({ value: "/>", nowrap: true, resetOffset: true });
        this.writer.setIndent(0);
      }
    },
    printText: function(text) {
      this.writer.write({ value: replaceEntities(text.data), nowrap: true, preformatted: true });
    },
    printAttr: function(attr) {
      this.writer.write({
        prefix: this.prefCache.getPref("attribute.listSeparator"),
        value: attr.nodeName,
        join: this.prefCache.getPref("attribute.separatorBeforeEquals")
      });
      this.writer.write({ value: "=", join: this.prefCache.getPref("attribute.separatorBeforeValue"), nowrap: true });
      this.writer.write({ value: "\"" + replaceEntities(attr.nodeValue) + "\"", nowrap: true, preformatted: true });
    },
    printComment: function(comment) {
      this.writer.write({ value: "<!--", nowrap: true });
      this.writer.write({ value: replaceEntities(comment.data), nowrap: true, preformatted: true });
      this.writer.write({ value: "-->", nowrap: true });
    },
    printCDATA: function(cdata) {
      this.writer.write({ value: "<![CDATA[", nowrap: true });
      this.writer.write({ value: cdata.data, nowrap: true, preformatted: true });
      this.writer.write({ value: "]]>", nowrap: true });
    }
  };

  Fireformat.registerFormatter({
    type: "HTML",
    name: "com.incaseofstairs.fireformatHTMLFormatter",
    display: i18n.getString("FireformatHTMLFormatter"),
    format: function(object) {
      var prefCache = new Fireformat.PrefCache("extensions.firebug.fireformatHtmlFormatter"),
          writer = new Fireformat.Writer(prefCache);  
      new DOMFormatter(object.ownerDocument || object, writer, prefCache).printNode(object);
      return writer.toString();
    }
  });
}});