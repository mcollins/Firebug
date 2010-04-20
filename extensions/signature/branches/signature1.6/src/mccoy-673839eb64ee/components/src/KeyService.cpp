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

#include "stdio.h"
#include "KeyService.h"
#include "KeyPair.h"
#include "KeyUtils.h"
#include "nsCOMPtr.h"
#include "nsCOMArray.h"
#include "nsArrayEnumerator.h"
#include "nsStringAPI.h"
#include "nss.h"
#include "keyhi.h"
#include "cryptohi.h"
#include "cert.h"
#include "nssb64.h"
#include "secdert.h"
#include "nsITokenPasswordDialogs.h"
#include "nsAppDirectoryServiceDefs.h"
#include "nsDirectoryServiceUtils.h"

static const unsigned char P[] = 
                           { 0x00, 0x8d, 0xf2, 0xa4, 0x94, 0x49, 0x22, 0x76,
                             0xaa, 0x3d, 0x25, 0x75, 0x9b, 0xb0, 0x68, 0x69,
                             0xcb, 0xea, 0xc0, 0xd8, 0x3a, 0xfb, 0x8d, 0x0c,
                             0xf7, 0xcb, 0xb8, 0x32, 0x4f, 0x0d, 0x78, 0x82,
                             0xe5, 0xd0, 0x76, 0x2f, 0xc5, 0xb7, 0x21, 0x0e,
                             0xaf, 0xc2, 0xe9, 0xad, 0xac, 0x32, 0xab, 0x7a,
                             0xac, 0x49, 0x69, 0x3d, 0xfb, 0xf8, 0x37, 0x24,
                             0xc2, 0xec, 0x07, 0x36, 0xee, 0x31, 0xc8, 0x02,
                             0x91 };
static const unsigned char Q[] = 
                           { 0x00, 0xc7, 0x73, 0x21, 0x8c, 0x73, 0x7e, 0xc8,
                             0xee, 0x99, 0x3b, 0x4f, 0x2d, 0xed, 0x30, 0xf4,
                             0x8e, 0xda, 0xce, 0x91, 0x5f };
static const unsigned char G[] = 
                           { 0x00, 0x62, 0x6d, 0x02, 0x78, 0x39, 0xea, 0x0a,
                             0x13, 0x41, 0x31, 0x63, 0xa5, 0x5b, 0x4c, 0xb5,
                             0x00, 0x29, 0x9d, 0x55, 0x22, 0x95, 0x6c, 0xef,
                             0xcb, 0x3b, 0xff, 0x10, 0xf3, 0x99, 0xce, 0x2c,
                             0x2e, 0x71, 0xcb, 0x9d, 0xe5, 0xfa, 0x24, 0xba,
                             0xbf, 0x58, 0xe5, 0xb7, 0x95, 0x21, 0x92, 0x5c,
                             0x9c, 0xc4, 0x2e, 0x9f, 0x6f, 0x46, 0x4b, 0x08,
                             0x8c, 0xc5, 0x72, 0xaf, 0x53, 0xe6, 0xd7, 0x88,
                             0x02 };

static const SECKEYPQGParams default_pqg_params = {
    NULL,
    { (SECItemType)0, (unsigned char *)P, sizeof(P) },
    { (SECItemType)0, (unsigned char *)Q, sizeof(Q) },
    { (SECItemType)0, (unsigned char *)G, sizeof(G) }
};

NS_IMPL_ISUPPORTS1(KeyService, nsIKeyService)

