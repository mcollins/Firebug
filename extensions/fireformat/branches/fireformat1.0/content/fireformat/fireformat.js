/* See license.txt for terms of usage */
var Fireformat = FBL.ns(function() {
  var Format = {};
  Components.utils.import("resource://fireformat/formatters.jsm", Format);

  /**
   * Convenience wrapper around the formatters js module registration method.
   */
  this.registerFormatter = function(formatter) {
    return Format.Formatters.registerFormatter(formatter);
  };

  /**
   * Generates a repeating string count number of times.
   */
  this.repeatString = function(string, count) {
    return new Array(count+1).join(string);
  },

  /**
   * Takes a collection of objects and concatenates, wrapping when the
   * length of each line exceeds the wrapSize preference.
   * 
   * @param {PrefCache} prefCache Preference lookup cache
   * @param {Array of strings} tokens Tokens to concatenate
   * @param {String} join Token to insert between each token (excluding wrapped joins)
   * @param {int} tokensPerLine Optional parameter that specifies the maximum number of tokens
   *            on a single line. Undefined or less than one prevents wrapping on this condition.
   * @param {int} indentLevel Optional parameter that specifies the indent for each line after the first.
   *            This uses the indent settings defined on prefCache. Defaults to zero.
   * @param {int} offset Optional parameter that specifies the global indent
   *            that will be applied to this final output. Defaults to 0
   */
  this.wrapTokens = function(prefCache, tokens, join, tokensPerLine, indentLevel, offset) {
    var wrapSize = prefCache.getPref("wrapSize")-(offset||0),
        indent = this.repeatString(prefCache.getPref("indentChar"), prefCache.getPref("indentCount")),
        totalIndent = this.repeatString(indent, indentLevel||0),

        tokenLen = tokens.length,
        curTokens = [],
        curLen = 0, curToken = 0,
        lines = [];
    for (var i = 0; i < tokenLen; i++) {
      var token = tokens[i],
          curJoin = token.join !== undefined ? token.join : join;
      curTokens.push(token.value !== undefined ? token.value : token);
      curLen += curTokens[curTokens.length-1].length + (curTokens.length > 1 ? curJoin.length : 0);
      curToken++;

      if (!(tokens[i+1]||{}).nowrap && ((wrapSize > 0 && curLen >= wrapSize) || (tokensPerLine > 0 && curToken >= tokensPerLine))) {
        lines.push(curTokens.join(""));
        curTokens = [totalIndent];
        curLen = totalIndent.length;  curToken = 0;
      } else if (i+1 < tokenLen){
        curTokens.push(curJoin);
      }
    }
    if (curTokens.length > 1 || curTokens.length == tokenLen) {
      lines.push(curTokens.join(""));
    }
    return lines.join("\n");
  };

  /**
   * TODO : Proper JS Docs
   */
  this.PrefCache = function(prefDomain) {
    this.prefDomain = prefDomain;
    this.cache = {};
  };
  this.PrefCache.prototype = {
      getPref: function(name) {
        if (this.cache.hasOwnProperty(name)) {
          return this.cache[name];
        }
        
        var ret = Firebug.getPref(this.prefDomain, name);
        if (!(name in this.cache)) {
          this.cache[name] = ret;
        }
        return ret;
      }
  };

  function getDisplayLen(value, tabSize) {
    var len = value.length;
    if (tabSize > 1) {
      tabSize--;
      var TAB_COUNT = /\t/g;
      while (TAB_COUNT.exec(value)) {
        len += tabSize;
      }
    }
    return len;
  }

  /**
   * TODO : Proper jsdoc
   */
  this.Writer = function(prefCache) {
    this.indentChar = prefCache.getPref("indentChar");
    this.indentToken = Fireformat.repeatString(this.indentChar, prefCache.getPref("indentCount"));
    this.wrapLength = prefCache.getPref("wrapSize");
    this.tabSize = prefCache.getPref("tabSize") || 2;

    this.lines = [];
    this.indent = 0;
    this.indentStr = "";
    this.lineLength = 0;
    this.tokenCount = 0;
    this.lineCount = 0;
    this.completeLine = true;
  };
  this.Writer.prototype = {
    toString: function() {
      return this.lines.join("");
    },
    
    write: function(text) {
      var value = text.value !== undefined ? text.value : text,
          join = (this.nextJoin !== undefined ? this.nextJoin : this.defaultJoin) || "";
          newLines = value.split("\n"),
          preformatted = newLines.length > 1 && text.preformatted,
          joinLen = 0;

      // The new line tracking logic becomes confused if we try to write the empty string
      if (value === "")     return;

      // Do not join if we are outputting a new line 
      if (this.completeLine) {
        join = "";
      } else if (text.prefix && join.indexOf("\n") == -1) {
        join += text.prefix;
      }

      if (this.lines.length) {
        var newLength = this.lineLength + join.length;

        // If explicit wrapping is not in the token then we have to check to see if we need to
        // wrap, otherwise join using the current join value
        if (!text.nowrap
            && newLines[0]  
            && ((this.wrapLength > 0 && newLength > this.wrapLength)
                || (this.tokensPerLine > 0 && this.tokenCount+1 > this.tokensPerLine))) {
          this.lines.push("\n");
          this.lineCount++;
          this.completeLine = true;
          this.lineLength = 0;
          this.tokenCount = 0;
        } else {
          var joinLines = join.split("\n");
          joinLen = getDisplayLen(joinLines[0], this.tabSize);

          newLines[0] = joinLines[joinLines.length-1] + newLines[0];
          for (var i = joinLines.length-1; i > 0; i--) {
            newLines.unshift(joinLines[i-1]);
          }
        }
      }

      if (text.indentOffset) {
        var indentSize = getDisplayLen(this.indentChar, this.tabSize),
            len = this.lineLength + joinLen;

        this.offsetStr = Fireformat.repeatString(this.indentChar, Math.ceil(len/indentSize));
      }

      for (var i = 0; i < newLines.length; i++) {
        // A new line occurs when the previous line was complete, and we are not the
        // or the last entry has content
        if (this.completeLine && (i < newLines.length - 1 || newLines[i])) {
          // Indent if we are not preformatted or are outputting the first line of a preformatted token
          if (!preformatted || !i) {
            newLines[i] = (this.offsetStr || "") + this.indentStr + newLines[i];
          }
          this.lineCount++;
        }

        // If the final line is not blank then we did not end on a new line char
        this.completeLine = i != newLines.length - 1 || !newLines[i];
      }

      if (newLines.length > 1) {
        this.lineLength = getDisplayLen(newLines[newLines.length-1], this.tabSize);
        this.tokenCount = newLines[newLines.length-1] ? 1 : 0;
      } else {
        this.lineLength += getDisplayLen(newLines[newLines.length-1], this.tabSize);
        this.tokenCount++;
      }

      if (text.resetOffset) {
        this.offsetStr = "";
      }

      this.nextJoin = text.join;
      this.lines.push(newLines.join("\n"));
    },
    writeTokens: function(tokens, join, tokensPerLine, indentOffset) {
      var originalJoin = this.defaultJoin,
          originalTokens = this.tokensPerLine,
          originalIndent = this.indent,

          len = tokens.length;

      this.setDefaultJoin(join);
      this.setTokensPerLine(tokensPerLine);

      // Output the first token without indent as the indent as passed into
      // this function only applies to lines after the first 
      if (len) {
        this.write(tokens[0]);
      }

      this.increaseIndent(indentOffset);

      for (var i = 1; i < len; i++) {
        this.write(tokens[i]);
      }

      this.setDefaultJoin(originalJoin);
      this.setTokensPerLine(originalTokens);
      this.setIndent(originalIndent);
    },
    setTokensPerLine: function(tokensPerLine) {
      this.tokensPerLine = tokensPerLine;
    },
    setDefaultJoin: function(join) {
      this.defaultJoin = join;
    },
    setIndent: function(indent) {
      this.indent = Math.max(indent, 0);
      this.indentStr = Fireformat.repeatString(this.indentToken, this.indent);
    },
    increaseIndent: function(offset) {
      this.setIndent(this.indent + (offset !== undefined ? offset : 1));
    },
    decreaseIndent: function(offset) {
      this.setIndent(this.indent - (offset !== undefined ? offset : 1));
    }
  };
});