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
 * The Original Code is Mozilla Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Fabian Jakobs <fabian AT ajax DOT org>
 *      Kevin Dangoor (kdangoor@mozilla.com)
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


define(function(require, exports, module) {

exports.launch = function(env) {
    var event = require("pilot/event");
    var Editor = require("ace/editor").Editor;
    var Renderer = require("ace/virtual_renderer").VirtualRenderer;
    var theme = require("ace/theme/textmate");
    var JavaScriptMode = require("ace/mode/javascript").Mode;
    var vim = require("ace/keyboard/keybinding/vim").Vim;
    var emacs = require("ace/keyboard/keybinding/emacs").Emacs;
    var HashHandler = require("ace/keyboard/hash_handler").HashHandler;

    var container = document.getElementById("fbAceEditor");
    container.fbAceEditorEnv = env;
    env.editor = new Editor(new Renderer(container, theme));

    var modes = {
        javascript: new JavaScriptMode()
    };

    function getMode() {
        return modes.javascript;
    }

    function setMode() {
        env.editor.getSession().setMode(modes.javascript);
    }
    setMode();

    function setTheme() {
        env.editor.setTheme("ace/theme/textmate");
    }
    setTheme();

    function setSelectionStyle() {
        env.editor.setSelectionStyle("line");
    }
    setSelectionStyle();

    function setHighlightActiveLine() {
        env.editor.setHighlightActiveLine(true);
    }
    setHighlightActiveLine();

    function setShowInvisibles() {
        env.editor.setShowInvisibles(false);
    }
    setShowInvisibles();

    // for debugging
    window.jump = function() {
        var jump = document.getElementById("jump");
        var cursor = env.editor.getCursorPosition();
        var pos = env.editor.renderer.textToScreenCoordinates(cursor.row, cursor.column);
        jump.style.left = pos.pageX + "px";
        jump.style.top = pos.pageY + "px";
        jump.style.display = "block";
    };

    function onResize() {
        container.style.width = document.documentElement.clientWidth + "px";
        container.style.height = document.documentElement.clientHeight + "px";
        env.editor.resize();
    }

    window.onresize = onResize;
    onResize();

    event.addListener(container, "dragover", function(e) {
        return event.preventDefault(e);
    });

    event.addListener(container, "drop", function(e) {
        return event.preventDefault(e);
    });
};

});
