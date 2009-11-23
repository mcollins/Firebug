/* See license.txt for terms of usage */

var EXPORTED_SYMBOLS = [ "Writer" ];

/**
 * Object passed to the formatter used to output the formatted object
 */
var Writer = function(indentToken) {
  this.lines = [];
  this.indentToken = indentToken;
  this.indent = 0;
  this.completeLine = true;
};
Writer.prototype = {
  toString: function() {
    return this.lines.join("");
  },
  write: function(text) {
    var newLines = text.split("\n");
    var indentStr = "";
    for (var i = 0; i < this.indent; i++) {
      indentStr += this.indentToken;
    }

    for (var i = 0; i < newLines.length; i++) {
      if (!this.completeLine) {
        this.completeLine = true;
      } else if (i < newLines.length - 1 || newLines[i]){
        newLines[i] = indentStr + newLines[i];
        
        // If the final line is not blank then we did not end on a new line char
        this.completeLine = i != newLines.length - 1;
      }
    }
    this.lines.push(newLines.join("\n"));
  },
  increaseIndent: function() {
    this.indent++;
  },
  decreaseIndent: function() {
    if (this.indent > 0) {
      this.indent--;
    }
  }
};