Fireformat:
Fireformat is a Firebug extension which allows for user configurable formatting of CSS and HTML objects.
This is intended to be a library for other extensions and may be accessed by any extension installed in the same
profile as the Fireformat code.

Usage:
All Fireformat functionality is exposed through the resource://fireformat/formatters.jsm JS module. To access this
module one needs to use the Components.utils.import API (Further documentation available here:
https://developer.mozilla.org/en/Components.utils.import).

Ex:
  var Format = {};
  Components.utils.import("resource://fireformat/formatters.jsm", Format);

This module exposes the formatters as registered by the registerFormatter API (see below), meaning that the caller
can interact directly with the format method exposed by the formatter.

  Format.Formatters.getCSSFormatter().format(cssObject);

Formatter lookup may be done with any of the following methods:
  - Formatters.getCSSFormatter() : Retrieves the currently selected CSS formatter
  - Formatters.getHTMLFormatter() : Retrieves the currently selected HTML formatter
  - Formatters.getFormatter(name) : Retrieves a formatter by name
  - Formatters.getFormatters() : Retrieves array containing all formatters

Extending:
Fireformat allows for custom formatters. This allows for Fireformat clients to format objects in any custom manner
not currently supported by the bundled formatters.

Formatters are simple objects registered with the Fireformat module. These objects must expose the
following members:
{
  type: "HTML" or "CSS" - Type of document that the formatter can support.
  name: Unique name of the formatter. GUID or domain-name based uniquifiers should be used to prevent conflict
      i.e. "com.incaseofstairs.fireformatHTMLFormatter"
  display: Translated display name for the formatter. This will be displayed to the user when selecting the
      formatter they would like to use
  format: function(object)
      Method that performs the actuall formatting. The passed in object may be any type of object possible
      in the registered document type. (I.e. any subclass of Node or CSSRule as well as whole documents)
}
This structure is defined in formatters.jsm as FormatterBase.

Two options are given to register these formatter objects:
1) Fireformat.registerFormatter(formatter) - Available when overlaying chrome://firebug/content/firebugOverlay.xul
2) resource://fireformat/formatters.jsm

If the Formatter is registered outside of the scope of firebugOverlay, the formatters JS Module can be called directly
rather than using the Fireformat object.

Since the retrieval APIs return the same formatter objects as registered, it is recommended that formatter implementors
code defensively and use getters, the module pattern, etc to prevent corruption of the formatter.

Ex:
  var Format = {};
  Components.utils.import("resource://fireformat/formatters.jsm", Format);
  Format.Formatters.registerFormatter(formatter);


Dependencies:
Firediff requires Firebug 1.5. Prior versions may work although support of these
environments is left to the user of Fireformat to test and verify.

Open Issues:
See TODO.txt or search the Firebug Google Code project for the fireformat label.
(http://code.google.com/p/fbug/issues/list?q=label%3Afireformat)
