/* See license.txt for terms of usage */

var EXPORTED_SYMBOLS = [ "Formatters", "FormatterBase" ];

const Cc = Components.classes;
const Ci = Components.interfaces;

const nsIPrefBranch2 = Ci.nsIPrefBranch2;
const PrefService = Cc["@mozilla.org/preferences-service;1"];
const prefs = PrefService.getService(nsIPrefBranch2);

/**
 * Base interface that all formatters must implement. This may be duck typed.
 */
var FormatterBase = {
  /**
   * Internal name of the formatter. This must be unique for each formatter
   */
  name: "",
  
  /**
   * Display name of the formatter. The formatter extension should perform the
   * necessary i18n for this value.
   */
  display: "",
  
  /**
   * Type of object this formatter supports. May be "CSS" or "HTML".
   */
  type: "",
  
  /**
   * Formats the given object.
   * 
   * @return {String} serialized form of object
   */
  format: function(object) {}
};

let (formatters = []) {
  /**
   * Formatter registry.
   */
  var Formatters = {
    /**
     * Registers a formatter in the extension listing.
     */
    registerFormatter: function(formatter) {
      formatters.push(formatter);
    },
  
    /**
     * Removes a currently registered formatter
     */
    unregisterFormatter: function(formatter) {
      for (var i = 0; i < formatters.length; i++) {
        if (formatters[i].name == name) {
          formatters.splice(i, 1);
          return;
        }
      }
    },
  
    /**
     * Retrives the formatter with the given name.
     */
    getFormatter: function(name) {
      for (var i = 0; i < formatters.length; i++) {
        if (formatters[i].name == name) {
          return formatters[i];
        }
      }
    },

    /**
     * Retrieves the currently selected CSS formatter.
     * 
     * This is defined by the "extensions.firebug.fireformat.cssFormatter" preference.
     */
    getCSSFormatter: function() {
      return this.getFormatter(prefs.getCharPref("extensions.firebug.fireformat.cssFormatter"));
    },

    /**
     * Retrieves the currently selected HTML formatter.
     * 
     * This is defined by the "extensions.firebug.fireformat.htmlFormatter" preference.
     */
    getHTMLFormatter: function() {
      return this.getFormatter(prefs.getCharPref("extensions.firebug.fireformat.htmlFormatter"));
    },

    /**
     * Retrieves all registered formatters.
     */
    getFormatters: function() {
      return formatters.slice();
    }
  };
}