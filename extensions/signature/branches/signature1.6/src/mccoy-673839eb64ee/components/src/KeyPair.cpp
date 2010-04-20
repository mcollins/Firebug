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

#include "prmem.h"
#include "plbase64.h"
#include "KeyPair.h"
#include "nssb64.h"
#include "base64.h"
#include "pk11pub.h"
#include "keyhi.h"
#include "secder.h"
#include "cryptohi.h"
#include "nsStringAPI.h"
#include "KeyUtils.h"

NS_IMPL_ISUPPORTS1(KeyPair, nsIKeyPair)

SEC_ASN1_MKSUB(SECOID_AlgorithmIDTemplate)

DERTemplate SECAlgorithmIDTemplate[] = {
    { DER_SEQUENCE,
      0, NULL, sizeof(SECAlgorithmID) },
    { DER_OBJECT_ID,
      offsetof(SECAlgorithmID,algorithm), },
    { DER_OPTIONAL | DER_ANY,
      offsetof(SECAlgorithmID,parameters), },
    { 0, }
};

DERTemplate CERTSignatureDataTemplate[] =
{
    { DER_SEQUENCE,
          0, NULL, sizeof(CERTSignedData) },
    { DER_INLINE,
          offsetof(CERTSignedData,signatureAlgorithm),
          SECAlgorithmIDTemplate, },
    { DER_BIT_STRING,
          offsetof(CERTSignedData,signature), },
    { 0, }
};

const SEC_ASN1Template CERT_SignatureDataTemplate[] =
{
    { SEC_ASN1_SEQUENCE,
          0, NULL, sizeof(CERTSignedData) },
    { SEC_ASN1_INLINE | SEC_ASN1_XTRN,
          offsetof(CERTSignedData,signatureAlgorithm),
          SEC_ASN1_SUB(SECOID_AlgorithmIDTemplate), },
    { SEC_ASN1_BIT_STRING,
          offsetof(CERTSignedData,signature), },
    { 0, }
};

KeyPair::KeyPair(SECKEYPrivateKey *aPrivateKey)
{
    mPrivateKey = SECKEY_CopyPrivateKey(aPrivateKey);
}

KeyPair::~KeyPair()
{
    if (mPrivateKey)
        SECKEY_DestroyPrivateKey(mPrivateKey);
}

SECKEYPublicKey*
KeyPair::GetPublicKey()
{
    return SECKEY_ConvertToPublicKey(mPrivateKey);
}

/* attribute ACString name; */
NS_IMETHODIMP
KeyPair::GetName(nsACString & aName)
{
    NS_ENSURE_TRUE(mPrivateKey, NS_ERROR_NOT_INITIALIZED);
    
    char* name = PK11_GetPrivateKeyNickname(mPrivateKey);
    if (!name)
        return NS_ERROR_FAILURE;
    
    aName.Assign(name);
    PORT_Free(name);
    
    return NS_OK;
}
NS_IMETHODIMP
KeyPair::SetName(const nsACString & aName)
{
    NS_ENSURE_TRUE(mPrivateKey, NS_ERROR_NOT_INITIALIZED);
    
    SECStatus rv = PK11_SetPrivateKeyNickname(mPrivateKey, PromiseFlatCString(aName).get());
    if (rv != SECSuccess)
        return NS_ERROR_FAILURE;
    return NS_OK;
}

/* readonly attribute PRUint32 type; */
NS_IMETHODIMP
KeyPair::GetType(PRUint32 *aType)
{
    NS_ENSURE_TRUE(mPrivateKey, NS_ERROR_NOT_INITIALIZED);
    
    *aType = (PRUint32)SECKEY_GetPrivateKeyType(mPrivateKey);
    return NS_OK;
}

/* ACString exportPublicKey (); */
NS_IMETHODIMP
KeyPair::ExportPublicKey(nsACString & _retval)
{
    NS_ENSURE_TRUE(mPrivateKey, NS_ERROR_NOT_INITIALIZED);
    
    SECKEYPublicKey *publicKey = GetPublicKey();
    
    if (!publicKey)
        return NS_ERROR_FAILURE;

    // DER Encode the public key
    SECItem *item = SECKEY_EncodeDERSubjectPublicKeyInfo(publicKey);
    SECKEY_DestroyPublicKey(publicKey);
    
    if (!item)
        return NS_ERROR_FAILURE;
    
    char *data = PL_Base64Encode((const char*)item->data, item->len, nsnull);
    SECITEM_FreeItem(item, PR_TRUE);
    
    if (!data)
        return NS_ERROR_FAILURE;
    
    _retval.Assign(data);
    PR_Free(data);
    
    return NS_OK;
}

