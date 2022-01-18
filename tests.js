function printAllTests(){
    return getAllTests();
}

function getAllTests(){
    var result = [];
    var files = DriveApp.getFoldersByName("G2HTML_TESTS").next().getFiles();
    while (files.hasNext()) {
        var file = files.next();
        var name = file.getName();
        if (name.indexOf(".txt") === -1 && name.indexOf(".json") === -1) {
            result.push(name);
        }
    }
    return result.sort();
}

function allTests() {
    var result = "";
    var tests = getAllTests();
    for (var i in tests) {
        var name = tests[i];
        console.time(name);
        result += doTest(name);
        console.timeEnd(name);
    }
    return result;
}

function doTest(fileName) {
    var files = DriveApp.getFilesByName(fileName);
    var resultFiles = DriveApp.getFilesByName(fileName + "_result.txt")
    if (files.hasNext()) {
        var file = files.next();
        var id = file.getId();
        var doc = DocumentApp.openById(id);
        MODE = "test";
        var result = processDocument(doc, DEFAULT_SETTINGS);
        var html = result.html;
        var jsonFiles = DriveApp.getFoldersByName("G2HTML_TESTS").next().getFilesByName(fileName + "_dump.json");
        if (jsonFiles.hasNext()) {
            var jsonFile = jsonFiles.next();
            jsonFile.setTrashed(true);
        }
        DriveApp.getFoldersByName("G2HTML_TESTS").next().createFile(fileName + "_dump.json", result.json);
        MODE = "release";
        if (resultFiles.hasNext()) {
            var compare = resultFiles.next().getBlob().getDataAsString();
            var message;
            if (compare === html) {
                message = "✅ " + fileName + "\n";
                console.log(message);
                return message;
            } else {
                message = "❌ "+fileName +"\n";
                console.log(message);
                return message;
            }
        } else {
            DriveApp.getFoldersByName("G2HTML_TESTS").next().createFile(fileName + "_result.txt", html);
            return "🛠"+fileName+": DRY RUN\r\n"
        }
    }
}

function defaultTest(){
    var files = DriveApp.getFilesByName("Custom Styles - test");
    if (files.hasNext()) {
        var id = files.next().getId();
        var doc = DocumentApp.openById(id);
        var settings = loadSettings();
        var html = processDocument(doc, settings).html;
        return "Default run finished";
    } else {
        return "Default test not found!";
    }
}