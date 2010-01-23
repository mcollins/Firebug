/* See license.txt for terms of usage */
FBL.ns(function() { with (FBL) {

const FOCUSED_CLASS = "contentFocused";

var i18n = document.getElementById("strings_firefocus");

Firebug.FocusModule = extend(Firebug.Module, {
  //////////////////////////////////////////////
  // Module
  initialize: function(prefDomain, prefNames) {
    var prefs = [ "firefocus.logFocus", "firefocus.highlightFocus" ];
    for (var i = 0; i < prefs.length; i++) {
      this.updateOption(prefs[i], Firebug.getPref(prefDomain, prefs[i]));
    }
  },
  updateOption: function(name, data) {
    switch (name) {
    case "firefocus.logFocus":
      this.prefLogFocus = data;
      break;

    case "firefocus.highlightFocus":
      this.prefHighlightFocus = data;
      break;
    }
  },

  initContext: function(context, persistedState) {
    this.monitorContext(context);
  },
  destroyContext: function(context, persistedState) {
    this.unmonitorContext(context);
  },
  showPanel: function(browser, panel) {
    if (panel.name == "html" || panel.name == "console") {
      this.addStyleSheet(panel.document);
    }
  },

  //////////////////////////////////////////////
  // Self
  focusLogger: function(event, context) {
    var panel = context.getPanel("html", true),
        target = event.target;

    if (this.prefLogFocus && Firebug.Console.isAlwaysEnabled()) {
      Firebug.Console.logFormatted([i18n.getString("log.FocusIn"), target], context, "focusIn", true, null);
    }

    if (panel && target.parentNode) {
      var objectBox = Firebug.scrollToMutations || Firebug.expandMutations
          ? panel.ioBox.createObjectBox(target)
          : panel.ioBox.findObjectBox(target);
      this.highlightFocus(objectBox, objectBox, FOCUSED_CLASS, panel);
    }
  },
  blurLogger: function(event, context) {
    var panel = context.getPanel("html", true),
        target = event.target;

    if (this.prefLogFocus && Firebug.Console.isAlwaysEnabled()) {
      Firebug.Console.logFormatted([i18n.getString("log.FocusOut"), target], context, "focusOut", true, null);
    }

    if (panel) {
      var focused = panel.panelNode.getElementsByClassName(FOCUSED_CLASS);
      for (var i = focused.length; i > 0; i--) {
        removeClass(focused[i-1], FOCUSED_CLASS);
      }
    }
  },

  // Much of this logic mirors the Firebug bug implementation of HTMLPanel.highlightFocus
  // This has the slight differences that rather than using a class timeout, the class
  // remains on until blur is called.
  highlightFocus: function(elt, objectBox, type, panel) {
    if (!elt || !this.prefHighlightFocus)
        return;

    var ioBox = panel.ioBox,
        panelNode = panel.panelNode,
        context = panel.context;

    if (Firebug.scrollToMutations || Firebug.expandMutations) {
      if (context.focusTimeout) {
          context.clearTimeout(context.focusTimeout);
          delete context.focusTimeout;
      }

      context.focusTimeout = context.setTimeout(function() {
        ioBox.openObjectBox(objectBox);

        if (Firebug.scrollToMutations)
          scrollIntoCenterView(objectBox, panelNode);
      }, 200);
    }

    setClass(elt, type);
  },

  addStyleSheet: function(doc) {
    // Make sure the stylesheet isn't appended twice.
    var id = "fireFocusCss";
    if ($(id, doc))   return;

    var styleSheet = createStyleSheet(doc, "chrome://firefocus/skin/firefocus.css");
    styleSheet.setAttribute("id", id);
    addStyleSheet(doc, styleSheet);
  },
  monitorContext: function(context) {
    var focusContext = this.getFocusContext(context);
    if (focusContext.focusLogger)    return;

    focusContext.focusLogger = bind(this.focusLogger, this, context);
    focusContext.blurLogger = bind(this.blurLogger, this, context);

    context.window.addEventListener("focus", focusContext.focusLogger, true);
    context.window.addEventListener("blur", focusContext.blurLogger, true);
  },
  unmonitorContext: function(context) {
    var focusContext = this.getFocusContext(context);
    if (!focusContext.focusLogger)    return;

    context.window.removeEventListener("focus", focusContext.focusLogger, true);
    context.window.removeEventListener("blur", focusContext.blurLogger, true);

    delete focusContext.focusLogger;
    delete focusContext.blurLogger;
  },
  getFocusContext: function(context) {
    context.focusContext = context.focusContext || {};
    return context.focusContext;
  }
});

Firebug.registerModule(Firebug.FocusModule);

}});