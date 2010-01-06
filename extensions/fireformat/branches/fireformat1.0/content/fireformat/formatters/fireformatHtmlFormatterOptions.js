/* See license.txt for terms of usage */

(function() {
  const Cc = Components.classes;
  const Ci = Components.interfaces;

  const PrefService = Cc["@mozilla.org/preferences-service;1"];
  const prefs = PrefService.getService(Ci.nsIPrefBranch2);

  var formatter = Fireformat.Formatters.getFormatter("com.incaseofstairs.fireformatHTMLFormatter");

  function getTestBox() {
    return document.getElementById("htmlFormatterTest");
  }
  function getPreviewDoc() {
    return document.getElementById("htmlPreviewDoc").contentDocument;
  }

  FireformatOptions.updateHtmlPreview = function() {
    setTimeout(function() {
      var text = getTestBox();
      text.replaceWhitespace = prefs.getBoolPref("extensions.firebug.fireformat.preview.showWhitespace");
      text.wrapPosition = prefs.getIntPref("extensions.firebug.fireformatHtmlFormatter.wrapSize");
      text.tabSize = prefs.getIntPref("extensions.firebug.fireformatHtmlFormatter.tabSize");
      text.value = formatter.format(getPreviewDoc());
      window.sizeToContent();
    }, 0);
  };
})();