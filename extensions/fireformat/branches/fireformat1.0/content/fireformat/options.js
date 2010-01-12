/* See license.txt for terms of usage */
var Fireformat = {};
Components.utils.import("resource://fireformat/formatters.jsm", Fireformat);

var FireformatOptions = {};
FireformatOptions.loadFormatters = function() {
  function getPopup(listId) {
    var list = document.getElementById(listId);
    return list.getElementsByTagName("menupopup")[0];
  }
  function setValue(listId) {
    var list = document.getElementById(listId),
        pref = prefPane.preferenceForElement(list);
    list.value = pref.value;
  }

  var prefPane = document.getElementById("ffmt_formatters"),
      htmlPopup = getPopup("ffmt_combo_html"),
      cssPopup = getPopup("ffmt_combo_css"),
      formatters =  Fireformat.Formatters.getFormatters();

  for (var i = 0; i < formatters.length; i++) {
    var menuItem = document.createElement("menuitem"),
        formatter = formatters[i];
    menuItem.setAttribute("label", formatter.display || formatter.name);
    menuItem.setAttribute("value", formatter.name);
    (formatter.type == "HTML" ? htmlPopup : cssPopup).appendChild(menuItem);
  }

  setValue("ffmt_combo_html");
  setValue("ffmt_combo_css");
};

FireformatOptions.OptionsPrefCache = function(prefsTag, prefDomain) {
  this.prefsTag = prefsTag;
  this.prefDomain = prefDomain;
  this.cache = {};
};
FireformatOptions.OptionsPrefCache.prototype = {
    getPref: function(name) {
      if (this.cache.hasOwnProperty(name)) {
        return this.cache[name];
      }
      
      var prefTag = this.prefsTag.getElementsByAttribute("name", this.prefDomain + "." + name)[0],
          ret = prefTag && prefTag.value;
      if (prefTag) {
        this.cache[name] = ret;
      }
      return ret;
    }
};
