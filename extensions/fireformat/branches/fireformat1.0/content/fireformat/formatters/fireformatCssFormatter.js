/* See license.txt for terms of usage */
FBL.ns(function() { with (FBL) {
  var i18n = document.getElementById("strings_fireformat");

  var Format = {};
  Components.utils.import("resource://fireformat/formatters.jsm", Format);
  Components.utils.import("resource://fireformat/writer.jsm", Format);

  function createIterStatus(collection, index, parent) {
    return {
        parent: parent,
        collection: collection,
        index: index,
        first: index == 0,
        last: index == (collection.length-1)
    };
  }
  var CSSFormatter = function(writer, prefCache) {
    this.writer = writer;
    this.prefCache = prefCache;

    this.helpers = {};
    this.helpers[CSSRule.STYLE_RULE] = this.printStyleRule;
    this.helpers[CSSRule.CHARSET_RULE] = this.printCharsetRule;
    this.helpers[CSSRule.IMPORT_RULE] = this.printImportRule;
    this.helpers[CSSRule.MEDIA_RULE] = this.printMediaRule;
    this.helpers[CSSRule.FONT_FACE_RULE] = this.printFontFaceRule;
  };
  CSSFormatter.prototype = {
    printNode: function(object, iterStatus) {
      var helper = this.helpers[object.type] || this.printSheet;  // Default to sheet if we aren't sure what this is

      helper.call(this, object, iterStatus);
    },
    printSheet: function(sheet) {
      var cssRules = sheet.cssRules;
      for (var i = 0; i < cssRules.length; i++) {
        var iterStatus = createIterStatus(cssRules, i);
        this.printNode(cssRules[i], iterStatus);
      }
    },
    printSelectorText: function(selectorText) {
      var join = new Array(this.prefCache.getPref("selectorText.spaceCount")+1).join(" "),
          indent = this.prefCache.getPref("selectorText.indentLevel"),
          tokensPerLine = this.prefCache.getPref("selectorText.selectorsPerLine");

      var selectors = selectorText.split(/\s*,\s*/).map(function(value, i, baseArray) {
        if (i+1 < baseArray.length) {
          return value + ",";
        } else {
          return value;
        }
      });
      
      // TODO : Use offset at all?
      this.writer.write(Fireformat.wrapTokens(this.prefCache, selectors, join, tokensPerLine, indent));
    },
    printStyleRule: function(styleRule, iterStatus) {
      this.printSelectorText(styleRule.selectorText);
      this.writer.write(" {\n");    // TODO : Formatting of this is the next to work on
      this.writer.increaseIndent();
      this.printStyleDeclaration(styleRule.style, iterStatus);
      this.writer.decreaseIndent();
      this.writer.write("}\n");
      if (iterStatus && !iterStatus.last) {
        this.writer.write("\n");
      }
    },
    printFontFaceRule: function(styleRule, iterStatus) {
      this.writer.write("@font-face {\n");
      this.writer.increaseIndent();
      this.printStyleDeclaration(styleRule.style, iterStatus);
      this.writer.decreaseIndent();
      this.writer.write("}\n");
      this.writer.write("\n");
    },
    printStyleDeclaration: function(style, iterStatus) {
      // Copied from CSS Panel's getRuleProperties implementation
      // TODO : Attempt to unify these as a lib method?
      var lines = style.cssText.match(/(?:[^;\(]*(?:\([^\)]*?\))?[^;\(]*)*;?/g),
          propRE = /\s*([^:\s]*)\s*:\s*(.*?)\s*(! important)?;?$/,
          line, m, i = 0;
      while(line=lines[i++]){
        m = propRE.exec(line);
        if(!m)    continue;
        //var name = m[1], value = m[2], important = !!m[3];
        if (m[2]) {
          this.printProperty(m[1], m[2], m[3]);
        }
      }
    },
    printProperty: function(propName, value, priority, iterStatus) {
      this.writer.write(propName + ": " + value + (priority ? " " + priority : "") + ";\n");
    },
    printMediaRule: function(mediaRule, iterStatus) {
      this.writer.write("@media " + mediaRule.media.mediaText + " {\n");
      this.writer.increaseIndent();
      var cssRules = mediaRule.cssRules;
      
      for (var i = 0; i < cssRules.length; i++) {
        var childIterStatus = createIterStatus(cssRules, i, iterStatus);
        this.printNode(cssRules[i], childIterStatus);
      }

      this.writer.decreaseIndent();
      this.writer.write("}\n");
      this.writer.write("\n");
    },
    printImportRule: function(importRule, iterStatus) {
      this.writer.write("@import url(\"" + importRule.href + "\");\n");
      var nextSibling = iterStatus && iterStatus.collection[iterStatus.index+1];
      if (nextSibling && nextSibling.type != CSSRule.IMPORT_RULE) {
        this.writer.write("\n");
      }
    },
    printCharsetRule: function(charsetRule, iterStatus) {
      this.writer.write("@charset \"" + charsetRule.encoding + "\";\n");
    }
  };

  Format.Formatters.registerFormatter({
    type: "CSS",
    name: "com.incaseofstairs.fireformatCSSFormatter",
    display: i18n.getString("FireformatCSSFormatter"),
    format: function(object) {
      var writer = new Format.Writer("  "),
          prefCache = new Fireformat.PrefCache("extensions.firebug.fireformatCssFormatter");
      new CSSFormatter(writer, prefCache).printNode(object);
      return writer.toString();
    }
  });
}});