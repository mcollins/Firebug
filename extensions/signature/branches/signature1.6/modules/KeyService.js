/* This file only copyright IBM 2010, John J. Barton; released under BSD license */


const Cc = Components.classes;
const Ci = Components.interfaces;

var EXPORTED_SYMBOLS = ["KeyPair", "KeyService"];

// A light wrapper around Dave Townsend's nsIKeyService.idl

function KeyPair(nsIKeyPair, name)
{
    if (nsIKeyPair instanceof Ci.nsIKeyPair)
    {
        this.nsIKeyPair = nsIKeyPair;
        if (name)
        {
            if(nsIKeyPair.name.length < 1)
                nsIKeyPair.name = name;
            else // name given but one existed should not happen
                throw new Error("KeyPair Rename not allowed");
        }
        else if (nsIKeyPair.name.length < 1)
        {
            nsIKeyPair.delete();
        }

        // else was named
    }
    else
        throw new Error("KeyPair must be created with an instance of Ci.nsIKeyPair;")
}

KeyPair.prototype =
{
    getName: function()
    {
        try
        {
            return this.nsIKeyPair.name;
        }
        catch(exc)
        {
            // We get here if nsIKeyPair was not initialized?
        }
        return "";
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
    createKeyPair: function(name)
    {
        if (typeof(this._keyService) == "undefined")
            this._keyService = getKeyService();

        return new KeyPair(this._keyService.createKeyPair(Ci.nsIKeyPair.KEYTYPE_RSA), name);
    },

    deleteKeyPair: function(name)
    {
        return KeyService.eachKeyPair(function deleteOne(keyPair)
        {
            if (keyPair.getName() === name)
            {
                keyPair.nsIKeyPair.delete();  // we are all friends here
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
