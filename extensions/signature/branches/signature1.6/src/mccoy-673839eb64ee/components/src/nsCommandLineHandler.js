/*
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is McCoy.
#
# The Initial Developer of the Original Code is
# the Mozilla Foundation <http://www.mozilla.org/>.
# Portions created by the Initial Developer are Copyright (C) 2007
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Dave Townsend <dtownsend@oxymoronical.com>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****
*/

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function CommandLineHandler() {
}

CommandLineHandler.prototype = {
  handle: function(aCmdLine)
  {
    try {
      // Initialise the key service. Will prompt for password if there is one.
      var ks = Cc["@toolkit.mozilla.org/keyservice;1"].
               getService(Ci.nsIKeyService);
    }
    catch (e) {
      // Chances are the user cancelled the password dialog, either way it's bad
      throw Components.results.NS_ERROR_ABORT;
    }
  },
  
  helpInfo: "",
  
  classDescription: "McCoy Command Line Handler",
  contractID: "@mozilla.org/mccoy/mccoy-clh;1",
  classID: Components.ID("{2a349418-834c-43c7-a139-de34c0d97c97}"),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsICommandLineHandler]),
  _xpcom_categories: [{ category: "command-line-handler", entry: "x-mccoy" }]
};

function NSGetModule(compMgr, fileSpec)
  XPCOMUtils.generateModule([CommandLineHandler]);
