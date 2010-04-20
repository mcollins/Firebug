/* This file only copyright IBM 2010, John J. Barton; released under BSD license */


const Cc = Components.classes;
const Ci = Components.interfaces;

var EXPORTED_SYMBOLS = ["KeyPair", "KeyService"];

// A light wrapper around Dave Townsend's nsIKeyService.idl

function KeyPair(nsIKeyPair)
{
    if (nsIKeyPair instanceof Ci.nsIKeyPair)
        this.nsIKeyPair = nsIKeyPair;
    else
        throw new Error("KeyPair must be created with an instance of Ci.nsIKeyPair;")
}

KeyPair.prototype =
{
    getName: function()
    {
        return this.nsIKeyPair.name;
    },

    exportPublicKey: function()
    {
        return this.nsIKeyPair.exportPublicKey();
    },

    getSignature: function(data)
    {
        // Only the SHA* are valid, and the only other logical choice is SHA256
        return this.nsIKeyPair.signData(data, Ci.nsIKeyPair.HASHTYPE_SHA1)
    },

    isSignedValid: function(data, signature)
    {
        return this.nsIKeyPair.verifyData(data, signature);
    },

};

var KeyService =
{
    eachKeyPair: function(fnTakesKeyPair)
    {
        if (typeof(this._keyService) == "undefined")
            this._keyService = getKeyService();

        var enumerateKeys = this._keyService.enumerateKeys();
        while(enumerateKeys.hasMoreElements())
        {
            var rc = fnTakesKeyPair(new KeyPair(enumerateKeys.getNext()));
            if (rc)
                return rc;
        }
    },

    // Only RSA pairs are supported by mccoy
    createKeyPair: function()
    {
        if (typeof(this._keyService) == "undefined")
            this._keyService = getKeyService();

        return new KeyPair(this._keyService.createKeyPair(Ci.nsIKeyPair.KEYTYPE_RSA));
    },

    deleteKeyPair: function(name)
    {
        return KeyService.eachKeyPair(function deleteOne(keyPair)
        {
            if (keyPair.name === name)
            {
                keyPair.nsIKeyPair.delete();
                return true;
            }
        });
    },
};

function getKeyService()
{
    try
    {
        ERROR("Tyring to get serfvice");
        var ksc = Cc["@toolkit.mozilla.org/keyservice;1"];
        ERROR("got ksc "+ksc);
        ERROR("nsiKeyService: "+Ci.nsIKeyService);

        var srv =  ksc.getService(Ci.nsIKeyService);
        ERROR("got svc "+srv);
        return srv;
    }
    catch(exc)
    {
        ERROR("getKeyService FAILS: "+exc);
    }
}

function ERROR(text)
{
    if (typeof(consoleService) === 'undefined')
    {
        const ConsoleService = Cc["@mozilla.org/consoleservice;1"];
        consoleService = ConsoleService.getService(Ci.nsIConsoleService);
    }

    consoleService.logStringMessage(text + "");
}
