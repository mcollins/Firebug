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

// Handle unexpected errors on the page.
window.onerror = function(errType, errURL, errLineNum) {
    var path = window.location.pathname;
    var fileName = path.substr(path.lastIndexOf("/") + 1);
    var errorDesc = errType + " (" + errLineNum + ")" + " " + errURL;
    FBTrace.sysout(fileName + " ERROR " + errorDesc);
    fireunit.ok(false, errorDesc);
    fireunit.testDone();
    return false;
}
