user_pref("xpinstall.whitelist.required", "false");
user_pref("browser.rights.3.shown", true);
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("xpinstall.whitelist.add", "getfirebug.com");
user_pref("extensions.fbtest.enableTestLogger", true);
user_pref("extensions.logging.enabled", true);  // debug info for swarm installs.
// We don't want to change the versions of extn we are testing
user_pref("extensions.update.enabled", false);