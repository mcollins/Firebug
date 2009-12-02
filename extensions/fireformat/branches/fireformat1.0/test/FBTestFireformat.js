/* See license.txt for terms of usage */
var Format = {};
Components.utils.import("resource://fireformat/formatters.jsm", Format);

var Firebug = FW.Firebug;

var FBTestFireformat = {
    PrefHandler: function(prefs) {
      var original = [], globals = {};
      for (var i = 0; i < prefs.length; i++) {
        original.push(Firebug.getPref(Firebug.prefDomain, prefs[i]));
      }
      
      return {
        setGlobal: function(pref, value) {
          if (!globals.hasOwnProperty(pref)) {
            globals[pref] = Firebug.getPref(Firebug.prefDomain, pref);
          }
          Firebug.setPref(Firebug.prefDomain, pref, value);
        },
        setPrefs: function() {
          for (var i = 0; i < arguments.length; i++) {
            Firebug.setPref(Firebug.prefDomain, prefs[i], arguments[i]);
          }
        },
        reset: function() {
          this.setPrefs.apply(this, original);

          for (var x in globals) {
            if (globals.hasOwnProperty(x)) {
              Firebug.setPref(Firebug.prefDomain, x, globals[x]);
            }
          }
          globals = {};
        }
      };
    }
};