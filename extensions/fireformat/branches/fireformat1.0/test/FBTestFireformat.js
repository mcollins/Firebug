/* See license.txt for terms of usage */
var Format = {};
Components.utils.import("resource://fireformat/formatters.jsm", Format);

var Firebug = FW.Firebug;

var FBTestFireformat = {
    PrefHandler: function(prefs) {
      var Firebug = FW.Firebug;
      var original = [];
      for (var i = 0; i < prefs.length; i++) {
        original.push(Firebug.getPref(Firebug.prefDomain, prefs[i]));
      }
      
      return {
        setPrefs: function() {
          for (var i = 0; i < prefs.length; i++) {
            Firebug.setPref(Firebug.prefDomain, prefs[i], arguments[i]);
          }
        },
        reset: function() {
          this.setPrefs.apply(this, original);
        }
      };
    }
};