/* ACString signData (in ACString aData, in PRUint32 aHashType); */
NS_IMETHODIMP
KeyPair::SignData(const nsACString & aData, PRUint32 aHashType, nsACString & _retval)
{
    NS_ENSURE_TRUE(mPrivateKey, NS_ERROR_NOT_INITIALIZED);
    
    // Get the algorithm tag we are using
    SECOidTag alg;
    nsresult rv = GetHashAlgorithm((PRUint32)SECKEY_GetPrivateKeyType(mPrivateKey), aHashType, &alg);
    NS_ENSURE_SUCCESS(rv, rv);
    
    SECItem signature;
    PORT_Memset(&signature, 0, sizeof(SECItem));

    CERTSignedData sd;
    PORT_Memset(&sd, 0, sizeof(CERTSignedData));

    // Sign the data
    SECStatus ss = SEC_SignData(&(sd.signature),
                                (unsigned char*)PromiseFlatCString(aData).get(),
                                aData.Length(), mPrivateKey, alg);
    if (ss != SECSuccess)
        return NS_ERROR_FAILURE;
    sd.signature.len = sd.signature.len << 3;

    PRArenaPool *arena;
    arena = PORT_NewArena(DER_DEFAULT_CHUNKSIZE);
    if (!arena)
        return NS_ERROR_OUT_OF_MEMORY;

    // Retrieve the algorithm ID
    ss = SECOID_SetAlgorithmID(arena, &sd.signatureAlgorithm, alg, 0);
    if (ss != SECSuccess) {
        SECITEM_FreeItem(&(sd.signature), PR_FALSE);
        PORT_FreeArena(arena, PR_FALSE);
        return NS_ERROR_FAILURE;
    }
    
    // Encode the final result
    SECItem result;
    ss = DER_Encode(arena, &result, CERTSignatureDataTemplate, &sd);
    SECITEM_FreeItem(&(sd.signature), PR_FALSE);
    if (ss != SECSuccess) {
        PORT_FreeArena(arena, PR_FALSE);
        return NS_ERROR_FAILURE;
    }

    char *data = PL_Base64Encode((const char*)result.data, result.len, nsnull);
    PORT_FreeArena(arena, PR_FALSE);
    
    if (!data)
        return NS_ERROR_FAILURE;
    
    _retval.Assign(data);
    PR_Free(data);
    
    return NS_OK;
}

/* boolean verifyData (in ACString aData, in ACString aSignature); */
NS_IMETHODIMP
KeyPair::VerifyData(const nsACString & aData, const nsACString & aSignature, PRBool *_retval)
{
    NS_ENSURE_TRUE(mPrivateKey, NS_ERROR_NOT_INITIALIZED);
    
    // Allocate an arena to handle the majority of the allocations
    PRArenaPool *arena;
    arena = PORT_NewArena(DER_DEFAULT_CHUNKSIZE);
    if (!arena)
        return NS_ERROR_OUT_OF_MEMORY;

    SECKEYPublicKey *publicKey = GetPublicKey();
    
    if (!publicKey) {
        PORT_FreeArena(arena, PR_FALSE);
        return NS_ERROR_FAILURE;
    }
    
    // Base 64 decode the signature
    SECItem signatureItem;
    PORT_Memset(&signatureItem, 0, sizeof(SECItem));
    if (!NSSBase64_DecodeBuffer(arena, &signatureItem,
                                PromiseFlatCString(aSignature).get(),
                                aSignature.Length())) {
        SECKEY_DestroyPublicKey(publicKey);
        PORT_FreeArena(arena, PR_FALSE);
        return NS_ERROR_FAILURE;
    }
    
    // Decode the signature and algorithm
    CERTSignedData sigData;
    PORT_Memset(&sigData, 0, sizeof(CERTSignedData));
    SECStatus ss = SEC_QuickDERDecodeItem(arena, &sigData, 
                                          CERT_SignatureDataTemplate,
                                          &signatureItem);
    if (ss != SECSuccess) {
        SECKEY_DestroyPublicKey(publicKey);
        PORT_FreeArena(arena, PR_FALSE);
        return NS_ERROR_FAILURE;
    }
    
    // Perform the final verification
    DER_ConvertBitString(&(sigData.signature));
    ss = VFY_VerifyDataWithAlgorithmID((const unsigned char*)PromiseFlatCString(aData).get(),
                                       aData.Length(), publicKey,
                                       &(sigData.signature),
                                       &(sigData.signatureAlgorithm),
                                       NULL, NULL);
    
    // Clean up remaining objects
    SECKEY_DestroyPublicKey(publicKey);
    PORT_FreeArena(arena, PR_FALSE);
    
    *_retval = (ss == SECSuccess);

    return NS_OK;
}

/* void delete (); */
NS_IMETHODIMP
KeyPair::Delete()
{
    NS_ENSURE_TRUE(mPrivateKey, NS_ERROR_NOT_INITIALIZED);
    
    SECStatus ss = PK11_DeleteTokenPrivateKey(mPrivateKey, PR_FALSE);
    if (ss != SECSuccess)
        return NS_ERROR_FAILURE;
    mPrivateKey = NULL;
    
    return NS_OK;
}
