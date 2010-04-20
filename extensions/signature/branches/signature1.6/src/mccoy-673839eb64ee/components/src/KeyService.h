/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is McCoy.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation <http://www.mozilla.org/>.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Dave Townsend <dtownsend@oxymoronical.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

#include "nsIKeyService.h"
#include "nsIGenericFactory.h"
#include "pk11pub.h"

class KeyService : public nsIKeyService
{
public:
    NS_DECL_ISUPPORTS
    NS_DECL_NSIKEYSERVICE

    KeyService()
    {
    }
    nsresult Init();
    char* GetModulePassword(PK11SlotInfo *aSlot, PRBool aRetry);

private:
    ~KeyService();
    PK11SlotInfo *mSlot;
};

NS_GENERIC_FACTORY_CONSTRUCTOR_INIT(KeyService, Init)

// d38c73d6-b388-45d9-a980-640c665d7b21
#define KEYSERVICE_CID \
  { 0xd38c73d6, 0xb388, 0x45d9, \
    { 0xa9, 0x80, 0x64, 0x0c, 0x66, 0x5d, 0x7b, 0x21 } }

static const nsModuleComponentInfo components[] =
{
  { "Addon Update Signer KeyService",
    KEYSERVICE_CID,
    "@toolkit.mozilla.org/keyservice;1",
    KeyServiceConstructor
  }
};

NS_IMPL_NSGETMODULE(KeyServiceModule, components)
