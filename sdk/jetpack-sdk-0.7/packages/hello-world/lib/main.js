exports.main = function(options, callbacks) {

    var contextMenu = require("context-menu");

    var editImageItem = contextMenu.Item({
        label: "Edit image with Picnik",
        onClick: function (context) {
            require("tab-browser").Tabs.add('http://www.picnik.com/?import=' + escape(context.node.src), true);
        },
        context: 'img'
    });

    contextMenu.add(editImageItem);

}
