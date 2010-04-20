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
#include "keyhi.h"

nsresult
GetHashAlgorithm(PRUint32 aKeyType, PRUint32 aHashType, SECOidTag *alg)
{
    switch (aKeyType)
    {
    case nsIKeyPair::KEYTYPE_RSA:
        switch (aHashType)
        {
        case nsIKeyPair::HASHTYPE_MD2:
            *alg = SEC_OID_PKCS1_MD2_WITH_RSA_ENCRYPTION;
            break;
        case nsIKeyPair::HASHTYPE_MD5:
            *alg = SEC_OID_PKCS1_MD5_WITH_RSA_ENCRYPTION;
            break;
        case nsIKeyPair::HASHTYPE_SHA1:
            *alg = SEC_OID_PKCS1_SHA1_WITH_RSA_ENCRYPTION;
            break;
        case nsIKeyPair::HASHTYPE_SHA256:
            *alg = SEC_OID_PKCS1_SHA256_WITH_RSA_ENCRYPTION;
            break;
        case nsIKeyPair::HASHTYPE_SHA384:
            *alg = SEC_OID_PKCS1_SHA384_WITH_RSA_ENCRYPTION;
            break;
        case nsIKeyPair::HASHTYPE_SHA512:
            *alg = SEC_OID_PKCS1_SHA512_WITH_RSA_ENCRYPTION;
            break;
        default:
            return NS_ERROR_INVALID_ARG;
        }
        break;
    case nsIKeyPair::KEYTYPE_DSA:
        if (aHashType == nsIKeyPair::HASHTYPE_SHA1)
            *alg = SEC_OID_ANSIX9_DSA_SIGNATURE_WITH_SHA1_DIGEST;
        else
            return NS_ERROR_INVALID_ARG;
        break;
    default:
        return NS_ERROR_FAILURE;
    }
    return NS_OK;
}

