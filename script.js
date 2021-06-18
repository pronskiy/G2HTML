//Global storage for messages
var messages = [];

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
    if (settings[OptionKeys.OPEN_SETTINGS_ON_START]){
        showSettings(settings);
    }else{
        var loading = renderMain(PLUGIN_NAME+" v."+VERSION, "", settings, true);
        DocumentApp.getUi().showSidebar(loading);
    }
}

function showSettings(options) {
    var settings = renderSettings(options);
    var main = renderMain(PLUGIN_NAME+" v."+VERSION, settings, options, false);
    DocumentApp.getUi().showSidebar(main);
}

function renderSettings(options){
    var settings = HtmlService.createTemplateFromFile('ui/settings.html');
    settings.options = options;
    return settings.evaluate().getContent();
}

function renderMain(title, content, options, loading){
    var main = HtmlService.createTemplateFromFile("ui/app.html");
    main.rendered = content;
    main.options = options;
    main.loading = loading;
    return main.evaluate().setTitle(title)
}

function renderResults(messages, options, clipboardContent) {
    var template = HtmlService.createTemplateFromFile('ui/results.html');
    template.errors = messages;
    template.options = options;
    template.clipboardContent = clipboardContent;
    return template.evaluate().getContent();
}