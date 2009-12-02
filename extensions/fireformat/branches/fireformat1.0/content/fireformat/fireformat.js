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

      if (!(tokens[i+1]||{}).nowrap && (curLen >= wrapSize || (tokensPerLine > 0 && curToken >= tokensPerLine))) {
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

  /**
   * TODO : Proper jsdoc
   */
  this.Writer = function(prefCache) {
    this.indentToken = Fireformat.repeatString(prefCache.getPref("indentChar"), prefCache.getPref("indentCount"));
    this.wrapLength = prefCache.getPref("wrapSize");

    this.lines = [];
    this.indent = 0;
    this.indentStr = "";
    this.lineLength = 0;
    this.tokenCount = 0;
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
          preformatted = newLines.length > 1 && text.preformatted;

      // Do not join if we are outputting a new line 
      if (this.completeLine) {
        join = "";
      }

      if (this.lines.length) {
        var newLength = this.lineLength + join.length;

        // If explicit wrapping is not in the token then we have to check to see if we need to
        // wrap, otherwise join using the current join value
        if (!text.nowrap
            && newLines[0]  
            && (newLength > this.wrapLength
                || (this.tokensPerLine > 0 && this.tokenCount+1 > this.tokensPerLine))) {
          this.lines.push("\n");
          this.completeLine = true;
          this.lineLength = 0;
          this.tokenCount = 0;
        } else {
          var joinLines = join.split("\n");
          newLines[0] = joinLines[joinLines.length-1] + newLines[0];
          for (var i = joinLines.length-1; i > 0; i--) {
            newLines.unshift(joinLines[i-1]);
          }
        }
      }

      for (var i = 0; i < newLines.length; i++) {
        // Indent if we
        // - Are not preformatted or are outputting the first line of a preformatted token
        // - Are outputting a new line with content
        if ((!preformatted || !i) && this.completeLine && (i < newLines.length - 1 || newLines[i])) {
          newLines[i] = this.indentStr + newLines[i];
        }
        // If the final line is not blank then we did not end on a new line char
        this.completeLine = i != newLines.length - 1 || !newLines[i];
      }

      if (newLines.length > 1) {
        this.lineLength = newLines[newLines.length-1].length;
        this.tokenCount = newLines[newLines.length-1] ? 1 : 0;
      } else {
        this.lineLength += newLines[newLines.length-1].length;
        this.tokenCount++;
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