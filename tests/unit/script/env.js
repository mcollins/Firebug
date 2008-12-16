/* 
 * @author: Jan Odvarko, www.janodvarko.cz
 */

var layoutTimeout = 300;
var prefDomain = "extensions.firebug";
var enablePrivilege = netscape.security.PrivilegeManager.enablePrivilege;

// Shortcuts to Firebug global objects.
enablePrivilege("UniversalXPConnect");
var browser = fireunit.browser;
var Firebug = browser.Firebug;
var FBL = browser.FBL;
var FirebugChrome = browser.FirebugChrome;
var FirebugContext = browser.FirebugContext;
var FBTrace = browser.FBTrace;
