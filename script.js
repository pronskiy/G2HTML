//Global storage for messages
var messages = [];
var progress = 0;
var total = 0;

function calculateTotal(item) {
    if (!item.getNumChildren) {
        return 0;
    }
    var current = 0;
    var numChildren = item.getNumChildren();
    for (var i = 0; i < numChildren; i++) {
        current++;
        var child = item.getChild(i);
        if (child !== null && child.getNumChildren) {
            current += calculateTotal(child);
        }
    }
    return current;
}

function onInstall(e) {
    onOpen(e);
}

function onOpen(e) {
    DocumentApp.getUi().createAddonMenu()
        .addItem('Convert', 'showDefaultSettings')
        .addToUi();
    saveSettings(DEFAULT_SETTINGS);
}

function showDefaultSettings() {
    var settings = loadSettings();
    showSettings(settings);
}

function showSettings(options) {
    var settings = renderSettings(options);
    var main = renderMain("G2HTML v."+VERSION, settings, options);
    DocumentApp.getUi().showSidebar(main);
}

function renderSettings(options){
    var settings = HtmlService.createTemplateFromFile('ui/settings.html');
    settings.options = options;
    return settings.evaluate().getContent();
}

function renderMain(title, content, options){
    var main = HtmlService.createTemplateFromFile("ui/app.html");
    main.rendered = content;
    main.options = options;
    return main.evaluate().setTitle(title)
}

function renderResults(messages, options, clipboardContent) {
    var template = HtmlService.createTemplateFromFile('ui/results.html');
    template.errors = messages;
    template.options = options;
    template.clipboardContent = clipboardContent;
    return template.evaluate().getContent();
}