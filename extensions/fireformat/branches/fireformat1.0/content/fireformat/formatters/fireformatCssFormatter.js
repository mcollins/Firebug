/* See license.txt for terms of usage */
FBL.ns(function() {
  var i18n = document.getElementById("strings_fireformat");

  function createIterStatus(collection, index, parent) {
    return {
        parent: parent,
        collection: collection,
        index: index,
        first: index == 0,
        last: index == (collection.length-1)
    };
  }
  function tokenizeSelector(selector) {
    // Break into tokens of strings, commas and surrounding whitespace and everything else
    var re = /(?:"(?:[^\n\r\f\\"]|(?:\\.))*")|(?:'(?:[^\n\r\f\\']|(?:\\.))*')|\s*(,)\s*|[^,'"]+/gm,
        curSet = [],
        ret = [];
    while (search = re.exec(selector)) {
      if (search[1] != ",") {
        curSet.push(search[0]);
      } else {
        ret.push(curSet.join("") || "");
        curSet = [];
      }
    }
    if (curSet.length) {
      ret.push(curSet.join(""));
    }
    return ret.map(function(value, i, baseArray) {
      if (i+1 < baseArray.length) {
        return value + ",";
      } else {
        return value;
      }
    });
  }
  function tokenizeValue(value) {
    // This expression does not strictly follow the CSS syntax declaration
    // Rather than limiting the characters that can be used as an escape,
    // we are just requiring that that a character follow the escape token
    // See: http://www.w3.org/TR/CSS21/syndata.html
    var re = /(?:"(?:[^\n\r\f\\"]|(?:\\[\s\S]))*")|(?:'(?:[^\n\r\f\\']|(?:\\[\s\S]))*')|\S+/gm,
        ret = [],
        search;
    while (search = re.exec(value)) {
      ret.push(search[0]);
    }
    return ret;
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
      this.printRuleList(sheet.cssRules);
      this.writer.write(this.prefCache.getPref("block.separatorAfterClose"));
    },
    printSelectorText: function(selectorText) {
      var join = Fireformat.repeatString(" ", this.prefCache.getPref("selectorText.spaceCount")),
          indent = this.prefCache.getPref("selectorText.indentLevel"),
          tokensPerLine = this.prefCache.getPref("selectorText.selectorsPerLine");

      var selectors = tokenizeSelector(selectorText);
      this.writer.writeTokens(selectors, join, tokensPerLine, indent);
    },
    printStyleRule: function(styleRule, iterStatus) {
      this.printSelectorText(styleRule.selectorText);
      this.printBlock(styleRule, iterStatus, function() { this.printStyleDeclaration(styleRule.style, iterStatus); });
    },
    printFontFaceRule: function(styleRule, iterStatus) {
      this.writer.write("@font-face");
      this.printBlock(styleRule, iterStatus, function() { this.printStyleDeclaration(styleRule.style, iterStatus); });
    },
    printStyleDeclaration: function(style, iterStatus) {
      var separator = this.prefCache.getPref("block.componentSeparator");

      // Copied from CSS Panel's getRuleProperties implementation
      // TODO : Attempt to unify these as a lib method?
      var lines = style.cssText.match(/(?:[^;\(]*(?:\([^\)]*?\))?[^;\(]*)*;?/g),
          propRE = /\s*([^:\s]*)\s*:\s*([\s\S]*?)\s*(! ?important)?;?$/,
          line, m, i = 0,
          props = [];
      while(line=lines[i++]){
        m = propRE.exec(line);
        if(!m)    continue;
        //var name = m[1], value = m[2], important = !!m[3];
        if (m[2]) {
          props.push({ name: m[1], value: m[2], important: m[3] });
        }
      }
      var propLen = props.length;
      for (var i = 0; i < propLen; i++) {
        var prop = props[i];
        this.printProperty(prop.name, prop.value, prop.important);
        if (i+1 < propLen) {
          this.writer.write(separator);
        }
      }
    },
    printProperty: function(propName, value, priority, iterStatus) {
      var joinBeforeColon = Fireformat.repeatString(" ", this.prefCache.getPref("property.spaceBeforeColon")),
          joinBeforeValue = Fireformat.repeatString(" ", this.prefCache.getPref("property.spaceBeforeValue")),
          joinBeforePriority = Fireformat.repeatString(" ", this.prefCache.getPref("property.spaceBeforePriority")),
          joinBeforeSemicolon = Fireformat.repeatString(" ", this.prefCache.getPref("property.spaceBeforeSemicolon")),
          joinValue = Fireformat.repeatString(" ", this.prefCache.getPref("property.valueSpaceCount")),
          indent = this.prefCache.getPref("property.indentLevel"),
          tokensPerLine = this.prefCache.getPref("property.tokensPerLine"),
          tokens = [];

      tokens.push({ value: propName, join: joinBeforeColon });
      tokens.push({ value: ":", join: joinBeforeValue, nowrap: true });

      var tokenValues = tokenizeValue(value);
      for (var i = 0; i < tokenValues.length; i++) {
        tokens.push({ value: tokenValues[i], join: joinValue, preformatted: true });
      }

      if (priority) {
        tokens[tokens.length-1].join = joinBeforePriority;
        tokens.push({ value: priority, join: joinBeforeSemicolon });
      } else {
        tokens[tokens.length-1].join = joinBeforeSemicolon;
      }

      tokens.push({ value: ";", nowrap: true });

      this.writer.writeTokens(tokens, "", tokensPerLine, indent);
    },
    printMediaRule: function(mediaRule, iterStatus) {
      var tokens = [];
      if (mediaRule.media.mediaText) {
        tokens.push.apply(tokens, tokenizeSelector(mediaRule.media.mediaText));
      }
      this.printAtValueRule("@media", tokens, mediaRule, iterStatus, false);
      this.printBlock(mediaRule, iterStatus, function() { this.printRuleList(mediaRule.cssRules, iterStatus); });
    },
    printBlock: function(object, iterStatus, contentFormatter) {
      var indent = this.prefCache.getPref("block.indentLevel"),
          sepBeforeOpen = this.prefCache.getPref("block.separatorBeforeOpen"),
          sepAfterOpen = this.prefCache.getPref("block.separatorAfterOpen"),
          sepBeforeClose = this.prefCache.getPref("block.separatorBeforeClose"),
          sepAfterClose = this.prefCache.getPref("block.separatorAfterClose"),
          sepAfterLast = this.prefCache.getPref("block.separatorAfterLast");

      // Separator
      this.writer.write(sepBeforeOpen);
      this.writer.write({ value: "{", join: sepAfterOpen });

      this.writer.increaseIndent(indent);
      contentFormatter.call(this, object, iterStatus);
      this.writer.decreaseIndent(indent);

      this.writer.write(sepBeforeClose);
      this.writer.write({ value: "}", join: (iterStatus && iterStatus.last) ? sepAfterLast : sepAfterClose });
    },
    printRuleList: function(cssRules, iterStatus) {
      var separator = this.prefCache.getPref("block.componentSeparator");

      var rulesLen = cssRules.length;
      for (var i = 0; i < rulesLen; i++) {
        var childIterStatus = createIterStatus(cssRules, i, iterStatus);
        this.printNode(cssRules[i], childIterStatus);
        if (i+1 < rulesLen) {
          this.writer.write(separator);
        }
      }
    },
    printImportRule: function(importRule, iterStatus) {
      var tokens = [ "url(\"" + importRule.href + "\")" ];
      if (importRule.media.mediaText) {
        tokens.push.apply(tokens, tokenizeSelector(importRule.media.mediaText));
      }
      this.printAtValueRule("@import", tokens, importRule, iterStatus, true);
    },
    printCharsetRule: function(charsetRule, iterStatus) {
      this.printAtValueRule("@charset", [ "\"" + charsetRule.encoding + "\"" ], charsetRule, iterStatus, true);
    },
    printAtValueRule: function(atText, valueTokens, atRule, iterStatus, close) {
      var joinBeforeValue = Fireformat.repeatString(" ", this.prefCache.getPref("atRule.spaceBeforeValue")),
          joinBeforeSemicolon = Fireformat.repeatString(" ", this.prefCache.getPref("atRule.spaceBeforeSemicolon")),
          joinValue = Fireformat.repeatString(" ", this.prefCache.getPref("atRule.valueSpaceCount")),
          indent = this.prefCache.getPref("atRule.indentLevel"),
          tokensPerLine = this.prefCache.getPref("atRule.tokensPerLine"),
          typeSeparator = this.prefCache.getPref("atRule.typeSeparator"),
          tokens = [];
    
      tokens.push({ value: atText, join: joinBeforeValue });
      for (var i = 0; i < valueTokens.length; i++) {
        tokens.push({ value: valueTokens[i], join: joinValue, preformatted: true });
      }
      tokens[tokens.length-1].join = joinBeforeSemicolon;
      if (close) {
        tokens.push({ value: ";", nowrap: true });
      }

      this.writer.writeTokens(tokens, "", tokensPerLine, indent);
      var nextSibling = iterStatus && iterStatus.collection[iterStatus.index+1];
      if (close && nextSibling && nextSibling.type != atRule.type) {
        this.writer.write(typeSeparator);
      }
    }
  };

  Fireformat.registerFormatter({
    type: "CSS",
    name: "com.incaseofstairs.fireformatCSSFormatter",
    display: i18n.getString("FireformatCSSFormatter"),
    format: function(object) {
      var prefCache = new Fireformat.PrefCache("extensions.firebug.fireformatCssFormatter"),
          writer = new Fireformat.Writer(prefCache);
      new CSSFormatter(writer, prefCache).printNode(object);
      return writer.toString();
    }
  });
});