nsresult
KeyService::Init()
{
    // Bring up psm
    nsCOMPtr<nsISupports> nss = do_GetService("@mozilla.org/psm;1");
    SECStatus sv;
    mSlot = PK11_GetInternalKeySlot();
    
    if (PK11_NeedUserInit(mSlot)) {
        NS_ConvertUTF8toUTF16 tokenName(PK11_GetTokenName(mSlot));
        
        nsCOMPtr<nsITokenPasswordDialogs> dialogs;
        dialogs = do_GetService(NS_TOKENPASSWORDSDIALOG_CONTRACTID);
        if (!dialogs)
            return NS_ERROR_FAILURE;
        
        PRBool cancelled;
        nsresult rv = dialogs->SetPassword(nsnull, tokenName.get(), &cancelled);
        NS_ENSURE_SUCCESS(rv, rv);
        
        if (cancelled)
            return NS_ERROR_FAILURE;
    }
    
    if (PK11_NeedLogin(mSlot)) {
        sv = PK11_Authenticate(mSlot, PR_TRUE, NULL);
        if (sv != SECSuccess)
            return NS_ERROR_FAILURE;
    }
    
    return NS_OK;
}

KeyService::~KeyService()
{
    PK11_FreeSlot(mSlot);
}

/* void changePassword (); */
NS_IMETHODIMP
KeyService::ChangePassword()
{
    NS_ConvertUTF8toUTF16 tokenName(PK11_GetTokenName(mSlot));
    
    nsCOMPtr<nsITokenPasswordDialogs> dialogs;
    dialogs = do_GetService(NS_TOKENPASSWORDSDIALOG_CONTRACTID);
    if (!dialogs)
        return NS_ERROR_FAILURE;
    
    PRBool cancelled;
    return dialogs->SetPassword(nsnull, tokenName.get(), &cancelled);
}

/* nsISimpleEnumerator enumerateKeys (); */
NS_IMETHODIMP
KeyService::EnumerateKeys(nsISimpleEnumerator **_retval)
{
    SECKEYPrivateKeyList *list;
    SECKEYPrivateKeyListNode *node;

    nsCOMArray<nsIKeyPair> keys;
    
    // Retrieve all the private keys
    list = PK11_ListPrivKeysInSlot(mSlot, NULL, NULL);
    if (!list)
        return NS_NewArrayEnumerator(_retval, keys);
    
    // Walk the list
    for (node = PRIVKEY_LIST_HEAD(list); !PRIVKEY_LIST_END(node,list);
         node = PRIVKEY_LIST_NEXT(node)) {
        KeyPair *key = new KeyPair(node->key);
        keys.AppendObject(key);
    }
    
    SECKEY_DestroyPrivateKeyList(list);

    return NS_NewArrayEnumerator(_retval, keys);
}

/* nsIKeyPair createKeyPair(in PRUint32 aKeyType); */
NS_IMETHODIMP
KeyService::CreateKeyPair(PRUint32 aKeyType, nsIKeyPair **_retval)
{
    PK11RSAGenParams rsaparams;
    CK_MECHANISM_TYPE mechanism;
    void *params;

    // Initialize parameters based on key type
    switch (aKeyType) {
    case nsIKeyPair::KEYTYPE_RSA:
        rsaparams.keySizeInBits = 1024;
        rsaparams.pe = 0x010001;
        mechanism = CKM_RSA_PKCS_KEY_PAIR_GEN;
        params = &rsaparams;
        break;
    case nsIKeyPair::KEYTYPE_DSA:
        // Right now DSA can't be handled correctly
        return NS_ERROR_INVALID_ARG;
        mechanism = CKM_DSA_KEY_PAIR_GEN;
        params = (void *)&default_pqg_params;
        break;
    default:
        return NS_ERROR_INVALID_ARG;
    }
    
    // Create the key
    SECKEYPublicKey *pubKey;
    SECKEYPrivateKey *privKey;
    privKey = PK11_GenerateKeyPair(mSlot, mechanism, params, &pubKey, PR_TRUE, PR_TRUE, NULL);
    if (!privKey)
        return NS_ERROR_FAILURE;
    SECKEY_DestroyPublicKey(pubKey);

    // Pass on to a KeyPair
    KeyPair *key = new KeyPair(privKey);
    SECKEY_DestroyPrivateKey(privKey);
    if (!key)
        return NS_ERROR_OUT_OF_MEMORY;
    NS_ADDREF(*_retval = key);

    return NS_OK;
}
