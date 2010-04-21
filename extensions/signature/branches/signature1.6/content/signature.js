// Tests for StorageService module
Components.utils.import("resource://signature/KeyService.js");

function runTest() {
    FBTest.progress("Testing KeyService");

    var name = "testSignatureOnly";

    var testKey = KeyService.createKeyPair(name);

    FBTrace.sysout("testKey ", testKey);
    FBTest.compare(name, testKey.getName(), "The new key's name must be correct");

    var foundMine = KeyService.eachKeyPair(function findMine(keyPair)
    {
        if (keyPair.getName() === name)
            return true;
        else
            FBTest.sysout("Testing KeyService found another key "+keyPair.getName());
    });

    FBTest.compare(true, foundMine, "The key must be found by enumeration");

    var pub = testKey.exportPublicKey();
    FBTest.ok(pub.length, "The key must not be zero length "+pub);

    var data = "This is important information";
    var sig = testKey.getSignature(data);

    FBTest.ok(sig.length, "The signature must not be zero length "+sig);

    var valid = testKey.isSignedValid(data, sig);

    FBTest.ok(valid, "The signature must be valid");

    data += "tamper";

    var invalid = testKey.isSignedValid(data, sig);

    FBTest.ok(!invalid, "The signature must be invalid");

    KeyService.deleteKeyPair(name);

    foundMine = KeyService.eachKeyPair(function findMine(keyPair)
    {
        if (keyPair.getName() === name)
            return true;
        else
            FBTest.sysout("Testing KeyService found another key "+keyPair.getName());
    });

    FBTest.compare(false, foundMine, "The deleted key must not be found by enumeration");
    FBTest.testDone();

}

