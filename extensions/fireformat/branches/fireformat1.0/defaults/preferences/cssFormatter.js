/* See license.txt for terms of usage */

/*
 * Formatter-wide preferences
 */
pref("extensions.firebug.fireformatCssFormatter.wrapSize", 80);
pref("extensions.firebug.fireformatCssFormatter.indentChar", ' ');
pref("extensions.firebug.fireformatCssFormatter.indentCount", 2);
pref("extensions.firebug.fireformatCssFormatter.tabSize", 2);

/*
 * CSS Selector text formatting.
 * 
 * Currently only allows for formatting between the tokens defined by the "," delimeter
 */
pref("extensions.firebug.fireformatCssFormatter.selectorText.selectorsPerLine", -1);
pref("extensions.firebug.fireformatCssFormatter.selectorText.spaceCount", 1);
pref("extensions.firebug.fireformatCssFormatter.selectorText.indentLevel", 0);

/*
 * CSS rule body formatting
 */
pref("extensions.firebug.fireformatCssFormatter.block.indentLevel", 1);
pref("extensions.firebug.fireformatCssFormatter.block.componentSeparator", "\n");
pref("extensions.firebug.fireformatCssFormatter.block.separatorBeforeOpen", " ");
pref("extensions.firebug.fireformatCssFormatter.block.separatorAfterOpen", "\n");
pref("extensions.firebug.fireformatCssFormatter.block.separatorBeforeClose", "\n");
pref("extensions.firebug.fireformatCssFormatter.block.separatorAfterClose", "\n");
pref("extensions.firebug.fireformatCssFormatter.block.separatorAfterLast", "");

/*
 * CSS Property text formatting.
 */
pref("extensions.firebug.fireformatCssFormatter.property.tokensPerLine", 5);
pref("extensions.firebug.fireformatCssFormatter.property.indentLevel", 1);
pref("extensions.firebug.fireformatCssFormatter.property.spaceBeforeColon", 0);
pref("extensions.firebug.fireformatCssFormatter.property.spaceBeforeValue", 1);
pref("extensions.firebug.fireformatCssFormatter.property.spaceBeforePriority", 1);
pref("extensions.firebug.fireformatCssFormatter.property.spaceBeforeSemicolon", 0);
pref("extensions.firebug.fireformatCssFormatter.property.valueSpaceCount", 1);

/*
 * Simple @rule text formatting
 * This applies to @import and @charset and the header for @media.
 */
pref("extensions.firebug.fireformatCssFormatter.atRule.tokensPerLine", 5);
pref("extensions.firebug.fireformatCssFormatter.atRule.indentLevel", 2);
pref("extensions.firebug.fireformatCssFormatter.atRule.spaceBeforeValue", 1);
pref("extensions.firebug.fireformatCssFormatter.atRule.spaceBeforeSemicolon", 0);
pref("extensions.firebug.fireformatCssFormatter.atRule.valueSpaceCount", 1);
pref("extensions.firebug.fireformatCssFormatter.atRule.typeSeparator", "\n");
