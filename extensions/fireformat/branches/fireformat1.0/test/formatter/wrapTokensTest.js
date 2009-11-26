function runTest() {
  var Fireformat = FW.Fireformat,
      pref;
  
  var prefMock = {
      getPref: function(name) {
        if (pref.hasOwnProperty(name)) {
          return pref[name];
        } else {
          FBTest.ok(false, "Attempted to lookup unexpected property: " + name);
        }
      }
  };

  tokens = [ "aaaa", "bbbb", "cccc", "dddd" ];

  pref = { wrapSize: 11, indentChar: "e", indentCount: 2 };
  FBTest.compare("aaaafbbbbfcccc\needddd", Fireformat.wrapTokens(prefMock, tokens, "f", 0, 1), "One wrap");
  FBTest.compare("aaaaffffbbbb\neeccccffffdddd", Fireformat.wrapTokens(prefMock, tokens, "ffff", 0, 1), "Large padding");
  FBTest.compare("aaaafbbbb\neeeeccccfdddd", Fireformat.wrapTokens(prefMock, tokens, "f", 2, 2), "Tokens per line");

  pref = { wrapSize: 3, indentChar: "e", indentCount: 2 };
  FBTest.compare("aaaa\neebbbb\neecccc\needddd", Fireformat.wrapTokens(prefMock, tokens, "f", 0, 1), "All wrap");

  pref = { wrapSize: 80, indentChar: "e", indentCount: 2 };
  FBTest.compare("aaaafbbbbfccccfdddd", Fireformat.wrapTokens(prefMock, tokens, "f", 0, 1), "No wrap");
  
  FBTest.compare("aaaa\neebbbb\neecccc\needddd", Fireformat.wrapTokens(prefMock, tokens, "f", 0, 1, 79), "Offset wrap");

  pref = { wrapSize: 6, indentChar: "e", indentCount: 2 };
  FBTest.compare("aaaafbbbb\neecccc\needddd", Fireformat.wrapTokens(prefMock, tokens, "f", 0, 1), "Stacking");

  FBTest.compare("", Fireformat.wrapTokens(prefMock, [], "f", 0, 1), "Empty String");

  // Unique joins
  tokens = [
    { value: "aaaa", join: "g" },
    { value: "bbbb", join: "hhhh" },
    "cccc",
    { value: "dddd", join: "i" }
  ];
  pref = { wrapSize: 11, indentChar: "e", indentCount: 2 };
  FBTest.compare("aaaagbbbb\neeccccxdddd", Fireformat.wrapTokens(prefMock, tokens, "x", 0, 1), "Unique join");

  tokens = [
    { value: "aaaa", join: "g" },
    { value: "bbbb", join: "hhhh" },
    "cccc",
    { value: "dddd", join: "i" }
  ];
  pref = { wrapSize: 17, indentChar: "e", indentCount: 2 };
  FBTest.compare("aaaagbbbbhhhhcccc\needddd", Fireformat.wrapTokens(prefMock, tokens, "xxxx", 0, 1), "Unique join length");

  tokens = [
    { value: "aaaa", join: "" },
    { value: "bbbb", join: "hhhh" },
    "cccc",
    { value: "dddd", join: "i" }
  ];
  pref = { wrapSize: 11, indentChar: "e", indentCount: 2 };
  FBTest.compare("aaaabbbb\neeccccxdddd", Fireformat.wrapTokens(prefMock, tokens, "x", 0, 1), "Zero Length Join");

  FBTest.testDone();
}