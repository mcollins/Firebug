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

  // TODO : Tokens per line and indent testing
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
  
  FBTest.testDone();
}